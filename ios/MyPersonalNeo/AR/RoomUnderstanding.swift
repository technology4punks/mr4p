import ARKit
import RealityKit
import UIKit
import CoreImage
import ImageIO
import Combine

@MainActor
final class RoomUnderstanding: NSObject, ARSessionDelegate {
    let view = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)
    let rig = HumanoidRig()
    let world = AnchorEntity(world: .zero)
    var revealControls: (() -> Void)?
    var followUser = true
    private(set) var performance=ScenePerformance()
    private var animationElapsed: Float=0
    private(set) var sensing = RoomScanPolicy()
    private(set) var cameraCadence = CaptureCadence()
    private(set) var cameraTargetFPS = 30
    private(set) var longestUpdateMS: Double = 0
    private(set) var spatialEpoch = UUID()
    private var startID = UUID()
    private var measuredPlanes: [UUID:ScenePlaneSnapshot] = [:]
    private var lastMeasuredAt: Double = 0
    private var planeTimes: [UUID:Double] = [:]
    private var captureInFlight = false
    private let imageContext = CIContext(options: [.cacheIntermediates:false])
    var cameraAge: Double { cameraCadence.latestTimestamp.map { max(0, ProcessInfo.processInfo.systemUptime - $0) } ?? 0 }
    var sensingLabel: String {
        switch sensing.phase {
        case .paused: return "Sospesa"
        case .scanning: return "Acquisizione iniziale · 6 s"
        case .exploring: return "Esplorazione · nessuna scansione continua"
        case .measuring: return "Misura su richiesta · massimo 1 s"
        }
    }
    private var attention: SIMD3<Float>?
    private var attentionUntil=Date.distantPast
    private var destination: SIMD3<Float>?
    private var lastGeometryCheck = Date.distantPast
    private var checkedPosition: SIMD3<Float>?
    private var lastFollow = Date.distantPast
    var changed: (() -> Void)?
    var tap: ((SIMD3<Float>) -> Void)?
    private(set) var trackingNormal = false
    private(set) var status = "Fotocamera spenta"
    private(set) var supportsLiDAR = false
    private(set) var meshCount = 0
    private(set) var planeCount = 0
    private var update: Cancellable?
    private var running = false
    private var placed = false
    private var lastReport = ""
    var tick: ((Float) -> Void)?
    override init() {
        super.init()
        view.session.delegate = self
        view.session.delegateQueue = .main
        world.addChild(rig.root); rig.root.isEnabled = false; view.scene.addAnchor(world)
        let recall = UITapGestureRecognizer(target:self,action:#selector(recallControls))
        recall.numberOfTouchesRequired = 2; recall.numberOfTapsRequired = 2
        let tap = UITapGestureRecognizer(target:self,action:#selector(tapped(_:)))
        tap.require(toFail:recall); view.addGestureRecognizer(recall); view.addGestureRecognizer(tap)
        update = view.scene.subscribe(to: SceneEvents.Update.self) { [weak self] event in
            MainActor.assumeIsolated {
                guard let self, self.running else { return }
                let began = ProcessInfo.processInfo.systemUptime
                if self.sensing.advance(now:began) { self.applyConfiguration() }
                if self.performance.observe(event.deltaTime) { self.changed?() }
                self.animationElapsed += Float(event.deltaTime)
                if self.animationElapsed >= Float(1/self.performance.animationHz) {
                    let delta=min(0.05,self.animationElapsed); self.animationElapsed=0
                    if self.trackingNormal { self.updateMotion(delta); self.tick?(delta) }
                    // Tracking limits world interaction, never the relaxed pose, breathing or gestures.
                    self.rig.update(delta:delta,spatialTracking:self.trackingNormal)
                }
                self.longestUpdateMS=max(self.longestUpdateMS,(ProcessInfo.processInfo.systemUptime-began)*1000)
            }
        }
    }
    func start(profile: AvatarProfile = .woman) async throws {
        guard ARWorldTrackingConfiguration.isSupported else { throw NeoFailure("ARKit richiede un iPhone compatibile; il simulatore non vede la stanza.") }
        let id=UUID(); startID=id
        // Finish import before starting camera capture; do not block the camera on a synchronous asset load.
        if !rig.isLoaded || rig.profile != profile { try await rig.loadAsync(profile) }
        try Task.checkCancellation()
        guard startID == id, UIApplication.shared.applicationState != .background else { throw CancellationError() }
        supportsLiDAR=ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        measuredPlanes.removeAll(); planeTimes.removeAll(); planeCount=0; meshCount=0; placed=false; rig.root.isEnabled=false
        spatialEpoch=UUID(); lastMeasuredAt=0; trackingNormal=false
        performance=ScenePerformance(); cameraCadence.reset(); longestUpdateMS=0; animationElapsed=0
        view.renderOptions.formUnion([.disableMotionBlur,.disableDepthOfField,.disableCameraGrain,.disablePersonOcclusion,.disableGroundingShadows])
        view.environment.sceneUnderstanding.options=[]
        sensing.start(now:ProcessInfo.processInfo.systemUptime); running=true
        applyConfiguration(reset:true)
    }
    func rescan() {
        guard running, !captureInFlight else { return }
        stopWalking(); sensing.rescan(now:ProcessInfo.processInfo.systemUptime); applyConfiguration()
    }
    private func applyConfiguration(reset: Bool = false) {
        guard running else { return }
        let config=ARWorldTrackingConfiguration()
        config.planeDetection = sensing.needsPlanes ? [.horizontal,.vertical] : []
        config.environmentTexturing = .none
        // Select a modest 30 Hz camera stream. Scene cadence is measured separately.
        let formats=ARWorldTrackingConfiguration.supportedVideoFormats
        if let format=formats.filter({$0.framesPerSecond == 30}).min(by: {
            $0.imageResolution.width*$0.imageResolution.height < $1.imageResolution.width*$1.imageResolution.height
        }) {
            config.videoFormat=format; cameraTargetFPS=format.framesPerSecond
        } else { cameraTargetFPS=config.videoFormat.framesPerSecond }
        if supportsLiDAR, sensing.needsDepth { config.frameSemantics.insert(.sceneDepth) }
        // No mesh reconstruction, collision cooking or generated occluders in the interactive path.
        config.sceneReconstruction = .none
        view.session.run(config,options:reset ? [.resetTracking,.removeExistingAnchors] : [])
        status=sensingLabel; changed?()
    }

    func stop() {
        startID=UUID(); spatialEpoch=UUID(); stopWalking(); running=false; sensing.stop()
        view.session.pause(); trackingNormal=false; rig.stop(stand:false)
        status="Sessione sospesa · riprendi per riallineare"; changed?()
    }
    func place(at position: SIMD3<Float>) {
        guard trackingNormal else { return }
        stopWalking(); rig.stop(); rig.root.position = position
        if let frame = view.session.currentFrame {
            let camera = SIMD3<Float>(frame.camera.transform.columns.3.x,position.y,frame.camera.transform.columns.3.z)
            let direction = camera-position
            if simd_length(direction) > 0.05 { rig.root.orientation = simd_quatf(from: [0,0,1], to: simd_normalize(direction)) }
        }
        rig.root.isEnabled = true; placed = true
    }
    @objc private func recallControls() { revealControls?() }
    func stopWalking() { destination = nil; rig.walkAmount = 0; checkedPosition=nil }
    func lookToward(_ point: SIMD3<Float>) {
        stopWalking();followUser=false;attention=point;attentionUntil=Date().addingTimeInterval(5)
    }
    func walkNear(_ object: SIMD3<Float>) throws {
        guard trackingNormal, placed, !rig.seated, ProcessInfo.processInfo.systemUptime-lastMeasuredAt<20 else { throw NeoFailure("Serve un avatar in piedi su pavimento misurato.") }
        let offset = rig.root.position - SIMD3<Float>(object.x,rig.root.position.y,object.z)
        guard simd_length(offset) > 0.75 else { return }
        destination = SIMD3<Float>(object.x,rig.root.position.y,object.z) + simd_normalize(offset)*0.75
        guard simd_distance(rig.root.position,destination!) <= 3 else { destination=nil; throw NeoFailure("L’oggetto è troppo lontano: inquadra una zona più vicina e scansiona il pavimento.") }
        followUser = false
    }
    private func floor(at p: SIMD3<Float>) -> SIMD3<Float>? {
        measuredPlanes.values.lazy.filter { $0.isHorizontal && ProcessInfo.processInfo.systemUptime-(planeTimes[$0.id] ?? 0)<20 }.compactMap {
            $0.intersection(origin:p+[0,0.3,0],direction:[0,-1,0],maxDistance:0.5)
        }.min { simd_distance($0,p)<simd_distance($1,p) }
    }
    private func blocked(from p: SIMD3<Float>, toward q: SIMD3<Float>) -> Bool {
        for plane in measuredPlanes.values {
            let local=simd_inverse(plane.transform)*SIMD4<Float>(q.x,q.y+0.75,q.z,1)
            let center=plane.transform*SIMD4<Float>(plane.center,1)
            let radius=AvatarMotion.radius
            if plane.isHorizontal {
                if center.y>p.y+0.15,center.y<p.y+1.65,abs(local.x-plane.center.x)<plane.extent.x/2+radius,abs(local.z-plane.center.z)<plane.extent.y/2+radius {return true}
            } else if abs(local.y-plane.center.y)<radius,abs(local.x-plane.center.x)<plane.extent.x/2+radius,abs(local.z-plane.center.z)<plane.extent.y/2+0.5 {return true}
        }
        return false
    }
    private func updateMotion(_ delta: Float) {
        guard let frame = view.session.currentFrame else { return }
        let c = frame.camera.transform.columns.3, camera = SIMD3<Float>(c.x,c.y,c.z)
        if !placed, tap == nil {
            let front = -SIMD3<Float>(frame.camera.transform.columns.2.x,0,frame.camera.transform.columns.2.z)
            if simd_length(front)>0.1 {
                let p = camera+simd_normalize(front)*1.3
                if let point=measuredPlanes.values.lazy.filter(\.isHorizontal).compactMap({$0.intersection(origin:p,direction:[0,-1,0],maxDistance:2.2)}).max(by:{$0.y<$1.y}), camera.y-point.y>0.8 {
                    place(at:point); rig.play("wave")
                }
            }
        }
        guard placed else { return }; let interest=Date()<attentionUntil ? attention : nil;rig.gaze=interest ?? camera
        // Coarse cached planes are not live obstacle sensing. Never translate on stale measurements.
        if rig.seated || tap != nil { stopWalking(); return }
        let geometryFresh=ProcessInfo.processInfo.systemUptime-lastMeasuredAt<20
        if !geometryFresh {stopWalking()}
        let p = rig.root.position, toCamera = SIMD3<Float>(camera.x-p.x,0,camera.z-p.z)
        if geometryFresh, destination == nil, followUser, simd_length(toCamera)>1.9, Date().timeIntervalSince(lastFollow)>1 {
            lastFollow=Date(); let direction=simd_normalize(toCamera), side=SIMD3<Float>(direction.z,0,-direction.x)
            destination = SIMD3<Float>(camera.x,p.y,camera.z)-direction*1.2+side*0.4
        }
        var facing = interest.map { SIMD3<Float>($0.x-p.x,0,$0.z-p.z) } ?? toCamera
        if let target=destination {
            if let candidate=AvatarMotion.step(from:p,to:target,delta:delta) {
                // Floor must be known at centre and both feet, not merely at the destination.
                // Reuse a sweep for at most 100 ms / 4 cm. The collision lookahead is
                // 25 cm, so this avoids 720 mesh/depth queries a second while staying
                // well inside the measured clearance. Any stop/tracking loss invalidates it.
                let cached = checkedPosition.map { simd_distance($0,candidate)<0.045 && Date().timeIntervalSince(lastGeometryCheck)<0.1 } ?? false
                var permitted=cached
                if !cached {
                    let side=SIMD3<Float>(0.15,0,0)
                    permitted = [-side,SIMD3<Float>.zero,side].allSatisfy { AvatarMotion.permitted(candidate:candidate+$0,measuredFloor:floor(at:candidate+$0),blocked:false) } && !blocked(from:p,toward:candidate)
                    if permitted { checkedPosition=candidate;lastGeometryCheck=Date() }
                }
                if permitted {
                    rig.root.position=candidate;rig.walkAmount=min(1,rig.walkAmount+delta*4);facing=target-p
                } else { stopWalking(); lastFollow=Date().addingTimeInterval(2) }
            } else { stopWalking() }
        } else { rig.walkAmount=max(0,rig.walkAmount-delta*5) }
        if simd_length(facing)>0.1 {
            let desired=simd_quatf(from:SIMD3<Float>(0,0,1),to:simd_normalize(facing))
            rig.root.orientation=simd_slerp(rig.root.orientation,desired,min(1,delta*3))
        }
    }
    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        guard trackingNormal else { status = "Tracking non stabile: attendi prima di selezionare."; changed?(); return }
        let point = gesture.location(in: view)
        guard let result = view.raycast(from: point, allowing: .existingPlaneGeometry, alignment: .horizontal).first else { status = "Nessuna superficie orizzontale misurata qui. Scansiona e riprova."; changed?(); return }
        let p = result.worldTransform.columns.3, position = SIMD3<Float>(p.x,p.y,p.z)
        if let tap { tap(position) } else { place(at: position) }
    }
    /// Only owned data crosses the network await. Never return an ARFrame or camera buffer.
    func capture() async throws -> (jpeg:Data,snapshot:PerceptionSnapshot,epoch:UUID,capturedAt:Double) {
        guard running, trackingNormal, !captureInFlight else { throw NeoFailure("Attendi tracking stabile e la fine dell’osservazione precedente.") }
        captureInFlight=true; let epoch=spatialEpoch
        defer {
            captureInFlight=false
            if running, spatialEpoch == epoch, sensing.phase == .measuring { sensing.endMeasurement(); applyConfiguration() }
        }
        let oldPhase=sensing.phase, after=view.session.currentFrame?.timestamp ?? 0
        sensing.measure(now:ProcessInfo.processInfo.systemUptime)
        if sensing.phase != oldPhase { applyConfiguration() }
        let deadline=ProcessInfo.processInfo.systemUptime+0.85
        while !captureReady(after:after), ProcessInfo.processInfo.systemUptime<deadline {
            try await Task.sleep(for:.milliseconds(35))
            guard running, trackingNormal, spatialEpoch == epoch else { throw CancellationError() }
        }
        try Task.checkCancellation()
        // Synchronous scope releases all ARKit objects BEFORE JPEG encoding/network await.
        let owned=try captureOwned()
        if sensing.phase == .measuring { sensing.endMeasurement(); applyConfiguration() }
        let jpeg=try await Task.detached(priority:.utility) { try CameraJPEG.encode(owned.image) }.value
        try Task.checkCancellation()
        guard running, spatialEpoch == epoch else {throw CancellationError()}
        return (jpeg,owned.snapshot,epoch,owned.timestamp)
    }
    private func captureReady(after timestamp:Double) -> Bool {
        guard let frame=view.session.currentFrame, frame.timestamp>timestamp else {return false}
        return !supportsLiDAR || frame.sceneDepth != nil
    }
    private func captureOwned() throws -> (image:CGImage,snapshot:PerceptionSnapshot,timestamp:Double) {
        try autoreleasepool {
            guard running, trackingNormal, let frame=view.session.currentFrame,
                  ProcessInfo.processInfo.systemUptime-frame.timestamp<0.6 else {throw NeoFailure("La camera non sta producendo fotogrammi recenti. Sospendi e riprendi l’esperienza.")}
            let orientation=view.window?.windowScene?.interfaceOrientation ?? .portrait
            let exif:CGImagePropertyOrientation
            switch orientation {case .landscapeLeft:exif = .up;case .landscapeRight:exif = .down;case .portraitUpsideDown:exif = .left;default:exif = .right}
            let input=CIImage(cvPixelBuffer:frame.capturedImage).oriented(exif)
            let factor=min(1,960/max(input.extent.width,input.extent.height))
            let scaled=input.transformed(by:CGAffineTransform(scaleX:factor,y:factor))
            // deferred:false materializes independent pixels, rather than a lazy reference to camera storage.
            guard let image=imageContext.createCGImage(scaled,from:scaled.extent,format:.RGBA8,colorSpace:CGColorSpaceCreateDeviceRGB(),deferred:false) else {throw NeoFailure("Fotogramma non disponibile.")}
            let snapshot=PerceptionSnapshot(frame:frame,orientation:orientation,planes:measuredPlanes.values.filter { ProcessInfo.processInfo.systemUptime-(planeTimes[$0.id] ?? 0)<20 })
            return (image,snapshot,frame.timestamp)
        }
    }
    nonisolated func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // delegateQueue is explicitly main. Process small values inline; do not enqueue a task per frame.
        MainActor.assumeIsolated {
            guard running else {return}
            let normal:Bool
            switch frame.camera.trackingState {case .normal:normal=true;default:normal=false}
            if trackingNormal && !normal {spatialEpoch=UUID();stopWalking();planeTimes.removeAll();lastMeasuredAt=0}
            trackingNormal=normal
            if cameraCadence.record(frame.timestamp) {changed?()}
            let message=normal ? sensingLabel : "Tracking limitato · interazioni spaziali sospese"
            if message != lastReport {status=message;lastReport=message;changed?()}
        }
    }
    nonisolated func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { cache(anchors) }
    nonisolated func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { cache(anchors) }
    nonisolated private func cache(_ anchors:[ARAnchor]) {
        MainActor.assumeIsolated {
            guard running, sensing.needsPlanes else {return}
            for anchor in anchors {
                guard let plane=anchor as? ARPlaneAnchor, measuredPlanes[plane.identifier] != nil || measuredPlanes.count<64 else {continue}
                measuredPlanes[plane.identifier]=ScenePlaneSnapshot(plane)
                lastMeasuredAt=ProcessInfo.processInfo.systemUptime; planeTimes[plane.identifier]=lastMeasuredAt
            }
            planeCount=measuredPlanes.count
        }
    }
    nonisolated func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        MainActor.assumeIsolated {
            guard running else {return}
            for anchor in anchors {measuredPlanes.removeValue(forKey:anchor.identifier);planeTimes.removeValue(forKey:anchor.identifier)}
            planeCount=measuredPlanes.count
        }
    }
    nonisolated func sessionWasInterrupted(_ session: ARSession) {
        MainActor.assumeIsolated {trackingNormal=false;spatialEpoch=UUID();stopWalking();status="Sessione AR interrotta · riprendi scansione";changed?()}
    }
    nonisolated func session(_ session: ARSession, didFailWithError error: Error) {
        MainActor.assumeIsolated {trackingNormal=false;spatialEpoch=UUID();stopWalking();status="Tracking non disponibile. Riprendi la scansione.";changed?()}
    }
}

private enum CameraJPEG {
    static func encode(_ image:CGImage) throws -> Data {
        let data=NSMutableData()
        guard let destination=CGImageDestinationCreateWithData(data,"public.jpeg" as CFString,1,nil) else {throw NeoFailure("Codifica immagine non disponibile.")}
        CGImageDestinationAddImage(destination,image,[kCGImageDestinationLossyCompressionQuality:0.62] as CFDictionary)
        guard CGImageDestinationFinalize(destination), data.length<550000 else {throw NeoFailure("Fotogramma troppo grande. Riprova.")}
        return data as Data
    }
}

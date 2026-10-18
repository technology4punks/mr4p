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
    private(set) var detailedMesh=false
    private var occluders: [UUID:ModelEntity]=[:]
    private var lastPlaneUpdate=Date.distantPast
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
    private var planes = Set<UUID>(), meshes = Set<UUID>()
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
                if self.performance.observe(event.deltaTime) {self.changed?()}
                guard self.trackingNormal else {return}
                self.animationElapsed += Float(event.deltaTime)
                guard self.animationElapsed >= Float(1/self.performance.animationHz) else {return}
                let delta=min(0.05,self.animationElapsed);self.animationElapsed=0
                self.updateMotion(delta);self.rig.update(delta:delta);self.tick?(delta)
            }
        }
    }
    func start(profile: AvatarProfile = .woman) throws {
        guard ARWorldTrackingConfiguration.isSupported else { throw NeoFailure("ARKit richiede un iPhone compatibile; il simulatore non vede la stanza.") }
        if !rig.isLoaded || rig.profile != profile { try rig.load(profile) }
        configure()
    }
    func setDetailedMesh(_ enabled: Bool) {
        detailedMesh=enabled && supportsLiDAR
        if running {stopWalking();configure()}
    }
    private func configure() {
        let config=ARWorldTrackingConfiguration();config.planeDetection=[.horizontal,.vertical]
        config.environmentTexturing = .none
        supportsLiDAR=ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        // Baseline: LiDAR depth + measured planes, no continuous mesh classification,
        // physics cooking, person segmentation, environment cubemap or post-processing.
        view.renderOptions.formUnion([.disableMotionBlur,.disableDepthOfField,.disableCameraGrain,.disablePersonOcclusion,.disableGroundingShadows])
        view.environment.sceneUnderstanding.options=[]
        if supportsLiDAR {config.frameSemantics.insert(.sceneDepth)}
        if detailedMesh && ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
            view.environment.sceneUnderstanding.options.insert(.occlusion)
        }
        occluders.values.forEach {$0.isEnabled = !detailedMesh}
        trackingNormal=false;performance=ScenePerformance();view.session.run(config);running=true;animationElapsed=0
        status="Scansiona lentamente il pavimento · modalità leggera";changed?()
    }

    func stop() { stopWalking(); view.session.pause(); running = false; trackingNormal = false; rig.stop(stand:false); status = "Scansione sospesa · riprendi per riallineare"; changed?() }
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
        guard trackingNormal, placed, !rig.seated else { throw NeoFailure("Serve un avatar in piedi su pavimento misurato.") }
        let offset = rig.root.position - SIMD3<Float>(object.x,rig.root.position.y,object.z)
        guard simd_length(offset) > 0.75 else { return }
        destination = SIMD3<Float>(object.x,rig.root.position.y,object.z) + simd_normalize(offset)*0.75
        guard simd_distance(rig.root.position,destination!) <= 3 else { destination=nil; throw NeoFailure("L’oggetto è troppo lontano: inquadra una zona più vicina e scansiona il pavimento.") }
        followUser = false
    }
    private func floor(at p: SIMD3<Float>) -> SIMD3<Float>? {
        let query = ARRaycastQuery(origin:p+[0,0.3,0],direction:[0,-1,0],allowing:.existingPlaneGeometry,alignment:.horizontal)
        guard let hit = view.session.raycast(query).first else { return nil }
        let v = hit.worldTransform.columns.3; return [v.x,v.y,v.z]
    }
    private func blocked(from p: SIMD3<Float>, toward q: SIMD3<Float>) -> Bool {
        // Measured coarse planes, no per-frame triangle-mesh physics casts.
        for anchor in view.session.currentFrame?.anchors ?? [] {
            guard let plane=anchor as? ARPlaneAnchor else {continue}
            let local=simd_inverse(plane.transform)*SIMD4<Float>(q.x,q.y+0.75,q.z,1)
            let center=plane.transform*SIMD4<Float>(plane.center.x,plane.center.y,plane.center.z,1)
            let radius=AvatarMotion.radius
            if plane.alignment == .horizontal {
                if center.y>p.y+0.15,center.y<p.y+1.65,abs(local.x-plane.center.x)<plane.extent.x/2+radius,abs(local.z-plane.center.z)<plane.extent.z/2+radius {return true}
            } else if abs(local.y-plane.center.y)<radius,abs(local.x-plane.center.x)<plane.extent.x/2+radius,abs(local.z-plane.center.z)<plane.extent.z/2+0.5 {return true}
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
                let query = ARRaycastQuery(origin:p,direction:[0,-1,0],allowing:.existingPlaneGeometry,alignment:.horizontal)
                if let hit=view.session.raycast(query).first {
                    let v=hit.worldTransform.columns.3
                    if camera.y-v.y > 0.8, camera.y-v.y < 2.2 { place(at:[v.x,v.y,v.z]); rig.play("wave") }
                }
            }
        }
        guard placed else { return }; let interest=Date()<attentionUntil ? attention : nil;rig.gaze=interest ?? camera
        if rig.seated || tap != nil { stopWalking(); return }
        let p = rig.root.position, toCamera = SIMD3<Float>(camera.x-p.x,0,camera.z-p.z)
        if destination == nil, followUser, simd_length(toCamera)>1.9, Date().timeIntervalSince(lastFollow)>1 {
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
    func capture() throws -> (jpeg: Data, frame: ARFrame, orientation: UIInterfaceOrientation) {
        guard running, trackingNormal, let frame = view.session.currentFrame else { throw NeoFailure("Attiva la scansione e attendi tracking stabile prima di osservare.") }
        let orientation = view.window?.windowScene?.interfaceOrientation ?? .portrait
        let exif: CGImagePropertyOrientation
        switch orientation { case .landscapeLeft: exif = .up; case .landscapeRight: exif = .down; case .portraitUpsideDown: exif = .left; default: exif = .right }
        let image = CIImage(cvPixelBuffer: frame.capturedImage).oriented(exif)
        guard let cg = CIContext().createCGImage(image, from: image.extent) else { throw NeoFailure("Fotogramma non disponibile.") }
        let input = UIImage(cgImage: cg), factor = min(1, 960 / max(input.size.width,input.size.height))
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let jpeg = UIGraphicsImageRenderer(size: CGSize(width: input.size.width*factor,height: input.size.height*factor), format: format).image { _ in input.draw(in: CGRect(origin: .zero,size: CGSize(width: input.size.width*factor,height: input.size.height*factor))) }.jpegData(compressionQuality: 0.62)
        guard let jpeg, jpeg.count < 550000 else { throw NeoFailure("Fotogramma troppo grande. Riprova.") }; return (jpeg, frame, orientation)
    }
    nonisolated func session(_ session: ARSession, didUpdate frame: ARFrame) {
        let normal: Bool
        switch frame.camera.trackingState { case .normal: normal = true; default: normal = false }
        Task { @MainActor [weak self] in
            guard let self, self.running else { return }; self.trackingNormal = normal
            if !normal { self.stopWalking() }
            let message = normal ? "Tracking stabile · tocca il pavimento per posizionare NEO" : "Tracking limitato · interazioni spaziali sospese"
            if message != self.lastReport { self.status = message; self.lastReport = message; self.changed?() }
        }
    }
    nonisolated func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { summarize(anchors, removed: false);updatePlanes(anchors) }
    nonisolated func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {updatePlanes(anchors)}
    nonisolated private func updatePlanes(_ anchors: [ARAnchor]) {
        let planes=anchors.compactMap {$0 as? ARPlaneAnchor}
        guard !planes.isEmpty else {return}
        Task { @MainActor [weak self] in
            guard let self,self.running,Date().timeIntervalSince(self.lastPlaneUpdate)>0.5 else {return}
            self.lastPlaneUpdate=Date()
            for plane in planes.prefix(24) {
                guard self.occluders[plane.identifier] != nil || self.occluders.count<24 else {continue}
                let w=max(0.01,plane.extent.x),d=max(0.01,plane.extent.z)
                let model=self.occluders[plane.identifier] ?? ModelEntity()
                model.model=ModelComponent(mesh:.generateBox(width:w,height:0.01,depth:d),materials:[OcclusionMaterial()])
                model.transform=Transform(matrix:plane.transform);model.position += model.orientation.act(plane.center)
                model.isEnabled = !self.detailedMesh
                if self.occluders[plane.identifier] == nil {self.world.addChild(model);self.occluders[plane.identifier]=model}
            }
        }
    }
    nonisolated func session(_ session: ARSession, didRemove anchors: [ARAnchor]) { summarize(anchors, removed: true) }
    nonisolated private func summarize(_ anchors: [ARAnchor], removed: Bool) {
        let p = anchors.compactMap { $0 is ARPlaneAnchor ? $0.identifier : nil }, m = anchors.compactMap { $0 is ARMeshAnchor ? $0.identifier : nil }
        Task { @MainActor [weak self] in
            guard let self else { return }
            for id in p { if removed { self.planes.remove(id);self.occluders.removeValue(forKey:id)?.removeFromParent() } else { self.planes.insert(id) } }
            for id in m { if removed { self.meshes.remove(id) } else { self.meshes.insert(id) } }
            self.planeCount = self.planes.count; self.meshCount = self.meshes.count; self.changed?()
        }
    }
    nonisolated func sessionWasInterrupted(_ session: ARSession) { Task { @MainActor [weak self] in self?.trackingNormal = false; self?.status = "Sessione AR interrotta · riprendi scansione"; self?.changed?() } }
    nonisolated func session(_ session: ARSession, didFailWithError error: Error) { Task { @MainActor [weak self] in self?.trackingNormal = false; self?.status = "Tracking non disponibile. Riprendi la scansione."; self?.changed?() } }
}

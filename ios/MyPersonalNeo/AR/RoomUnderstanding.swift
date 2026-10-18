import ARKit
import RealityKit
import UIKit
import CoreImage
import Combine

@MainActor
final class RoomUnderstanding: NSObject, ARSessionDelegate {
    let view = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)
    let rig = HumanoidRig()
    let world = AnchorEntity(world: .zero)
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
        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapped(_:))))
        update = view.scene.subscribe(to: SceneEvents.Update.self) { [weak self] event in
            MainActor.assumeIsolated {
                guard let self, self.running, self.trackingNormal else { return }
                self.rig.update(delta: Float(event.deltaTime)); self.tick?(Float(event.deltaTime))
            }
        }
    }
    func start() throws {
        guard ARWorldTrackingConfiguration.isSupported else { throw NeoFailure("ARKit richiede un iPhone compatibile; il simulatore non vede la stanza.") }
        if !rig.isLoaded { try rig.load() }
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        supportsLiDAR = ARWorldTrackingConfiguration.supportsSceneReconstruction(.meshWithClassification)
        if supportsLiDAR {
            config.sceneReconstruction = .meshWithClassification
            view.environment.sceneUnderstanding.options.insert(.occlusion)
            view.environment.sceneUnderstanding.options.insert(.physics)
        }
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) { config.frameSemantics.insert(.sceneDepth) }
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) { config.frameSemantics.insert(.personSegmentationWithDepth) }
        view.session.run(config); running = true; status = "Muovi lentamente l’iPhone per rilevare pavimento e superfici."; changed?()
    }
    func stop() { view.session.pause(); running = false; trackingNormal = false; rig.stop(); status = "Scansione sospesa · riprendi per riallineare"; changed?() }
    func place(at position: SIMD3<Float>) {
        guard trackingNormal else { return }
        rig.stop(); rig.root.position = position
        if let frame = view.session.currentFrame {
            let camera = SIMD3<Float>(frame.camera.transform.columns.3.x,position.y,frame.camera.transform.columns.3.z)
            let direction = camera-position
            if simd_length(direction) > 0.05 { rig.root.orientation = simd_quatf(from: [0,0,1], to: simd_normalize(direction)) }
        }
        rig.root.isEnabled = true; placed = true
    }
    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        guard trackingNormal else { status = "Tracking non stabile: attendi prima di selezionare."; changed?(); return }
        let point = gesture.location(in: view)
        guard let result = view.raycast(from: point, allowing: .existingPlaneGeometry, alignment: .horizontal).first else { status = "Nessuna superficie orizzontale misurata qui. Scansiona e riprova."; changed?(); return }
        let p = result.worldTransform.columns.3, position = SIMD3<Float>(p.x,p.y,p.z)
        if let tap { tap(position) } else { place(at: position) }
    }
    func frameJPEG() throws -> Data {
        guard running, trackingNormal, let frame = view.session.currentFrame else { throw NeoFailure("Attiva la scansione e attendi tracking stabile prima di osservare.") }
        let orientation = view.window?.windowScene?.interfaceOrientation ?? .portrait
        let exif: CGImagePropertyOrientation
        switch orientation { case .landscapeLeft: exif = .up; case .landscapeRight: exif = .down; case .portraitUpsideDown: exif = .left; default: exif = .right }
        let image = CIImage(cvPixelBuffer: frame.capturedImage).oriented(exif)
        guard let cg = CIContext().createCGImage(image, from: image.extent) else { throw NeoFailure("Fotogramma non disponibile.") }
        let input = UIImage(cgImage: cg), factor = min(1, 960 / max(input.size.width,input.size.height))
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let jpeg = UIGraphicsImageRenderer(size: CGSize(width: input.size.width*factor,height: input.size.height*factor), format: format).image { _ in input.draw(in: CGRect(origin: .zero,size: CGSize(width: input.size.width*factor,height: input.size.height*factor))) }.jpegData(compressionQuality: 0.62)
        guard let jpeg, jpeg.count < 550000 else { throw NeoFailure("Fotogramma troppo grande. Riprova.") }; return jpeg
    }
    nonisolated func session(_ session: ARSession, didUpdate frame: ARFrame) {
        let normal: Bool
        switch frame.camera.trackingState { case .normal: normal = true; default: normal = false }
        Task { @MainActor [weak self] in
            guard let self else { return }; self.trackingNormal = normal
            let message = normal ? "Tracking stabile · tocca il pavimento per posizionare NEO" : "Tracking limitato · interazioni spaziali sospese"
            if message != self.lastReport { self.status = message; self.lastReport = message; self.changed?() }
        }
    }
    nonisolated func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { summarize(anchors, removed: false) }
    nonisolated func session(_ session: ARSession, didRemove anchors: [ARAnchor]) { summarize(anchors, removed: true) }
    nonisolated private func summarize(_ anchors: [ARAnchor], removed: Bool) {
        let p = anchors.compactMap { $0 is ARPlaneAnchor ? $0.identifier : nil }, m = anchors.compactMap { $0 is ARMeshAnchor ? $0.identifier : nil }
        Task { @MainActor [weak self] in
            guard let self else { return }
            for id in p { if removed { self.planes.remove(id) } else { self.planes.insert(id) } }
            for id in m { if removed { self.meshes.remove(id) } else { self.meshes.insert(id) } }
            self.planeCount = self.planes.count; self.meshCount = self.meshes.count; self.changed?()
        }
    }
    nonisolated func sessionWasInterrupted(_ session: ARSession) { Task { @MainActor [weak self] in self?.trackingNormal = false; self?.status = "Sessione AR interrotta · riprendi scansione"; self?.changed?() } }
    nonisolated func session(_ session: ARSession, didFailWithError error: Error) { Task { @MainActor [weak self] in self?.trackingNormal = false; self?.status = "Tracking non disponibile. Riprendi la scansione."; self?.changed?() } }
}

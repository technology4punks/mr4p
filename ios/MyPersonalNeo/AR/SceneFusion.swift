import ARKit
import RealityKit
import UIKit

struct SceneObservation: Codable {
    let id: String
    let label: String
    let category: String
    let confidence: Float
    let box: [Float]
    let brand: String
    let model: String
}
struct SpatialObject: Identifiable {
    let id: String
    let observation: SceneObservation
    let position: SIMD3<Float>?
    let source: String
    var summary: [String:Any] { ["id":id,"label":observation.label,"category":observation.category,"confidence":observation.confidence,"spatial":position != nil,"measurement":source,"brand":observation.brand,"model":observation.model] }
}
enum SceneProjection {
    // JPEG is rotated for readability. ARKit intrinsics/depth refer to raw landscape image.
    static func rawPoint(_ point: SIMD2<Float>, orientation: UIInterfaceOrientation) -> SIMD2<Float> {
        switch orientation { case .portrait: return [point.y,1-point.x]; case .portraitUpsideDown: return [1-point.y,point.x]; case .landscapeRight: return [1-point.x,1-point.y]; default: return point }
    }
    static func cameraPoint(uv: SIMD2<Float>, depth: Float, intrinsics: simd_float3x3, resolution: CGSize) -> SIMD3<Float> {
        let x = uv.x * Float(resolution.width), y = uv.y * Float(resolution.height)
        return [(x-intrinsics.columns.2.x)*depth/intrinsics.columns.0.x, -(y-intrinsics.columns.2.y)*depth/intrinsics.columns.1.y, -depth]
    }
    static func depth(at point: SIMD2<Float>, in data: ARDepthData) -> Float? {
        let map = data.depthMap, confidence = data.confidenceMap
        CVPixelBufferLockBaseAddress(map,.readOnly); defer { CVPixelBufferUnlockBaseAddress(map,.readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(map) else { return nil }
        if let confidence { CVPixelBufferLockBaseAddress(confidence,.readOnly) }
        defer { if let confidence { CVPixelBufferUnlockBaseAddress(confidence,.readOnly) } }
        let w = CVPixelBufferGetWidth(map), h = CVPixelBufferGetHeight(map), stride = CVPixelBufferGetBytesPerRow(map)
        let x = min(w-1,max(0,Int(point.x*Float(w)))), y = min(h-1,max(0,Int(point.y*Float(h))))
        var samples: [Float] = []
        for dy in -2...2 { for dx in -2...2 {
            let xx = x+dx, yy = y+dy; guard xx>=0,yy>=0,xx<w,yy<h else { continue }
            if let confidence, let cb = CVPixelBufferGetBaseAddress(confidence), cb.load(fromByteOffset: yy*CVPixelBufferGetBytesPerRow(confidence)+xx,as:UInt8.self) == 0 { continue }
            let z = base.load(fromByteOffset: yy*stride+xx*4,as:Float.self)
            if z.isFinite && (0.15...8).contains(z) { samples.append(z) }
        } }
        guard samples.count >= 6 else { return nil }; samples.sort(); return samples[samples.count/2]
    }
}
@MainActor
enum SceneFusion {
    static func locate(_ observations: [SceneObservation], frame: ARFrame, orientation: UIInterfaceOrientation, session: ARSession) -> [SpatialObject] {
        let batch = String(UUID().uuidString.prefix(8))
        return observations.prefix(8).map { object in
            var position: SIMD3<Float>?, source = "Solo riconoscimento visivo · posizione non misurata"
            if object.confidence >= 0.6, object.box.count == 4 {
                let uv = SceneProjection.rawPoint([object.box[0]+object.box[2]/2,object.box[1]+object.box[3]/2],orientation:orientation)
                let camera = frame.camera
                if let depth = frame.sceneDepth ?? frame.smoothedSceneDepth, let z = SceneProjection.depth(at:uv,in:depth) {
                    let p = SceneProjection.cameraPoint(uv:uv,depth:z,intrinsics:camera.intrinsics,resolution:camera.imageResolution)
                    let world = camera.transform * SIMD4<Float>(p,1); position = [world.x,world.y,world.z]; source = "LiDAR · centro stimato, non sagoma completa"
                } else {
                    let direction = SceneProjection.cameraPoint(uv:uv,depth:1,intrinsics:camera.intrinsics,resolution:camera.imageResolution)
                    let world = camera.transform * SIMD4<Float>(simd_normalize(direction),0)
                    let origin = camera.transform.columns.3
                    let query = ARRaycastQuery(origin:[origin.x,origin.y,origin.z],direction:[world.x,world.y,world.z],allowing:.existingPlaneGeometry,alignment:.any)
                    if let result = session.raycast(query).first { let p = result.worldTransform.columns.3; position = [p.x,p.y,p.z]; source = "ARKit · intersezione con superficie stimata" }
                }
            }
            return SpatialObject(id:batch+"-"+object.id,observation:object,position:position,source:source)
        }
    }
}

import Foundation
import UIKit
import simd

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
}
enum SceneFusion {
    static func locate(_ observations: [SceneObservation], snapshot: PerceptionSnapshot) -> [SpatialObject] {
        let batch = String(UUID().uuidString.prefix(8))
        return observations.prefix(8).map { object in
            var position: SIMD3<Float>?, source = "Solo riconoscimento visivo · posizione non misurata"
            if object.confidence >= 0.6, object.box.count == 4, object.box.allSatisfy(\.isFinite), object.box[2] > 0, object.box[3] > 0 {
                let uv = SceneProjection.rawPoint([object.box[0]+object.box[2]/2,object.box[1]+object.box[3]/2],orientation:snapshot.orientation)
                guard (0...1).contains(uv.x), (0...1).contains(uv.y) else {
                    return SpatialObject(id:batch+"-"+object.id,observation:object,position:nil,source:source)
                }
                if let z = snapshot.depth?.sample(at:uv) {
                    let p = SceneProjection.cameraPoint(uv:uv,depth:z,intrinsics:snapshot.intrinsics,resolution:snapshot.imageResolution)
                    let world = snapshot.cameraTransform * SIMD4<Float>(p,1); position = [world.x,world.y,world.z]; source = "LiDAR · centro stimato, non sagoma completa"
                } else {
                    let direction = SceneProjection.cameraPoint(uv:uv,depth:1,intrinsics:snapshot.intrinsics,resolution:snapshot.imageResolution)
                    let world = snapshot.cameraTransform * SIMD4<Float>(simd_normalize(direction),0)
                    let o = snapshot.cameraTransform.columns.3, origin = SIMD3<Float>(o.x,o.y,o.z), ray = SIMD3<Float>(world.x,world.y,world.z)
                    position = snapshot.planes.compactMap { $0.intersection(origin:origin,direction:ray) }.min { simd_distance(origin,$0) < simd_distance(origin,$1) }
                    if position != nil { source = "ARKit · intersezione con superficie misurata nella foto" }
                }
            }
            return SpatialObject(id:batch+"-"+object.id,observation:object,position:position,source:source)
        }
    }
}

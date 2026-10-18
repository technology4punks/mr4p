import ARKit
import UIKit

/// An owned, bounded copy of the measurements needed after a vision request. Never
/// keep an ARFrame, ARDepthData or camera pixel buffer alive while awaiting a network reply.
struct PerceptionSnapshot {
    let cameraTransform: simd_float4x4
    let intrinsics: simd_float3x3
    let imageResolution: CGSize
    let orientation: UIInterfaceOrientation
    let depth: DepthSnapshot?
    let planes: [ScenePlaneSnapshot]

    init(frame: ARFrame, orientation: UIInterfaceOrientation, planes: [ScenePlaneSnapshot]? = nil) {
        cameraTransform = frame.camera.transform
        intrinsics = frame.camera.intrinsics
        imageResolution = frame.camera.imageResolution
        self.orientation = orientation
        depth = (frame.sceneDepth ?? frame.smoothedSceneDepth).flatMap(DepthSnapshot.init(copying:))
        if let planes { self.planes = Array(planes.prefix(64)) }
        else {
            self.planes = frame.anchors.lazy.compactMap { ($0 as? ARPlaneAnchor).map(ScenePlaneSnapshot.init(anchor:)) }.prefix(64).map { $0 }
        }
    }

    init(cameraTransform: simd_float4x4, intrinsics: simd_float3x3,
         imageResolution: CGSize, orientation: UIInterfaceOrientation,
         depth: DepthSnapshot?, planes: [ScenePlaneSnapshot]) {
        self.cameraTransform = cameraTransform; self.intrinsics = intrinsics
        self.imageResolution = imageResolution; self.orientation = orientation
        self.depth = depth; self.planes = Array(planes.prefix(64))
    }
}

struct DepthSnapshot {
    let width: Int
    let height: Int
    let values: [Float]
    let confidence: [UInt8]?

    init?(width: Int, height: Int, values: [Float], confidence: [UInt8]? = nil) {
        guard width > 0, height > 0, width <= 1024, height <= 1024,
              values.count == width * height, confidence == nil || confidence?.count == values.count else { return nil }
        self.width = width; self.height = height; self.values = values; self.confidence = confidence
    }

    /// Copies row by row: camera/depth buffers can have padding between scanlines.
    init?(width: Int, height: Int, bytesPerRow: Int, depthBytes: UnsafeRawPointer,
          confidenceBytesPerRow: Int? = nil, confidenceBytes: UnsafeRawPointer? = nil) {
        guard width > 0, height > 0, width <= 1024, height <= 1024,
              bytesPerRow >= width * MemoryLayout<Float>.stride,
              confidenceBytes == nil || (confidenceBytesPerRow ?? 0) >= width else { return nil }
        var values = [Float](); values.reserveCapacity(width * height)
        var confidence: [UInt8]? = confidenceBytes == nil ? nil : []
        confidence?.reserveCapacity(width * height)
        for y in 0..<height {
            for x in 0..<width {
                values.append(depthBytes.loadUnaligned(fromByteOffset: y * bytesPerRow + x * MemoryLayout<Float>.stride, as: Float.self))
                if let confidenceBytes, let confidenceBytesPerRow {
                    confidence?.append(confidenceBytes.load(fromByteOffset: y * confidenceBytesPerRow + x, as: UInt8.self))
                }
            }
        }
        self.init(width: width, height: height, values: values, confidence: confidence)
    }

    init?(copying data: ARDepthData) {
        let map = data.depthMap, confidence = data.confidenceMap
        guard CVPixelBufferGetPixelFormatType(map) == kCVPixelFormatType_DepthFloat32,
              CVPixelBufferLockBaseAddress(map, .readOnly) == kCVReturnSuccess else { return nil }
        defer { CVPixelBufferUnlockBaseAddress(map, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(map) else { return nil }
        let width = CVPixelBufferGetWidth(map), height = CVPixelBufferGetHeight(map)
        if let confidence {
            guard CVPixelBufferGetWidth(confidence) == width, CVPixelBufferGetHeight(confidence) == height,
                  CVPixelBufferLockBaseAddress(confidence, .readOnly) == kCVReturnSuccess else { return nil }
            defer { CVPixelBufferUnlockBaseAddress(confidence, .readOnly) }
            guard let confidenceBase = CVPixelBufferGetBaseAddress(confidence) else { return nil }
            self.init(width: width, height: height, bytesPerRow: CVPixelBufferGetBytesPerRow(map), depthBytes: base,
                      confidenceBytesPerRow: CVPixelBufferGetBytesPerRow(confidence), confidenceBytes: confidenceBase)
        } else {
            self.init(width: width, height: height, bytesPerRow: CVPixelBufferGetBytesPerRow(map), depthBytes: base)
        }
    }

    func sample(at point: SIMD2<Float>) -> Float? {
        guard point.x.isFinite, point.y.isFinite, (0...1).contains(point.x), (0...1).contains(point.y) else { return nil }
        let x = min(width - 1, Int(point.x * Float(width))), y = min(height - 1, Int(point.y * Float(height)))
        var samples = [Float](); samples.reserveCapacity(25)
        for dy in -2...2 { for dx in -2...2 {
            let xx = x + dx, yy = y + dy
            guard xx >= 0, yy >= 0, xx < width, yy < height else { continue }
            let index = yy * width + xx, z = values[index]
            guard confidence?[index] != 0, z.isFinite, (0.15...8).contains(z) else { continue }
            samples.append(z)
        } }
        guard samples.count >= 6 else { return nil }
        samples.sort(); return samples[samples.count / 2]
    }
}

/// A plane measured at capture time, with its copied polygon in local X/Z coordinates.
/// Fallback intersections use that same snapshot rather than the later, moving AR session.
struct ScenePlaneSnapshot {
    enum Kind {case floor,other,unknown}
    let kind:Kind
    let id: UUID
    let isHorizontal: Bool
    let transform: simd_float4x4
    let center: SIMD3<Float>
    let extent: SIMD2<Float>
    let boundary: [SIMD2<Float>]
    private let inverse: simd_float4x4

    init(id: UUID = UUID(), isHorizontal: Bool = true, transform: simd_float4x4, center: SIMD3<Float>, extent: SIMD2<Float>, boundary: [SIMD2<Float>] = [], kind:Kind = .unknown) {
        self.kind=kind
        self.id = id; self.isHorizontal = isHorizontal
        self.transform = transform; self.center = center; self.extent = extent
        self.boundary = Array(boundary.prefix(512)); inverse = simd_inverse(transform)
    }

    init(anchor: ARPlaneAnchor) {
        let geometry = anchor.geometry
        let boundary = geometry.boundaryVertices.prefix(512).map { p -> SIMD2<Float> in [p.x,p.z] }
        let kind:Kind
        switch anchor.classification {case .floor:kind = .floor;case .table,.seat,.ceiling:kind = .other;default:kind = .unknown}
        self.init(id:anchor.identifier,isHorizontal:anchor.alignment == .horizontal,
                  transform: anchor.transform, center: anchor.center, extent: [anchor.extent.x, anchor.extent.z], boundary: boundary,kind:kind)
    }

    init(_ anchor: ARPlaneAnchor) { self.init(anchor:anchor) }

    func intersection(origin: SIMD3<Float>, direction: SIMD3<Float>, maxDistance: Float = 8) -> SIMD3<Float>? {
        let length = simd_length(direction)
        guard length.isFinite, length > 0.0001 else { return nil }
        let o = inverse * SIMD4<Float>(origin, 1), d = inverse * SIMD4<Float>(direction / length, 0)
        guard abs(d.y) > 0.0001 else { return nil }
        let t = (center.y - o.y) / d.y
        guard t.isFinite, t > 0, t <= maxDistance else { return nil }
        let point = o + d * t, local = SIMD2<Float>(point.x, point.z)
        guard abs(local.x - center.x) <= extent.x / 2, abs(local.y - center.z) <= extent.y / 2 else { return nil }
        if boundary.count >= 3, !contains(local) { return nil }
        let world = transform * SIMD4<Float>(point.x, point.y, point.z, 1)
        guard world.x.isFinite, world.y.isFinite, world.z.isFinite else { return nil }
        return [world.x, world.y, world.z]
    }

    private func contains(_ point: SIMD2<Float>) -> Bool {
        var inside = false, j = boundary.count - 1
        for i in boundary.indices {
            let a = boundary[i], b = boundary[j]
            if (a.y > point.y) != (b.y > point.y), point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x { inside.toggle() }
            j = i
        }
        return inside
    }
}

import XCTest
import simd
import UIKit
@testable import MyPersonalNeo

final class SnapshotTests: XCTestCase {
    func testDepthCopiesPaddedRowsAndOwnsMemoryAfterCameraBufferChanges() throws {
        let width = 5, height = 5, depthStride = 7, confidenceStride = 8
        var depthRows = [Float](repeating: 999, count: depthStride * height)
        var confidenceRows = [UInt8](repeating: 0, count: confidenceStride * height)
        for y in 0..<height { for x in 0..<width {
            depthRows[y * depthStride + x] = 2
            confidenceRows[y * confidenceStride + x] = 2
        } }
        let copy = try XCTUnwrap(depthRows.withUnsafeBytes { depths in
            confidenceRows.withUnsafeBytes { confidence in
                DepthSnapshot(width:width,height:height,bytesPerRow:depthStride * MemoryLayout<Float>.stride,
                              depthBytes:depths.baseAddress!,confidenceBytesPerRow:confidenceStride,confidenceBytes:confidence.baseAddress!)
            }
        })
        depthRows = [Float](repeating: 6, count: depthRows.count)
        confidenceRows = [UInt8](repeating: 0, count: confidenceRows.count)
        XCTAssertEqual(copy.values, [Float](repeating:2,count:25))
        XCTAssertEqual(copy.confidence, [UInt8](repeating:2,count:25))
        XCTAssertEqual(copy.sample(at:[0.5,0.5]),2)
        let unreliable = try XCTUnwrap(DepthSnapshot(width:5,height:5,values:copy.values,confidence:[UInt8](repeating:0,count:25)))
        XCTAssertNil(unreliable.sample(at:[0.5,0.5]))
        XCTAssertNil(copy.sample(at:[.nan,0.5])); XCTAssertNil(copy.sample(at:[1.1,0.5]))
        XCTAssertNil(DepthSnapshot(width:1025,height:1,values:[Float](repeating:1,count:1025)))
    }

    func testFusionUsesCapturedCameraPoseAndOwnedDepth() throws {
        var camera = matrix_identity_float4x4; camera.columns.3 = [10,1,3,1]
        let depth = try XCTUnwrap(DepthSnapshot(width:5,height:5,values:[Float](repeating:2,count:25)))
        let snapshot = PerceptionSnapshot(cameraTransform:camera,intrinsics:intrinsics,imageResolution:CGSize(width:100,height:100),
                                          orientation:.portrait,depth:depth,planes:[])
        camera.columns.3 = [-100,40,20,1] // A later camera pose cannot change the captured measurement.
        let result = try XCTUnwrap(SceneFusion.locate([object],snapshot:snapshot).first?.position)
        XCTAssertEqual(result.x,10,accuracy:0.001); XCTAssertEqual(result.y,1,accuracy:0.001); XCTAssertEqual(result.z,1,accuracy:0.001)
    }

    func testPlaneFallbackSelectsNearestCapturedSurfaceAndRejectsOutsidePolygon() throws {
        // Local plane X/Z becomes a wall in world X/Y, facing the camera at Z = -2.
        var near = simd_float4x4(simd_quatf(angle:.pi/2,axis:[1,0,0])); near.columns.3 = [0,0,-2,1]
        var far = near; far.columns.3.z = -4
        let square: [SIMD2<Float>] = [[-1,-1],[1,-1],[1,1],[-1,1]]
        let plane = ScenePlaneSnapshot(transform:near,center:.zero,extent:[2,2],boundary:square)
        XCTAssertEqual(try XCTUnwrap(plane.intersection(origin:.zero,direction:[0,0,-1])).z,-2,accuracy:0.001)
        XCTAssertNil(plane.intersection(origin:[3,0,0],direction:[0,0,-1]))
        XCTAssertNil(plane.intersection(origin:.zero,direction:[0,0,1]))
        XCTAssertNil(plane.intersection(origin:.zero,direction:[1,0,0]))
        XCTAssertNil(plane.intersection(origin:.zero,direction:[0,0,-1],maxDistance:1))
        let snapshot = PerceptionSnapshot(cameraTransform:matrix_identity_float4x4,intrinsics:intrinsics,
                                          imageResolution:CGSize(width:100,height:100),orientation:.landscapeLeft,depth:nil,
                                          planes:[ScenePlaneSnapshot(transform:far,center:.zero,extent:[2,2]),plane])
        let result = try XCTUnwrap(SceneFusion.locate([object],snapshot:snapshot).first?.position)
        XCTAssertEqual(result.z,-2,accuracy:0.001)
        let triangle = ScenePlaneSnapshot(transform:near,center:.zero,extent:[2,2],boundary:[[-1,-1],[1,-1],[-1,1]])
        XCTAssertNil(triangle.intersection(origin:[0.8,-0.8,0],direction:[0,0,-1]))
    }

    func testCurrentDepthProjectionRejectsBehindCameraAndOffscreenPoints() throws {
        let p=try XCTUnwrap(SceneProjection.rawProjection(world:[0,0,-2],cameraTransform:matrix_identity_float4x4,intrinsics:intrinsics,resolution:CGSize(width:100,height:100)))
        XCTAssertEqual(p.uv,SIMD2<Float>(0.5,0.5));XCTAssertEqual(p.depth,2)
        XCTAssertNil(SceneProjection.rawProjection(world:[0,0,2],cameraTransform:matrix_identity_float4x4,intrinsics:intrinsics,resolution:CGSize(width:100,height:100)))
        XCTAssertNil(SceneProjection.rawProjection(world:[10,0,-1],cameraTransform:matrix_identity_float4x4,intrinsics:intrinsics,resolution:CGSize(width:100,height:100)))
    }
    private var intrinsics: simd_float3x3 {
        simd_float3x3(SIMD3<Float>(100,0,0),SIMD3<Float>(0,100,0),SIMD3<Float>(50,50,1))
    }
    private var object: SceneObservation {
        SceneObservation(id:"test",label:"Pianoforte",category:"instrument",confidence:0.9,
                         box:[0.4,0.4,0.2,0.2],brand:"",model:"")
    }
}

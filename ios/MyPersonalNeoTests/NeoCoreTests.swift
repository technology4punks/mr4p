import XCTest
import simd
import UIKit
import RealityKit
@testable import MyPersonalNeo

final class NeoCoreTests: XCTestCase {
    func testKeyboardWhiteBlackMappingAndWorldRotation() throws {
        let keyboard = try PianoCalibration(low:[0,0.75,0],high:[1.2,0.75,0],back:[0.5,0.75,-0.13])
        XCTAssertEqual(PianoCalibration.whiteIndex(21),0)
        XCTAssertEqual(PianoCalibration.whiteIndex(22),0.5)
        XCTAssertEqual(PianoCalibration.whiteIndex(108),51)
        XCTAssertNil(PianoCalibration.whiteIndex(109))
        XCTAssertEqual(keyboard.key(21)!.x,0,accuracy:0.0001)
        XCTAssertEqual(keyboard.key(108)!.x,1.2,accuracy:0.0001)
        XCTAssertLessThan(keyboard.key(22)!.z,keyboard.key(21)!.z)
        let rotated = try PianoCalibration(low:[1,0.75,0],high:[1,0.75,1.2],back:[1.13,0.75,0.5])
        XCTAssertEqual(rotated.key(108)!.z,1.2,accuracy:0.0001)
        XCTAssertEqual(rotated.key(22)!.x,1.065,accuracy:0.001)
    }
    func testRejectsInvalidOrVerticalCalibrationAndUnknownScore() {
        XCTAssertThrowsError(try PianoCalibration(low:.zero,high:.zero,back:.zero))
        XCTAssertThrowsError(try PianoCalibration(low:.zero,high:[1.2,0,0],back:[0.5,0.2,0]))
        XCTAssertThrowsError(try PianoCalibration(low:[.nan,0,0],high:[1.2,0,0],back:[0.5,0,-0.13]))
        XCTAssertNil(PianoScore.notes("unknown"))
        let score = PianoScore.notes("c_major")!
        XCTAssertEqual(score.count,15);XCTAssertEqual(score.first?.midi,60);XCTAssertEqual(score.last?.midi,60)
    }
    func testPortraitAndLandscapeFusionCoordinates() {
        XCTAssertEqual(SceneProjection.rawPoint([0.25,0.75],orientation:.portrait),SIMD2<Float>(0.75,0.75))
        XCTAssertEqual(SceneProjection.rawPoint([0.25,0.75],orientation:.landscapeLeft),SIMD2<Float>(0.25,0.75))
        XCTAssertEqual(SceneProjection.rawPoint([0.25,0.75],orientation:.landscapeRight),SIMD2<Float>(0.75,0.25))
        let intrinsics = simd_float3x3(SIMD3<Float>(100,0,0),SIMD3<Float>(0,100,0),SIMD3<Float>(50,50,1))
        XCTAssertEqual(SceneProjection.cameraPoint(uv:[0.5,0.5],depth:2,intrinsics:intrinsics,resolution:CGSize(width:100,height:100)),SIMD3<Float>(0,0,-2))
    }
    func testSpeechNotNoiseAuthorizesToolsAndCanInterruptRepeatedly() {
        var gate=VoiceTurnGate();gate.begin(comment:true)
        XCTAssertFalse(gate.mayUseTools);XCTAssertFalse(gate.user("…"));XCTAssertFalse(gate.user("1"))
        XCTAssertTrue(gate.user("No"));XCTAssertTrue(gate.mayUseTools);XCTAssertEqual(gate.turn,1)
        gate.complete();gate.begin();XCTAssertTrue(gate.user("Guarda il tavolo"));XCTAssertEqual(gate.turn,2)
        gate.complete();gate.mayAuthorizeAudio();XCTAssertEqual(gate.turn,3)
        gate.reset();XCTAssertFalse(gate.responseActive);XCTAssertFalse(gate.mayUseTools)
    }
    @MainActor func testPackagedUSDLoadsFortyEightJointsAndSixSkinnedParts() throws {
        let rig=HumanoidRig();try rig.load()
        XCTAssertTrue(rig.isLoaded);XCTAssertEqual(rig.models.count,6)
        XCTAssertTrue(rig.models.allSatisfy { $0.jointNames.count == 48 && $0.jointTransforms.count == 48 })
        rig.play("wave");rig.update(delta:0.03)
        XCTAssertTrue(rig.models.flatMap(\.jointTransforms).allSatisfy { $0.translation.x.isFinite && $0.rotation.real.isFinite })
    }
}

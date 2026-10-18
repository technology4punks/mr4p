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
        gate.complete();gate.mayAuthorizeAudio();XCTAssertEqual(gate.turn,3);XCTAssertFalse(gate.mayUseTools)
        gate.reset();XCTAssertFalse(gate.responseActive);XCTAssertFalse(gate.mayUseTools)
    }
    func testBriefNoiseCannotInterruptButPhrasesAndStopCan() {
        XCTAssertFalse(VoiceTurnGate.meaningful("eh",duration:1,overlapping:true))
        XCTAssertFalse(VoiceTurnGate.meaningful("Guarda il tavolo",duration:0.1,overlapping:true))
        XCTAssertFalse(VoiceTurnGate.meaningful("tavolo",duration:0.5,overlapping:true))
        XCTAssertTrue(VoiceTurnGate.meaningful("aspetta",duration:0.2,overlapping:true))
        XCTAssertTrue(VoiceTurnGate.meaningful("no",duration:0.2,overlapping:true))
        XCTAssertTrue(VoiceTurnGate.meaningful("guarda qui",duration:0.4,overlapping:true))
        XCTAssertTrue(VoiceTurnGate.meaningful("Andrea",duration:0.4,overlapping:false))
        var evidence=SpeechEvidence(started:Date(timeIntervalSince1970:1),overlapping:true)
        evidence.duration=0.25
        XCTAssertEqual(evidence.seconds(at:Date(timeIntervalSince1970:100)),0.25) // ASR delay is not speech duration.
    }
    @MainActor func testVoiceAcceptsSuccessiveTurnsAndIgnoresBriefNoise() throws {
        let voice=NeoVoice()
        func emit(_ event:[String:Any]) throws { voice.receive(try JSONSerialization.data(withJSONObject:event)) }
        try emit(["type":"response.created","response":["id":"greeting"]])
        try emit(["type":"output_audio_buffer.started"])
        try emit(["type":"input_audio_buffer.speech_started","item_id":"noise","audio_start_ms":0])
        try emit(["type":"input_audio_buffer.speech_stopped","item_id":"noise","audio_end_ms":1100])
        try emit(["type":"conversation.item.input_audio_transcription.completed","item_id":"noise","transcript":"Guarda qui"])
        XCTAssertEqual(voice.state,.speaking);XCTAssertEqual(voice.heard,"")
        try emit(["type":"input_audio_buffer.speech_started","item_id":"one","audio_start_ms":2000])
        try emit(["type":"input_audio_buffer.speech_stopped","item_id":"one","audio_end_ms":3500])
        try emit(["type":"conversation.item.input_audio_transcription.completed","item_id":"one","transcript":"Guarda il tavolo"])
        try emit(["type":"response.done"])
        try emit(["type":"output_audio_buffer.cleared"])
        XCTAssertEqual(voice.heard,"Guarda il tavolo")
        try emit(["type":"response.created","response":["id":"answer"]])
        try emit(["type":"response.done"])
        try emit(["type":"input_audio_buffer.speech_started","item_id":"two","audio_start_ms":4000])
        try emit(["type":"input_audio_buffer.speech_stopped","item_id":"two","audio_end_ms":5400])
        try emit(["type":"conversation.item.input_audio_transcription.completed","item_id":"two","transcript":"Mi chiamo Andrea"])
        XCTAssertEqual(voice.heard,"Mi chiamo Andrea");XCTAssertFalse(voice.muted)
        voice.stop()
    }
    func testWalkingRejectsUnknownFloorObstaclesAndLargeSteps() throws {
        let step=try XCTUnwrap(AvatarMotion.step(from:.zero,to:[1,0,0],delta:2))
        XCTAssertLessThanOrEqual(step.x,0.0211)
        XCTAssertFalse(AvatarMotion.permitted(candidate:step,measuredFloor:nil,blocked:false))
        XCTAssertFalse(AvatarMotion.permitted(candidate:step,measuredFloor:step,blocked:true))
        XCTAssertFalse(AvatarMotion.permitted(candidate:step,measuredFloor:step+[0,0.2,0],blocked:false))
        XCTAssertTrue(AvatarMotion.permitted(candidate:step,measuredFloor:step,blocked:false))
        XCTAssertNil(AvatarMotion.step(from:.zero,to:[0,0.3,1],delta:0.02))
        XCTAssertNil(AvatarMotion.step(from:.zero,to:[10,0,0],delta:0.02))
        XCTAssertNil(AvatarMotion.step(from:.zero,to:[.nan,0,0],delta:0.02))
    }
    func testPerformanceBudgetDropsJointRateAfterSustainedSlowFrames() {
        var policy=ScenePerformance()
        for _ in 0..<65 {_=policy.observe(1.0/30)}
        XCTAssertEqual(policy.animationHz,20)
        XCTAssertEqual(policy.fps,30,accuracy:0.1)
        for _ in 0..<130 {_=policy.observe(1.0/60)}
        XCTAssertEqual(policy.animationHz,30)
        XCTAssertEqual(policy.fps,60,accuracy:0.1)
    }
    @MainActor func testThreeLightweightCompanionsLoadAndAnimateActualSkin() async throws {
        let rig=HumanoidRig()
        for profile in AvatarProfile.allCases {
            try rig.load(profile)
            XCTAssertTrue(rig.isLoaded);XCTAssertFalse(rig.models.isEmpty)
            XCTAssertTrue(rig.models.allSatisfy { $0.jointNames.count == profile.expectedJoints && $0.jointTransforms.count == profile.expectedJoints })
            let bounds=rig.root.visualBounds(relativeTo:rig.root).extents
            XCTAssertGreaterThan(bounds.y,profile.isHuman ? 1.5 : 0.5);XCTAssertLessThan(bounds.y,profile.isHuman ? 1.9 : 0.7)
            XCTAssertLessThan(bounds.x,1.6);XCTAssertLessThan(bounds.z,profile.isHuman ? 0.8 : 1.4)
            rig.update(delta:0.03);let before=rig.models[0].jointTransforms
            rig.play("wave");rig.update(delta:0.15)
            XCTAssertTrue(zip(before,rig.models[0].jointTransforms).contains { abs(simd_dot($0.rotation.vector,$1.rotation.vector)) < (profile.isHuman ? 0.999 : 0.9999) }, "Wave must move real skin for \(profile)")
            rig.stop();rig.walkAmount=1;rig.update(delta:0.04)
            XCTAssertTrue(zip(before,rig.models[0].jointTransforms).contains { abs(simd_dot($0.rotation.vector,$1.rotation.vector)) < 0.9999 })
            rig.seated=true;rig.stop(stand:false);XCTAssertTrue(rig.seated)
            XCTAssertTrue(rig.models.flatMap(\.jointTransforms).allSatisfy { $0.translation.x.isFinite && $0.rotation.real.isFinite })
            XCTAssertNotNil(Bundle.main.url(forResource:profile.resource,withExtension:"jpg"))
            XCTAssertEqual(rig.models.count,1)
            XCTAssertEqual(rig.models.first?.model?.materials.count,1)
            // One shared palette texture instead of full body/face/normal maps.
            XCTAssertTrue(rig.models.flatMap { $0.model?.materials ?? [] }.contains { ($0 as? PhysicallyBasedMaterial)?.baseColor.texture != nil })
        }
    }
}

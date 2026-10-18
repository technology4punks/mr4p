import XCTest
import RealityKit
import simd
@testable import MyPersonalNeo

final class RigRegressionTests: XCTestCase {
    @MainActor private func globalPoint(_ suffix: String, in model: ModelEntity) throws -> SIMD3<Float> {
        let names=model.jointNames, pose=model.jointTransforms
        var global=Array(repeating:matrix_identity_float4x4,count:names.count)
        for i in names.indices {
            let parent=names[i].split(separator:"/").dropLast().joined(separator:"/")
            global[i]=(names.firstIndex(of:parent).map { global[$0] } ?? matrix_identity_float4x4)*pose[i].matrix
        }
        let i=try XCTUnwrap(names.firstIndex { $0.split(separator:"/").last.map(String.init)==suffix })
        let p=global[i].columns.3
        return [p.x,p.y,p.z]
    }
    @MainActor private func importedSkin(_ root: Entity) -> ModelEntity? {
        if let model=root as? ModelEntity,!model.jointNames.isEmpty {return model}
        for child in root.children { if let found=importedSkin(child) {return found} }
        return nil
    }
    @MainActor func testBindPivotsMatchSourceTShapeInsteadOfAnimatedNodePose() throws {
        for profile in [AvatarProfile.man,.woman] {
            let url=try XCTUnwrap(Bundle.main.url(forResource:profile.resource,withExtension:"usdz"))
            let entity=try Entity.load(contentsOf:url), model=try XCTUnwrap(importedSkin(entity))
            for side in ["L","R"] {
                let shoulder=try globalPoint("UpperArm_"+side,in:model)
                let elbow=try globalPoint("LowerArm_"+side,in:model)
                let wrist=try globalPoint("Wrist_"+side,in:model)
                // Mesh vertices are stored in a T pose. The old converter instead
                // used animated-node pivots: its elbows were ~17cm too low.
                XCTAssertEqual(elbow.y,shoulder.y,accuracy:0.015)
                XCTAssertGreaterThan(abs(wrist.x-shoulder.x),0.3)
            }
        }
    }
    @MainActor func testRelaxedSkinIsAppliedBeforeAnyTrackingOrAnimationTick() throws {
        let rig=HumanoidRig()
        for profile in [AvatarProfile.man,.woman] {
            try rig.load(profile)
            let model=try XCTUnwrap(rig.models.first)
            for side in ["L","R"] {
                let shoulder=try globalPoint("UpperArm_"+side,in:model)
                let elbow=try globalPoint("LowerArm_"+side,in:model)
                let wrist=try globalPoint("Wrist_"+side,in:model)
                XCTAssertLessThan(elbow.y,shoulder.y-0.15)
                XCTAssertLessThan(wrist.y,shoulder.y-0.35)
            }
        }
    }
    @MainActor func testGestureContinuesWithLimitedTrackingButSpatialTargetsDoNot() throws {
        let rig=HumanoidRig(), reference=HumanoidRig()
        try rig.load(.woman);try reference.load(.woman)
        let before=try XCTUnwrap(rig.models.first).jointTransforms
        rig.target=[0.5,1.2,0.5];rig.gaze=[1,1.8,0.5];rig.walkAmount=1
        rig.play("wave");reference.play("wave")
        // play clears a previous reach target. Supply one to prove limited
        // tracking skips world-space IK while preserving the same local gesture.
        rig.target=[0.5,1.2,0.5]
        rig.update(delta:0.04,spatialTracking:false)
        reference.update(delta:0.04,spatialTracking:false)
        let after=try XCTUnwrap(rig.models.first).jointTransforms
        XCTAssertTrue(zip(before,after).contains { abs(simd_dot($0.rotation.vector,$1.rotation.vector))<0.99 })
        let expected=try XCTUnwrap(reference.models.first).jointTransforms
        for (actual,wanted) in zip(after,expected) {
            XCTAssertEqual(abs(simd_dot(actual.rotation.vector,wanted.rotation.vector)),1,accuracy:0.00001)
            XCTAssertLessThan(simd_distance(actual.translation,wanted.translation),0.00001)
        }
        XCTAssertEqual(rig.root.position,SIMD3<Float>.zero)
        rig.update(delta:0.04,spatialTracking:true)
        XCTAssertTrue(zip(after,rig.models[0].jointTransforms).contains { abs(simd_dot($0.rotation.vector,$1.rotation.vector))<0.9999 })
    }
    @MainActor func testInvalidTargetsAndDeltasCannotPoisonJointTransforms() throws {
        let rig=HumanoidRig();try rig.load(.man)
        rig.target=[.nan,1,0];rig.gaze=[.infinity,0,0];rig.walkAmount = .nan
        rig.update(delta:.nan);rig.update(delta:0.03)
        for transform in rig.models.flatMap(\.jointTransforms) {
            XCTAssertTrue(transform.rotation.vector.x.isFinite && transform.rotation.vector.y.isFinite && transform.rotation.vector.z.isFinite && transform.rotation.vector.w.isFinite)
        }
    }
    @MainActor func testAsynchronousImportAlsoInstallsAnImmediatelyRelaxedPose() async throws {
        let rig=HumanoidRig();try await rig.loadAsync(.woman)
        let model=try XCTUnwrap(rig.models.first)
        let shoulder=try globalPoint("UpperArm_R",in:model), wrist=try globalPoint("Wrist_R",in:model)
        XCTAssertLessThan(wrist.y,shoulder.y-0.35)
    }
}

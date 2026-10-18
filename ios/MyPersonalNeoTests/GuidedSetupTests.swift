import XCTest
import simd
import RealityKit
@testable import MyPersonalNeo

final class GuidedSetupTests:XCTestCase {
    private let floor=ScenePlaneSnapshot(transform:matrix_identity_float4x4,center:[0,0,-1.3],extent:[3,3],kind:.floor)
    func testGuideRequiresStableMeasuredFloorAndCannotBeSkippedByElapsedTime() {
        var guide=GuidedRoomSetup();guide.start()
        guide.observe(now:1,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[])
        XCTAssertFalse(guide.canPlace)
        guide.observe(now:10,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        XCTAssertEqual(guide.stage,.holdStill);XCTAssertFalse(guide.canPlace)
        guide.observe(now:11.6,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        XCTAssertTrue(guide.canPlace);XCTAssertEqual(guide.position,SIMD3<Float>(0,0,-1.3))
        guide.observe(now:12,tracking:false,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        XCTAssertFalse(guide.canPlace);XCTAssertNil(guide.position)
        guide.expire();XCTAssertEqual(guide.stage,.retry);guide.complete();XCTAssertEqual(guide.stage,.retry)
        guide.start();guide.observe(now:20,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        guide.observe(now:22,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor]);guide.complete()
        XCTAssertFalse(guide.isVisible);XCTAssertEqual(guide.stage,.placed)
    }
    func testGuideRejectsTableSmallPatchTiltAndMovement() {
        let table=ScenePlaneSnapshot(transform:matrix_identity_float4x4,center:[0,0.6,-1.3],extent:[3,3],kind:.other)
        let tiny=ScenePlaneSnapshot(transform:matrix_identity_float4x4,center:[0,0,-1.3],extent:[0.4,0.4],kind:.floor)
        var tilted=matrix_identity_float4x4;tilted.columns.1.y=0.8
        let slope=ScenePlaneSnapshot(transform:tilted,center:[0,0,-1.3],extent:[3,3],kind:.floor)
        for p in [table,tiny,slope] {XCTAssertNil(GuidedRoomSetup.support(camera:[0,1.6,0],forward:[0,0,-1],planes:[p]))}
        var guide=GuidedRoomSetup();guide.start()
        guide.observe(now:1,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        guide.observe(now:3,tracking:true,camera:[0.3,1.6,0],forward:[0,0,-1],planes:[floor])
        XCTAssertFalse(guide.canPlace);XCTAssertEqual(guide.progress,0)
    }
    func testHeightRefinementRestartsStabilityAndUsesTheCurrentFloorElevation() {
        var guide=GuidedRoomSetup();guide.start()
        guide.observe(now:1,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[floor])
        let refined=ScenePlaneSnapshot(transform:matrix_identity_float4x4,center:[0,0.05,-1.3],extent:[3,3],kind:.floor)
        guide.observe(now:3,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[refined])
        XCTAssertFalse(guide.canPlace)
        guide.observe(now:4.6,tracking:true,camera:[0,1.6,0],forward:[0,0,-1],planes:[refined])
        XCTAssertTrue(guide.canPlace);XCTAssertEqual(guide.position?.y ?? -1,0.05,accuracy:0.0001)
    }
    func testKnownFurnitureBlocksInitialPlacementEvenWithFloorBehindIt() {
        let table=ScenePlaneSnapshot(transform:matrix_identity_float4x4,center:[0,0.7,-1.3],extent:[1.2,1.2],kind:.other)
        XCTAssertTrue(GuidedRoomSetup.obstructed(at:[0,0,-1.3],planes:[floor,table]))
        XCTAssertNil(GuidedRoomSetup.support(camera:[0,1.6,0],forward:[0,0,-1],planes:[floor,table]))
    }
    func testEveryHeadingIncludingExactReverseKeepsBodyUpright() throws {
        for degrees in stride(from:-360,through:360,by:5) {
            let angle=Float(degrees) * .pi/180,direction=SIMD3<Float>(sin(angle),0,cos(angle))
            let rotation=try XCTUnwrap(AvatarHeading.facing(direction))
            XCTAssertLessThan(simd_distance(rotation.act([0,1,0]),[0,1,0]),0.00001)
            XCTAssertLessThan(simd_distance(rotation.act([0,0,1]),direction),0.00001)
        }
        XCTAssertNil(AvatarHeading.facing([0,.nan,0]));XCTAssertNil(AvatarHeading.facing([.infinity,0,1]))
    }
    @MainActor func testAuthoredMotionsMatchEveryRealRigAndAnimateWithoutChangingBoneLengths() throws {
        for profile in AvatarProfile.allCases {
            let rig=HumanoidRig();try rig.load(profile)
            let model=try XCTUnwrap(rig.models.first),motion=try AvatarMotionLibrary(profile:profile,joints:model.jointNames)
            var pose=model.jointTransforms
            for name in ["idle","walk","wave","interact"] {
                let clip=try XCTUnwrap(motion.clips[name]);XCTAssertGreaterThan(clip.frames.count,20)
                let start=clip.frames[0]
                let pairs=profile.isHuman ? [("UpperLeg_L","LowerLeg_L"),("LowerLeg_L","Foot_L"),("UpperArm_R","LowerArm_R"),("LowerArm_R","Wrist_R")] : [("BackUpperLeg_L","BackLowerLeg_L"),("BackLowerLeg_L","IKBackLeg_L")]
                let initial=globalPose(start,names:model.jointNames)
                for frame in clip.frames {
                    for b in frame {XCTAssertEqual(simd_length(b.rotation.vector),1,accuracy:0.0001);XCTAssertEqual(b.scale,SIMD3<Float>.one)}
                    let actual=globalPose(frame,names:model.jointNames)
                    for (a,b) in pairs {
                        let from=try XCTUnwrap(model.jointNames.firstIndex {$0.split(separator:"/").last.map(String.init)==a})
                        let to=try XCTUnwrap(model.jointNames.firstIndex {$0.split(separator:"/").last.map(String.init)==b})
                        XCTAssertEqual(simd_distance(initial[from],initial[to]),simd_distance(actual[from],actual[to]),accuracy:0.003)
                    }
                }
                motion.sample(name,time:clip.duration*0.5,into:&pose)
                XCTAssertTrue(zip(start,pose).contains {abs(simd_dot($0.rotation.vector,$1.rotation.vector))<0.99999})
            }
        }
    }
    @MainActor func testWalkingCadenceKeepsStanceFeetFromSlidingAtActualTravelSpeed() throws {
        for profile in AvatarProfile.allCases {
            let rig=HumanoidRig();try rig.load(profile);rig.walkAmount=1
            let model=try XCTUnwrap(rig.models.first),names=model.jointNames
            let footName=profile.isHuman ? "Foot_L" : "IKFrontLeg_L"
            let foot=try XCTUnwrap(names.firstIndex {$0.split(separator:"/").last.map(String.init)==footName})
            let library=try AvatarMotionLibrary(profile:profile,joints:names),clip=try XCTUnwrap(library.clips["walk"])
            let ground=try XCTUnwrap(clip.frames.map {globalPose($0,names:names)[foot].y}.min())+0.025
            var previous=globalPose(model.jointTransforms,names:names)[foot],previousWorld=model.convert(position:previous,to:nil),residual:[Float]=[]
            for step in 0..<360 {
                rig.root.position.z += AvatarMotion.speed/30;rig.update(delta:1.0/30)
                let local=globalPose(model.jointTransforms,names:names)[foot],world=model.convert(position:local,to:nil)
                if step>60,local.y<ground,previous.y<ground,local.z<previous.z {residual.append(abs(world.z-previousWorld.z)*30)}
                previous=local;previousWorld=world
            }
            XCTAssertGreaterThan(residual.count,10)
            residual.sort();if !residual.isEmpty {XCTAssertLessThan(residual[residual.count/2],0.1,"Stance foot should remain nearly still while the avatar advances: \(profile)")}
        }
    }
    @MainActor func testCrossfadesKeepIndependentFeetAttachedThroughoutTransitions() throws {
        for profile in AvatarProfile.allCases {
            let rig=HumanoidRig();try rig.load(profile)
            let model=try XCTUnwrap(rig.models.first),names=model.jointNames
            let shinName=profile.isHuman ? "LowerLeg_L" : "BackLowerLeg_L",footName=profile.isHuman ? "Foot_L" : "IKBackLeg_L"
            let shin=try XCTUnwrap(names.firstIndex {$0.split(separator:"/").last.map(String.init)==shinName})
            let foot=try XCTUnwrap(names.firstIndex {$0.split(separator:"/").last.map(String.init)==footName})
            let before=globalPose(model.jointTransforms,names:names),length=simd_distance(before[shin],before[foot])
            for step in 0..<150 {
                rig.walkAmount=step<50 ? 1 : 0
                if step==50 {rig.play("wave")}
                if step==100 {rig.stop();rig.seated=profile.isHuman}
                rig.update(delta:1.0/30)
                let actual=globalPose(model.jointTransforms,names:names)
                XCTAssertEqual(simd_distance(actual[shin],actual[foot]),length,accuracy:0.003)
            }
        }
    }
    @MainActor func testSeatedOverlayKeepsIndependentFeetAttachedToShins() throws {
        for profile in [AvatarProfile.man,.woman] {
            let rig=HumanoidRig();try rig.load(profile)
            let model=try XCTUnwrap(rig.models.first),names=model.jointNames
            let shin=try XCTUnwrap(names.firstIndex {$0.split(separator:"/").last=="LowerLeg_L"})
            let foot=try XCTUnwrap(names.firstIndex {$0.split(separator:"/").last=="Foot_L"})
            let before=globalPose(model.jointTransforms,names:names);rig.seated=true
            for _ in 0..<30 {rig.update(delta:1.0/30)}
            let after=globalPose(model.jointTransforms,names:names)
            XCTAssertEqual(simd_distance(before[shin],before[foot]),simd_distance(after[shin],after[foot]),accuracy:0.003)
        }
    }
    private func globalPose(_ pose:[Transform],names:[String])->[SIMD3<Float>] {
        var global=Array(repeating:matrix_identity_float4x4,count:names.count)
        for i in names.indices {
            let parent=names[i].split(separator:"/").dropLast().joined(separator:"/")
            global[i]=(names.firstIndex(of:parent).map {global[$0]} ?? matrix_identity_float4x4)*pose[i].matrix
        }
        return global.map {let p=$0.columns.3;return SIMD3<Float>(p.x,p.y,p.z)}
    }

}

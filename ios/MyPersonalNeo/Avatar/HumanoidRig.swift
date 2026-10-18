import Foundation
import RealityKit
import simd
import Combine

@MainActor
final class HumanoidRig {
    let root = Entity()
    private(set) var models: [ModelEntity] = []
    private var jointIndex: [String:Int] = [:]
    private var animatedModels: [ModelEntity] = []
    private var globalPose: [simd_float4x4] = []
    private var bindGlobal:[simd_float4x4]=[]
    private var footChains:[(Int,Int)]=[]
    private var names: [String] = []
    private var parents: [Int?] = []
    private var rest: [Transform] = []
    private var pose: [Transform] = []
    private var relaxed: [Transform] = []
    private var motion:AvatarMotionLibrary?
    private var walkingPose:[Transform]=[]
    private var previousPose:[Transform]=[]
    private var poseMode="idle"
    private var blendTime:Float=1
    private var walkTime:Float=0
    private(set) var profile: AvatarProfile?
    var walkAmount: Float = 0
    var gaze: SIMD3<Float>?
    private var time: Float = 0
    private var smoothedTarget: SIMD3<Float>?
    private(set) var seatedHipHeight: Float = 0.80
    private var demo: String?
    private var demoStarted: Float = 0
    var seated = false
    var talking = false
    var target: SIMD3<Float>?
    var rightHand = true
    var isLoaded: Bool { !rest.isEmpty }
    func load(_ profile: AvatarProfile = .woman) throws {
        guard let url = Bundle.main.url(forResource: profile.resource, withExtension: "usdz") else { throw NeoFailure("Modello umanoide assente dal bundle.") }
        let entity = try Entity.load(contentsOf: url)
        try install(entity, profile: profile)
    }
    func loadAsync(_ profile: AvatarProfile = .woman) async throws {
        guard let url = Bundle.main.url(forResource: profile.resource, withExtension: "usdz") else { throw NeoFailure("Modello umanoide assente dal bundle.") }
        guard let entity = try await Entity.loadAsync(contentsOf: url).values.first(where: { _ in true }) else { throw NeoFailure("Caricamento avatar interrotto.") }
        try Task.checkCancellation()
        try install(entity, profile: profile)
    }
    private func install(_ entity: Entity, profile: AvatarProfile) throws {
        var importedModels: [ModelEntity] = []
        func collect(_ node: Entity) {
            if let model = node as? ModelEntity, !model.jointNames.isEmpty { importedModels.append(model) }
            node.children.forEach { collect($0) }
        }
        collect(entity)
        guard let first = importedModels.first, first.jointNames.count >= 20, first.jointTransforms.count == first.jointNames.count else { throw NeoFailure("Scheletro umanoide non disponibile.") }
        let loadedMotion=try AvatarMotionLibrary(profile:profile,joints:first.jointNames,bindPose:first.jointTransforms)
        models=importedModels;root.children.removeAll();root.addChild(entity);self.profile=profile
        names = first.jointNames; rest = first.jointTransforms; pose = rest
        let importedNames=Dictionary(uniqueKeysWithValues:names.enumerated().map { ($0.element.split(separator:"/").last.map(String.init) ?? $0.element,$0.offset) })
        jointIndex=importedNames
        for (semantic, source) in profile.isHuman ? Self.humanAliases : Self.dogAliases { jointIndex[semantic]=importedNames[source] }
        let footNames=profile.isHuman ? [("shinL","footL"),("shinR","footR")] : [("BackLowerLeg_L","IKBackLeg_L"),("BackLowerLeg_R","IKBackLeg_R"),("FrontLowerLeg_L","IKFrontLeg_L"),("FrontLowerLeg_R","IKFrontLeg_R")]
        footChains=footNames.compactMap {a,b in guard let shin=jointIndex[a],let foot=jointIndex[b] else {return nil};return (shin,foot)}
        animatedModels=models.filter { $0.jointNames == names }
        globalPose=Array(repeating: matrix_identity_float4x4, count: names.count)
        parents = names.map { name in
            let parts = name.split(separator: "/").dropLast()
            return parts.isEmpty ? nil : names.firstIndex(of: parts.joined(separator: "/"))
        }
        updateHierarchy();bindGlobal=globalPose
        if let hip = index("thighL") { seatedHipHeight = globalPose[hip].columns.3.y - 0.04 }
        motion=loadedMotion
        relaxed=rest;motion?.sample("idle",time:0,into:&relaxed)
        pose=relaxed;walkingPose=relaxed;previousPose=relaxed;time=0;walkTime=0;walkAmount=0;gaze=nil;talking=false;poseMode="idle";blendTime=1;stop()
        stabilizeFeet();applyPose()
    }
    func play(_ name: String) { demo = name; demoStarted = time; seated = false; target = nil }
    func stop(stand: Bool = true) { demo = nil; target = nil; smoothedTarget = nil; if stand { seated = false } }
    private static let humanAliases=["thighL":"UpperLeg_L","thighR":"UpperLeg_R","shinL":"LowerLeg_L","shinR":"LowerLeg_R","footL":"Foot_L","footR":"Foot_R","spine002":"Torso","spine003":"Chest","head":"Head","upper_armL":"UpperArm_L","upper_armR":"UpperArm_R","forearmL":"LowerArm_L","forearmR":"LowerArm_R","handL":"Wrist_L","handR":"Wrist_R","f_index02L":"Index3_L","f_index02R":"Index3_R"]
    private static let dogAliases=["head":"Head","spine003":"Torso3","spine002":"Torso2","thighL":"BackUpperLeg_L","thighR":"BackUpperLeg_R","shinL":"BackLowerLeg_L","shinR":"BackLowerLeg_R"]
    private func index(_ suffix: String) -> Int? {
        jointIndex[suffix]
    }
    private func rotate(_ name: String, angle: Float, axis: SIMD3<Float> = [1,0,0]) {
        guard let i = index(name) else { return }
        guard angle.isFinite else { return }
        pose[i].rotation = safe(pose[i].rotation * simd_quatf(angle: angle, axis: axis), fallback:pose[i].rotation)
    }
    private func updateHierarchy() {
        for i in pose.indices { globalPose[i] = (parents[i].map { globalPose[$0] } ?? matrix_identity_float4x4) * pose[i].matrix }
    }
    private func finite(_ value: SIMD3<Float>) -> Bool { value.x.isFinite && value.y.isFinite && value.z.isFinite }
    private func safe(_ value: simd_quatf, fallback: simd_quatf) -> simd_quatf {
        let v=value.vector
        guard v.x.isFinite, v.y.isFinite, v.z.isFinite, v.w.isFinite, simd_length_squared(v).isFinite, simd_length_squared(v)>0.000001 else { return fallback }
        return simd_normalize(value)
    }
    private func applyPose() {
        for model in animatedModels { model.jointTransforms = pose }
    }
    private func reach(world: SIMD3<Float>, right: Bool) {
        let side = right ? "R" : "L"
        guard let tip = index("f_index02" + side), let first = models.first else { return }
        guard finite(world) else { return }
        let target = first.convert(position: world, from: nil)
        guard finite(target) else { return }
        updateHierarchy()
        guard let shoulder=index("upper_arm"+side) else {return}
        let s=globalPose[shoulder].columns.3,origin=SIMD3<Float>(s.x,s.y,s.z)
        guard target.z>origin.z-0.1,simd_distance(target,origin)<0.65 else {return}
        // Six bounded CCD steps, using one reusable hierarchy buffer.
        for _ in 0..<2 {
            for name in ["hand", "forearm", "upper_arm"] {
                guard let joint = index(name + side) else { continue }
                updateHierarchy()
                let origin = SIMD3<Float>(globalPose[joint].columns.3.x, globalPose[joint].columns.3.y, globalPose[joint].columns.3.z)
                let end = SIMD3<Float>(globalPose[tip].columns.3.x, globalPose[tip].columns.3.y, globalPose[tip].columns.3.z)
                guard simd_length(end - origin) > 0.001, simd_length(target - origin) > 0.001 else { continue }
                let delta = simd_quatf(from: simd_normalize(end-origin), to: simd_normalize(target-origin))
                let parent = parents[joint].map { Transform(matrix: globalPose[$0]).rotation } ?? simd_quatf(angle: 0, axis: [0,1,0])
                let limited = simd_slerp(simd_quatf(angle: 0, axis: [0,1,0]), delta, 0.45)
                pose[joint].rotation = safe(parent.inverse * limited * parent * pose[joint].rotation, fallback:pose[joint].rotation)
            }
        }
    }
    private func stabilizeFeet() {
        // Independent foot controls must stay attached to the shin endpoints even
        // while interpolating between clips. Otherwise a crossfade stretches ankles.
        updateHierarchy()
        for (shin,foot) in footChains {
            let a=bindGlobal[shin].columns.3,b=bindGlobal[foot].columns.3
            let endpoint=globalPose[shin]*SIMD4<Float>(b.x-a.x,b.y-a.y,b.z-a.z,1)
            var footWorld=globalPose[foot];footWorld.columns.3=endpoint
            pose[foot]=Transform(matrix:(parents[foot].map {simd_inverse(globalPose[$0])} ?? matrix_identity_float4x4)*footWorld)
        }
    }
    func update(delta: Float, spatialTracking: Bool = true) {
        guard delta.isFinite, delta>0 else { return }
        let elapsed=min(0.05,delta),walking=spatialTracking && walkAmount.isFinite ? max(0,min(1,walkAmount)) : 0
        time += elapsed
        guard !pose.isEmpty,let motion else {return}
        let demoTime=time-demoStarted
        if let demo, demoTime>(demo.hasPrefix("judo") ? 6 : (motion.clips[demo == "wave" ? "wave" : "interact"]?.duration ?? 2)) {self.demo=nil}
        let mode=seated ? "seated" : (demo ?? (walking>0.03 ? "walk" : talking ? "talk" : "idle"))
        if mode != poseMode {previousPose=pose;blendTime=0;poseMode=mode}
        motion.sample("idle",time:time,into:&pose)
        if walking>0.001 {
            walkTime += elapsed*AvatarMotion.speed/motion.walkSpeed
            motion.sample("walk",time:walkTime,into:&walkingPose)
            for i in pose.indices {pose[i]=AvatarMotionLibrary.blend(pose[i],walkingPose[i],min(1,walking*1.8))}
        }
        if !seated, let demo {
            motion.sample(demo == "wave" ? "wave" : "interact",time:demoTime,loop:demo.hasPrefix("judo"),into:&pose)
            // Martial arts remain small illustrative local gestures, never physical instruction.
            if demo == "judo_rei" {rotate("spine003",angle:-sin(min(demoTime/6,1) * .pi)*0.18)}
        } else if talking,walking<0.03,!seated {
            motion.sample("interact",time:time,into:&walkingPose)
            for i in pose.indices {pose[i]=AvatarMotionLibrary.blend(pose[i],walkingPose[i],0.3)}
        }
        if seated,profile?.isHuman != false {
            rotate("thighL",angle:-1.35);rotate("thighR",angle:-1.35)
            rotate("shinL",angle:1.3);rotate("shinR",angle:1.3)
            rotate("forearmL",angle:-0.4);rotate("forearmR",angle:-0.4)
        }
        if spatialTracking, let gaze, finite(gaze), let head = index("head"), let model = models.first {
            let local = model.convert(position: gaze, from: nil)
            updateHierarchy()
            let p = globalPose[head].columns.3, direction = local - SIMD3<Float>(p.x,p.y,p.z)
            let yaw = max(-0.3,min(0.3,atan2(direction.x,max(0.1,direction.z))))
            let pitch = max(-0.15,min(0.15,-atan2(direction.y,max(0.1,simd_length(SIMD2<Float>(direction.x,direction.z))))))
            let parent=parents[head].map {Transform(matrix:globalPose[$0]).rotation} ?? simd_quatf()
            let overlay=simd_quatf(angle:yaw,axis:[0,1,0])*simd_quatf(angle:pitch,axis:[1,0,0])
            pose[head].rotation=safe(parent.inverse*overlay*parent*pose[head].rotation,fallback:pose[head].rotation)
        }
        if spatialTracking, profile?.isHuman != false, let target, finite(target) {
            let start = smoothedTarget ?? target
            let point = start + (target-start) * min(1,elapsed*14)
            smoothedTarget = point
            reach(world: point, right: rightHand)
        } else { smoothedTarget = nil }
        blendTime=min(1,blendTime+elapsed/0.25)
        if blendTime<1 {for i in pose.indices {pose[i]=AvatarMotionLibrary.blend(previousPose[i],pose[i],blendTime)}}
        stabilizeFeet()
        applyPose()
    }
}

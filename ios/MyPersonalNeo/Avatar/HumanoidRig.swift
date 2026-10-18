import Foundation
import RealityKit
import simd

@MainActor
final class HumanoidRig {
    let root = Entity()
    private(set) var models: [ModelEntity] = []
    private var names: [String] = []
    private var parents: [Int?] = []
    private var rest: [Transform] = []
    private var pose: [Transform] = []
    private var relaxed: [Transform] = []
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
    func load(_ profile: AvatarProfile = .sofia) throws {
        guard let url = Bundle.main.url(forResource: profile.resource, withExtension: "usdz") else { throw NeoFailure("Modello umanoide assente dal bundle.") }
        let entity = try Entity.load(contentsOf: url)
        models.removeAll(); root.children.removeAll(); root.addChild(entity); self.profile = profile
        func collect(_ node: Entity) {
            if let model = node as? ModelEntity, !model.jointNames.isEmpty { models.append(model) }
            node.children.forEach { collect($0) }
        }
        collect(entity)
        guard let first = models.first, first.jointNames.count >= 70, first.jointTransforms.count == first.jointNames.count else { throw NeoFailure("Scheletro umanoide non disponibile.") }
        names = first.jointNames; rest = first.jointTransforms; pose = rest
        parents = names.map { name in
            let parts = name.split(separator: "/").dropLast()
            return parts.isEmpty ? nil : names.firstIndex(of: parts.joined(separator: "/"))
        }
        if let hip = index("thighL") { seatedHipHeight = matrices()[hip].columns.3.y - 0.04 }
        relaxed = rest
        for side in ["L", "R"] {
            if let arm = index("upper_arm" + side), let elbow = index("forearm" + side) {
                relaxed[arm].rotation = simd_quatf(from: simd_normalize(rest[elbow].translation), to: [0,-1,0])
            }
        }
        pose = relaxed; stop()
    }
    func play(_ name: String) { demo = name; demoStarted = time; seated = false; target = nil }
    func stop(stand: Bool = true) { demo = nil; target = nil; smoothedTarget = nil; if stand { seated = false } }
    private func index(_ suffix: String) -> Int? {
        let map = ["thighL":"Bip01_L_Thigh", "thighR":"Bip01_R_Thigh", "shinL":"Bip01_L_Calf", "shinR":"Bip01_R_Calf", "footL":"Bip01_L_Foot", "footR":"Bip01_R_Foot", "spine002":"Bip01_Spine1", "spine003":"Bip01_Spine2", "head":"Bip01_Head", "jaw":"Bip01_MJaw", "upper_armL":"Bip01_L_UpperArm", "upper_armR":"Bip01_R_UpperArm", "forearmL":"Bip01_L_Forearm", "forearmR":"Bip01_R_Forearm", "handL":"Bip01_L_Hand", "handR":"Bip01_R_Hand", "f_index02L":"Bip01_L_Finger12", "f_index02R":"Bip01_R_Finger12"]
        let key = map[suffix] ?? suffix
        return names.firstIndex { $0.split(separator:"/").last.map(String.init) == key }
    }
    private func rotate(_ name: String, angle: Float, axis: SIMD3<Float> = [1,0,0]) {
        guard let i = index(name) else { return }
        pose[i].rotation = relaxed[i].rotation * simd_quatf(angle: angle, axis: axis)
    }
    private func matrices() -> [simd_float4x4] {
        var values = Array(repeating: matrix_identity_float4x4, count: pose.count)
        for i in pose.indices { values[i] = (parents[i].map { values[$0] } ?? matrix_identity_float4x4) * pose[i].matrix }
        return values
    }
    private func reach(world: SIMD3<Float>, right: Bool) {
        let side = right ? "R" : "L"
        guard let tip = index("f_index02" + side), let first = models.first else { return }
        let target = first.convert(position: world, from: nil)
        for _ in 0..<5 {
            for name in ["hand", "forearm", "upper_arm"] {
                guard let joint = index(name + side) else { continue }
                let globals = matrices(), origin = SIMD3<Float>(globals[joint].columns.3.x, globals[joint].columns.3.y, globals[joint].columns.3.z)
                let end = SIMD3<Float>(globals[tip].columns.3.x, globals[tip].columns.3.y, globals[tip].columns.3.z)
                guard simd_length(end - origin) > 0.001, simd_length(target - origin) > 0.001 else { continue }
                let delta = simd_quatf(from: simd_normalize(end-origin), to: simd_normalize(target-origin))
                let parent = parents[joint].map { Transform(matrix: globals[$0]).rotation } ?? simd_quatf(angle: 0, axis: [0,1,0])
                let limited = simd_slerp(simd_quatf(angle: 0, axis: [0,1,0]), delta, 0.45)
                pose[joint].rotation = simd_normalize(parent.inverse * limited * parent * pose[joint].rotation)
            }
        }
    }
    func update(delta: Float) {
        time += min(0.05, delta); pose = relaxed
        guard !pose.isEmpty else { return }
        if seated {
            rotate("thighL", angle: -1.35); rotate("thighR", angle: -1.35)
            rotate("shinL", angle: 1.30); rotate("shinR", angle: 1.30)
            rotate("forearmL", angle: -0.6); rotate("forearmR", angle: -0.6)
        } else {
            rotate("spine003", angle: sin(time * 1.4) * 0.012)
            if talking {
                rotate("forearmR", angle: sin(time * 2) * 0.12 - 0.18)
                rotate("jaw", angle: max(0,sin(time*13)) * 0.045)
            }
            let stride = sin(time * 6.5) * min(1,walkAmount)
            rotate("thighL", angle: stride * 0.36); rotate("thighR", angle: -stride * 0.36)
            rotate("shinL", angle: max(0,-stride) * 0.5); rotate("shinR", angle: max(0,stride) * 0.5)
            if walkAmount > 0.05 { rotate("forearmL", angle: -stride*0.18-0.10); rotate("forearmR", angle: stride*0.18-0.10) }
        }
        if let name = demo {
            let t = time - demoStarted
            switch name {
            case "judo_rei": rotate("spine003", angle: -sin(min(t/6,1) * .pi) * 0.38); if t > 6 { demo = nil }
            case "judo_tai_sabaki":
                let phase = sin(min(t/9,1) * .pi * 2)
                rotate("thighL", angle: phase * 0.12); rotate("thighR", angle: -phase * 0.12)
                rotate("shinL", angle: abs(phase) * 0.1); rotate("shinR", angle: abs(phase) * 0.1)
                rotate("spine002", angle: phase * 0.3, axis: [0,1,0]); if t > 9 { demo = nil }
            case "wave": rotate("upper_armR", angle: -0.85, axis: [0,0,1]); rotate("forearmR", angle: sin(t*5)*0.35-0.5); if t > 4 { demo = nil }
            default: rotate("forearmR", angle: sin(t*2)*0.2-0.3); if t > 5 { demo = nil }
            }
        }
        if let gaze, let head = index("head"), let model = models.first {
            let local = model.convert(position: gaze, from: nil), globals = matrices()
            let p = globals[head].columns.3, direction = local - SIMD3<Float>(p.x,p.y,p.z)
            let yaw = max(-0.7,min(0.7,atan2(direction.x,direction.z)))
            let pitch = max(-0.3,min(0.3,-atan2(direction.y,max(0.1,simd_length(SIMD2<Float>(direction.x,direction.z))))))
            pose[head].rotation = simd_quatf(angle:yaw,axis:[0,1,0]) * simd_quatf(angle:pitch,axis:[1,0,0])
        }
        if let target {
            let start = smoothedTarget ?? target
            let point = start + (target-start) * min(1,delta*14)
            smoothedTarget = point
            reach(world: point, right: rightHand)
        } else { smoothedTarget = nil }
        for model in models where model.jointNames == names { model.jointTransforms = pose }
    }
}

import Foundation
import RealityKit
import simd

/// Pre-baked authored CC0 motion, retargeted offline to the exact bundled USD bind.
/// Frame sampling never changes scale or bone length, and never imports a model.
struct AvatarMotionLibrary {
    struct Clip { let duration:Float; let frames:[[Transform]] }
    let clips:[String:Clip]
    let walkSpeed:Float
    let walkGround:[String:Float]
    private struct File:Decodable {
        struct RawClip:Decodable {let duration:Float;let frames:[[Float]]}
        let version:Int;let walkSpeed:Float;let walkGround:[String:Float];let joints:[String];let bindTranslations:[Float];let clips:[String:RawClip]
    }
    init(profile:AvatarProfile,joints:[String],bindPose:[Transform]? = nil) throws {
        guard let url=Bundle.main.url(forResource:profile.resource+".motion",withExtension:"json") else {throw NeoFailure("Animazioni del compagno assenti.")}
        let file=try JSONDecoder().decode(File.self,from:Data(contentsOf:url))
        guard file.version==1, Set(file.joints)==Set(joints),file.joints.count==joints.count else {throw NeoFailure("Animazione e scheletro non corrispondono.")}
        let indices=try joints.map { name -> Int in guard let i=file.joints.firstIndex(of:name) else {throw NeoFailure("Articolazione assente.")};return i }
        guard file.bindTranslations.count==joints.count*3 else {throw NeoFailure("Firma del rig assente.")}
        if let bindPose {
            guard bindPose.count==joints.count else {throw NeoFailure("Rig incompleto.")}
            for (i,j) in indices.enumerated() {
                let p=SIMD3<Float>(file.bindTranslations[j*3],file.bindTranslations[j*3+1],file.bindTranslations[j*3+2])
                guard simd_distance(p,bindPose[i].translation)<0.001 else {throw NeoFailure("Animazione non allineata al modello. Rig rifiutato prima del posizionamento.")}
            }
        }
        var clips:[String:Clip]=[:]
        for (name,raw) in file.clips {
            guard raw.duration.isFinite,raw.duration>0,raw.frames.count>=2,raw.frames.count<=240 else {throw NeoFailure("Durata animazione non valida.")}
            let frames=try raw.frames.map { frame -> [Transform] in
                guard frame.count==joints.count*7,frame.allSatisfy(\.isFinite) else {throw NeoFailure("Campioni animazione non validi.")}
                return try indices.map { i in
                    let offset=i*7, q=SIMD4<Float>(frame[offset+3],frame[offset+4],frame[offset+5],frame[offset+6])
                    guard abs(simd_length(q)-1)<0.001 else {throw NeoFailure("Rotazione animazione non valida.")}
                    return Transform(scale:.one,rotation:simd_normalize(simd_quatf(vector:q)),translation:[frame[offset],frame[offset+1],frame[offset+2]])
                }
            }
            clips[name]=Clip(duration:raw.duration,frames:frames)
        }
        guard ["idle","walk","wave","interact"].allSatisfy({clips[$0] != nil}) else {throw NeoFailure("Animazioni essenziali mancanti.")}
        guard file.walkSpeed.isFinite,(0.1...3).contains(file.walkSpeed) else {throw NeoFailure("Cadenza animazione non valida.")}
        self.walkSpeed=file.walkSpeed;self.walkGround=file.walkGround;self.clips=clips
    }
    func sample(_ name:String,time:Float,loop:Bool=true,into pose:inout [Transform]) {
        guard let clip=clips[name],time.isFinite else {return}
        let t=loop ? max(0,time).truncatingRemainder(dividingBy:clip.duration) : max(0,min(time,clip.duration))
        let frame=t/clip.duration*Float(clip.frames.count-1),a=min(Int(frame),clip.frames.count-1),b=min(a+1,clip.frames.count-1),u=frame-Float(a)
        if pose.count != clip.frames[a].count {pose=clip.frames[a]}
        for i in pose.indices {pose[i]=Self.blend(clip.frames[a][i],clip.frames[b][i],u)}
    }
    static func blend(_ a:Transform,_ b:Transform,_ amount:Float)->Transform {
        let t=max(0,min(1,amount))
        return Transform(scale:.one,rotation:simd_slerp(a.rotation,b.rotation,t),translation:a.translation+(b.translation-a.translation)*t)
    }
}

/// A heading has one degree of freedom. A from/to quaternion at exactly 180° can
/// choose a horizontal axis and turn the whole avatar upside down.
enum AvatarHeading {
    static func facing(_ direction:SIMD3<Float>) -> simd_quatf? {
        guard direction.x.isFinite,direction.z.isFinite,simd_length(SIMD2<Float>(direction.x,direction.z))>0.05 else {return nil}
        return simd_quatf(angle:atan2(direction.x,direction.z),axis:[0,1,0])
    }
}

import Foundation
import simd

/// Setup precedes the experience. Readiness is measured, never a fixed timer.
struct GuidedRoomSetup {
    enum Stage {case inactive,findFloor,holdStill,ready,retry,placed}
    private(set) var stage:Stage = .inactive
    private(set) var position:SIMD3<Float>?
    private var candidate:SIMD3<Float>?
    private var stableSince:Double?
    private(set) var progress:Double=0
    private var halfExtent:Float=0.3
    var isVisible:Bool {stage != .inactive && stage != .placed}
    var canPlace:Bool {stage == .ready && position != nil}
    var message:String {
        switch stage {
        case .inactive:return "Prepara la stanza"
        case .findFloor:return "Inquadra il pavimento a circa un metro e mezzo. Muovi lentamente il telefono a destra e a sinistra, restando fermo."
        case .holdStill:return "Superficie trovata. Mantieni l’inquadratura per verificare l’appoggio."
        case .ready:return "Pavimento stabile e spazio d’appoggio rilevato. Puoi inserire NEO davanti a te."
        case .retry:return "Non ho ancora un appoggio affidabile. Migliora la luce e inquadra una zona di pavimento libera."
        case .placed:return "NEO è nella stanza"
        }
    }
    mutating func start(halfExtent:Float=0.3) {self=GuidedRoomSetup();self.halfExtent=halfExtent;stage = .findFloor}
    mutating func expire() {guard isVisible else {return};stage = .retry;position=nil;progress=0;stableSince=nil;candidate=nil}
    mutating func stop() {self=GuidedRoomSetup()}
    mutating func complete() {guard canPlace else {return};stage = .placed}
    mutating func observe(now:Double,tracking:Bool,camera:SIMD3<Float>,forward:SIMD3<Float>,planes:[ScenePlaneSnapshot]) {
        guard isVisible,stage != .retry,now.isFinite else {return}
        guard tracking,let point=Self.support(camera:camera,forward:forward,planes:planes,halfExtent:halfExtent) else {
            stage = .findFloor;position=nil;candidate=nil;stableSince=nil;progress=0;return
        }
        if let candidate,abs(candidate.y-point.y)<0.02,simd_distance(candidate,point)<0.12 {
            progress=min(1,max(0,(now-(stableSince ?? now))/1.5))
        } else {candidate=point;stableSince=now;progress=0}
        stage=progress>=1 ? .ready : .holdStill
        position=progress>=1 ? point : nil
    }
    static func support(camera:SIMD3<Float>,forward:SIMD3<Float>,planes:[ScenePlaneSnapshot],halfExtent:Float=0.3) -> SIMD3<Float>? {
        guard camera.x.isFinite,camera.y.isFinite,camera.z.isFinite,
              forward.x.isFinite,forward.z.isFinite else {return nil}
        let flat=SIMD3<Float>(forward.x,0,forward.z)
        guard simd_length(flat)>0.15 else {return nil}
        let desired=camera+simd_normalize(flat)*1.3
        // Require the centre and an entire 60 cm footprint inside one measured polygon.
        // Tables, seats and ceilings explicitly classified by ARKit never count as floor.
        let candidates=planes.filter {$0.isHorizontal && $0.kind != .other}.compactMap { plane -> (SIMD3<Float>,Bool)? in
            guard plane.transform.columns.1.y>0.97,
                  let centre=plane.intersection(origin:desired,direction:[0,-1,0],maxDistance:2.3),
                  (0.8...2.2).contains(camera.y-centre.y) else {return nil}
            let offsets:[Float]=[-halfExtent,0,halfExtent]
            for x in offsets {for z in offsets {
                guard let foot=plane.intersection(origin:centre+[x,0.3,z],direction:[0,-1,0],maxDistance:0.4),abs(foot.y-centre.y)<0.025 else {return nil}
            }}
            guard !Self.obstructed(at:centre,planes:planes,radius:halfExtent) else {return nil}
            return (centre,plane.kind == .floor)
        }
        return candidates.sorted {a,b in a.1 != b.1 ? a.1 : a.0.y<b.0.y}.first?.0
    }
    static func obstructed(at point:SIMD3<Float>,planes:[ScenePlaneSnapshot],radius:Float=0.22)->Bool {
        for plane in planes {
            let local=simd_inverse(plane.transform)*SIMD4<Float>(point.x,point.y+0.85,point.z,1)
            let centre=plane.transform*SIMD4<Float>(plane.center,1)
            if plane.isHorizontal {
                if centre.y>point.y+0.15,centre.y<point.y+1.8,
                   abs(local.x-plane.center.x)<plane.extent.x/2+radius,
                   abs(local.z-plane.center.z)<plane.extent.y/2+radius {return true}
            } else if abs(local.y-plane.center.y)<radius,
                      abs(local.x-plane.center.x)<plane.extent.x/2+radius,
                      abs(local.z-plane.center.z)<plane.extent.y/2+0.85 {return true}
        }
        return false
    }

}

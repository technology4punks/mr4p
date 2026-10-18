import Foundation

enum AvatarProfile: String, CaseIterable, Identifiable {
    case woman, man, dog
    var id: String { rawValue }
    var title: String { switch self {case .woman:return "Donna";case .man:return "Uomo";case .dog:return "Cane"} }
    var resource: String { "Neo" + rawValue.capitalized }
    var isHuman: Bool { self != .dog }
    var expectedJoints: Int { self == .dog ? 46 : 62 }
}

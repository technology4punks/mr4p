import Foundation

enum AvatarProfile: String, CaseIterable, Identifiable {
    case sofia, luca, elena
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var resource: String { "Neo" + title }
    var sourceName: String {
        switch self { case .sofia: return "Female_Adult_01"; case .luca: return "Male_Adult_01"; case .elena: return "Female_Adult_02" }
    }
}

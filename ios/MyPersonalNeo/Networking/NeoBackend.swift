import Foundation

struct NeoSource: Codable, Identifiable {
    let title: String
    let url: String
    var id: String { url }
    var safeURL: URL? { guard let u = URL(string: url), u.scheme == "https", u.user == nil, u.password == nil else { return nil }; return u }
}
struct KnowledgeReply: Codable {
    let text: String
    let sources: [NeoSource]
    let searched: Bool
    let objects: [SceneObservation]?
}
struct VoiceToken: Decodable { let value: String; let expires_at: Double }
struct BackendFailure: Decodable { let error: String }
struct NeoFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
    init(_ message: String) { self.message = message }
}
struct NeoBackend {
    let baseURL: URL
    init(baseURL: URL = URL(string: "https://neo-mr-avatar-test.sk1kko.chatgpt.site")!) { self.baseURL = baseURL }
    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.timeoutInterval = 50
        request.setValue(baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")), forHTTPHeaderField: "Origin")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw NeoFailure((try? JSONDecoder().decode(BackendFailure.self, from: data).error) ?? "Servizio NEO non disponibile. Riprova.")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func token() async throws -> VoiceToken { try await post("api/personal-neo/token", body: [:]) }
    func look(question: String, jpeg: Data) async throws -> KnowledgeReply {
        try await post("api/personal-neo/knowledge", body: ["action": "look", "query": String(question.prefix(500)), "image": "data:image/jpeg;base64," + jpeg.base64EncodedString()])
    }
    func instructions(query: String) async throws -> KnowledgeReply {
        try await post("api/personal-neo/knowledge", body: ["action": "instructions", "query": String(query.prefix(500))])
    }
}

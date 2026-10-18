import SwiftUI
import RealityKit

struct ARSceneView: UIViewRepresentable {
    let room: RoomUnderstanding
    func makeUIView(context: Context) -> ARView { room.view }
    func updateUIView(_ uiView: ARView, context: Context) {}
}
struct NeoView: View {
    @EnvironmentObject private var neo: NeoSession
    @State private var menu = false
    @State private var search = ""
    private let mint = Color(red:0.52,green:0.92,blue:0.79)
    var body: some View {
        ZStack {
            ARSceneView(room:neo.room).ignoresSafeArea()
            if !neo.active {
                LinearGradient(colors:[Color(red:0.03,green:0.10,blue:0.13),Color.black],startPoint:.topLeading,endPoint:.bottomTrailing).ignoresSafeArea()
                VStack(alignment:.leading,spacing:24) {
                    Text("MY PERSONAL NEO").font(.caption.weight(.semibold)).tracking(4).foregroundStyle(mint)
                    Text("Il mondo reale.\nUna nuova\nintelligenza.").font(.system(size:44,weight:.light,design:.serif)).foregroundStyle(.white)
                    Text("Un compagno umanoide che unisce ciò che vede a ciò che la stanza misura.").font(.title3).foregroundStyle(.white.opacity(0.75))
                    HStack(spacing:12) { Image(systemName:"viewfinder");Text("ARKit · LiDAR quando disponibile · voce") }.font(.footnote).foregroundStyle(mint)
                    Button { Task { await neo.start() } } label: { Label("Entra con NEO",systemImage:"sparkles").frame(maxWidth:.infinity).padding(.vertical,10) }.buttonStyle(.borderedProminent).tint(mint).foregroundStyle(.black)
                    Text("La scansione resta sull’iPhone. Quando chiedi di osservare o attivi la modalità assistita, singoli fotogrammi vengono inviati a OpenAI; avviando la voce condividi l’audio della conversazione. Non salviamo foto o dialoghi nel nostro backend.").font(.caption).foregroundStyle(.white.opacity(0.58))
                    Text(neo.message).font(.footnote).foregroundStyle(mint)
                }.padding(30)
            } else {
                VStack(spacing:12) {
                    HStack(alignment:.top) {
                        VStack(alignment:.leading,spacing:5) {
                            Text("NEO").font(.headline).tracking(4)
                            Label(neo.room.trackingNormal ? "Spazio allineato" : "Tracking limitato",systemImage:neo.room.trackingNormal ? "checkmark.circle.fill" : "viewfinder").font(.caption).foregroundStyle(neo.room.trackingNormal ? mint : .orange)
                        }
                        Spacer()
                        Button {menu.toggle()} label:{Image(systemName:menu ? "xmark" : "ellipsis").frame(width:36,height:36)}.buttonStyle(.bordered).clipShape(Circle()).accessibilityLabel("Menu NEO")
                    }
                    if menu { controls }
                    Spacer()
                    if neo.calibrationStep>0 || neo.selectingSeat {
                        VStack(alignment:.leading,spacing:10) {
                            Text(neo.selectingSeat ? "SCEGLI LA SEDUTA" : "CALIBRAZIONE · \(neo.calibrationStep)/3").font(.caption.weight(.bold)).foregroundStyle(mint)
                            Text(neo.selectingSeat ? neo.message : neo.calibrationPrompt)
                            Button("Annulla selezione") {neo.cancelCalibration()}.font(.caption)
                        }.padding().background(.ultraThinMaterial,in:RoundedRectangle(cornerRadius:22))
                    }
                    VStack(alignment:.leading,spacing:10) {
                        HStack {
                            Circle().fill(neo.voice.state == .speaking ? .blue : neo.voice.state == .ready ? mint : .gray).frame(width:8,height:8)
                            Text(neo.voice.state.rawValue).font(.subheadline.weight(.medium))
                            Spacer()
                            if neo.busy {ProgressView().tint(mint)}
                            Button {neo.showDetails.toggle()} label:{Image(systemName:neo.showDetails ? "chevron.down" : "text.bubble")}.accessibilityLabel("Mostra osservazioni")
                        }
                        Text((neo.assistedObservation ? "◉ Assistita · " : "")+neo.message).font(.caption).foregroundStyle(.white.opacity(0.75)).lineLimit(3)
                        if !neo.voice.heard.isEmpty { Text("Tu: "+neo.voice.heard).font(.caption).foregroundStyle(mint).lineLimit(2) }
                        if !neo.voice.said.isEmpty { Text(neo.voice.said).font(.callout).lineLimit(3) }
                        HStack(spacing:10) {
                            Button {if neo.voice.state == .off || neo.voice.state == .error {neo.startVoice()}else{neo.voice.toggleMute()}} label:{Label(neo.voice.state == .off || neo.voice.state == .error ? "Avvia voce" : neo.voice.muted ? "Riattiva" : "Microfono",systemImage:neo.voice.muted ? "mic.slash" : "mic.fill").frame(maxWidth:.infinity)}.buttonStyle(.borderedProminent).tint(mint).foregroundStyle(.black)
                            Button {neo.look()} label:{Image(systemName:"viewfinder").padding(5)}.buttonStyle(.bordered).disabled(neo.busy || !neo.room.trackingNormal).accessibilityLabel("Osserva l’ambiente")
                            if neo.playing {Button {neo.stopPerformance()} label:{Image(systemName:"stop.fill")}.buttonStyle(.bordered).accessibilityLabel("Ferma musica")}
                        }
                    }.padding(18).background(.ultraThinMaterial,in:RoundedRectangle(cornerRadius:24))
                }.padding(18)
            }
        }
        .sheet(isPresented:$neo.showDetails) { observations }
    }
    private var controls: some View {
        VStack(alignment:.leading,spacing:12) {
            Text(neo.room.supportsLiDAR ? "LiDAR + ARKit · \(neo.room.meshCount) parti mesh" : "ARKit · LiDAR non disponibile").font(.caption).foregroundStyle(mint)
            Text("\(neo.room.planeCount) superfici misurate · la mesh non riconosce da sola ogni oggetto.").font(.caption)
            Toggle(isOn:Binding(get:{neo.assistedObservation},set:{neo.setAssistedObservation($0)})) {
                VStack(alignment:.leading) {Text("Osservazione assistita");Text("Invia un fotogramma a OpenAI ogni 15 s, solo con tracking stabile.").font(.caption2).foregroundStyle(.secondary)}
            }.tint(mint)
            Button("Calibra un pianoforte a 88 tasti") {do{try neo.beginPiano();menu=false}catch{neo.message=error.localizedDescription}}
            Button("Siediti su una superficie reale") {do{try neo.beginSeat();menu=false}catch{neo.message=error.localizedDescription}}
            if neo.pianoReady {
                Button("Suona una scala · audio sintetico") {do{try neo.playPiano("c_major");menu=false}catch{neo.message=error.localizedDescription}}
                Button("Suona Inno alla gioia") {do{try neo.playPiano("ode_to_joy");menu=false}catch{neo.message=error.localizedDescription}}
            }
            Button("Mostra un saluto di judo") {neo.demo("judo_rei");menu=false}
            Button("Ferma dimostrazione") {neo.stopPerformance();neo.room.rig.stop()}
            Button("Termina voce") {neo.voice.stop()}
            Button("Sospendi scansione") {neo.suspend();menu=false}
        }.font(.subheadline).padding(18).frame(maxWidth:.infinity,alignment:.leading).background(.ultraThinMaterial,in:RoundedRectangle(cornerRadius:22))
    }
    private var observations: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:22) {
                    Text("Geometria + significato").font(.largeTitle.weight(.light)).fontDesign(.serif)
                    Text(neo.answer.isEmpty ? "Chiedi a NEO cosa vede. Un fotogramma viene analizzato soltanto su richiesta." : neo.answer).textSelection(.enabled)
                    ForEach(neo.objects) { object in
                        VStack(alignment:.leading,spacing:5) {
                            Text(object.observation.label).font(.headline)
                            Text(object.source).font(.caption).foregroundStyle(object.position == nil ? Color.orange : mint)
                            if !object.observation.brand.isEmpty {Text(object.observation.brand+" "+object.observation.model).font(.caption)}
                        }.padding().frame(maxWidth:.infinity,alignment:.leading).background(.ultraThinMaterial,in:RoundedRectangle(cornerRadius:18))
                    }
                    HStack {TextField("Cerca istruzioni o un manuale",text:$search).textFieldStyle(.roundedBorder);Button {neo.search(search)} label:{Image(systemName:"arrow.up.right")}.disabled(search.trimmingCharacters(in:.whitespaces).isEmpty || neo.busy)}
                    ForEach(neo.sources) {source in if let url=source.safeURL {Link(destination:url){Label(source.title,systemImage:"link").font(.callout)}}}
                    Text("Posizioni stimate, non riconoscimento universale. Per dita su tasti o sedute serve calibrazione. L’avatar non muove oggetti fisici.").font(.caption).foregroundStyle(.secondary)
                    Text("Avatar: “Rigged robot” di joney_lol · CC BY 3.0. Convertito in USD Skel; pose e IK originali.").font(.caption2).foregroundStyle(.secondary)
                    Link("Modello e licenza",destination:URL(string:"https://poly.pizza/m/BwjA6Thdzd")!).font(.caption2)
                }.padding(24)
            }.navigationTitle("Osservazioni").navigationBarTitleDisplayMode(.inline).toolbar {ToolbarItem(placement:.topBarTrailing){Button("Chiudi"){neo.showDetails=false}}}
        }.presentationDetents([.medium,.large])
    }
}

import SwiftUI
import RealityKit

struct ARSceneView: UIViewRepresentable {
    let room: RoomUnderstanding
    func makeUIView(context: Context) -> ARView { room.view }
    func updateUIView(_ uiView: ARView, context: Context) {}
}
struct NeoView: View {
    @EnvironmentObject private var neo: NeoSession
    @State private var search = ""
    private let mint = Color(red:0.52,green:0.92,blue:0.79)
    var body: some View {
        ZStack {
            ARSceneView(room:neo.room).ignoresSafeArea()
            if !neo.active { welcome }
        }
        .statusBarHidden(neo.active && !neo.controlsVisible)
        .persistentSystemOverlays(neo.active && !neo.controlsVisible ? .hidden : .automatic)
        .sheet(isPresented:$neo.controlsVisible) { controls }
        .sheet(isPresented:$neo.showDetails) { observations }
    }
    private var welcome: some View {
        ZStack {
            LinearGradient(colors:[Color(red:0.03,green:0.10,blue:0.13),.black],startPoint:.topLeading,endPoint:.bottomTrailing).ignoresSafeArea()
            ScrollView {
                VStack(alignment:.leading,spacing:22) {
                    Text("MY PERSONAL NEO").font(.caption.weight(.semibold)).tracking(4).foregroundStyle(mint)
                    Text("Il mondo reale.\nIn compagnia.").font(.system(size:42,weight:.light,design:.serif))
                    Text("Scegli il tuo compagno").font(.headline)
                    Picker("Compagno",selection:$neo.avatar) { ForEach(AvatarProfile.allCases) { p in Text(p.title).tag(p) } }.pickerStyle(.segmented)
                    if let url=Bundle.main.url(forResource:neo.avatar.resource,withExtension:"jpg"), let image=UIImage(contentsOfFile:url.path) {
                        Image(uiImage:image).resizable().scaledToFit().frame(maxHeight:220).clipShape(RoundedRectangle(cornerRadius:24))
                    }
                    Text("Scansiona il pavimento: NEO si posiziona davanti a te. Parlagli liberamente, anche mentre risponde.").foregroundStyle(.secondary)
                    Button { Task { await neo.start() } } label: { Label(neo.starting ? "Preparo NEO…" : "Entra con NEO",systemImage:"sparkles").frame(maxWidth:.infinity).padding(.vertical,10) }.buttonStyle(.borderedProminent).tint(mint).foregroundStyle(.black).disabled(neo.starting)
                    Label("Doppio tocco con due dita per i controlli",systemImage:"hand.tap").font(.callout).foregroundStyle(mint)
                    Text("Durante l’esperienza lo schermo mostra solo camera e avatar. Per i controlli puoi anche dire “apri i controlli”. Rimani fermo mentre scansioni, senza seguire l’avatar.").font(.caption).foregroundStyle(.secondary)
                    Text("Entra attiva camera e microfono. L’audio viene inviato a OpenAI; singole foto solo quando chiedi di osservare o abiliti la modalità assistita. Non archiviamo foto o dialoghi nel backend. Puoi sospendere tutto dai controlli o portando l’app in background.").font(.caption).foregroundStyle(.secondary)
                    Text(neo.message).font(.footnote).foregroundStyle(mint)
                }.padding(28)
            }
        }
    }
    private var controls: some View {
        NavigationStack {
            Form {
                Section("Conversazione") {
                    Label(neo.voice.state.rawValue,systemImage:neo.voice.muted ? "mic.slash" : "mic.fill")
                    Text(neo.voice.message).font(.caption)
                    Button(neo.voice.state == .off || neo.voice.state == .error ? "Ricollega voce" : neo.voice.muted ? "Riattiva microfono" : "Disattiva microfono") {
                        if neo.voice.state == .off || neo.voice.state == .error {neo.startVoice()} else {neo.voice.toggleMute()}
                    }
                    if !neo.voice.heard.isEmpty { Text("Tu: "+neo.voice.heard).font(.caption) }
                }
                Section("Spazio") {
                    Text(neo.room.status).font(.caption)
                    Text(String(format:"Scena %.0f FPS · camera %.0f FPS (richiesti %d) · rig %.0f Hz",neo.room.performance.fps,neo.room.cameraCadence.fps,neo.room.cameraTargetFPS,neo.room.performance.animationHz)).font(.caption.monospacedDigit())
                    Text(neo.room.sensingLabel).font(.caption)
                    Text(String(format:"Età frame %.2f s · gap camera massimo %.0f ms · update CPU massimo %.1f ms",neo.room.cameraAge,neo.room.cameraCadence.largestGap*1000,neo.room.longestUpdateMS)).font(.caption.monospacedDigit())
                    Button("Riscansiona superfici · 6 secondi") {neo.room.rescan()}.disabled(neo.busy)
                    Text("Dopo l’acquisizione iniziale la scansione continua è sospesa. Le osservazioni richiedono una breve misura; i piani conservati non rilevano ostacoli mobili. NEO smette di camminare dopo 20 s senza nuove misure.").font(.caption)
                    Text("\(neo.room.planeCount) superfici in memoria · \(neo.room.supportsLiDAR ? "profondità LiDAR disponibile" : "senza LiDAR")").font(.caption)
                    Toggle("NEO mi resta vicino",isOn:Binding(get:{neo.room.followUser},set:{neo.room.followUser=$0;neo.room.stopWalking()}))
                    Button("Osserva l’ambiente") {neo.look();neo.controlsVisible=false}.disabled(neo.busy || !neo.room.trackingNormal)
                    Toggle("Osservazione assistita · foto ogni 15 s",isOn:Binding(get:{neo.assistedObservation},set:{neo.setAssistedObservation($0)}))
                    Button("Osservazioni e fonti") {neo.controlsVisible=false;DispatchQueue.main.asyncAfter(deadline:.now()+0.4){neo.showDetails=true}}
                }
                Section("Interazioni misurate") {
                    Text("Per calibrare, NEO ti indica a voce dove toccare. Nessun indicatore viene sovrapposto alla camera.").font(.caption)
                    Button("Calibra pianoforte a 88 tasti") { do {try neo.beginPiano();neo.controlsVisible=false;neo.voice.announce(neo.calibrationPrompt)} catch {neo.message=error.localizedDescription} }
                    Button("Seleziona seduta reale") {do {try neo.beginSeat();neo.controlsVisible=false;neo.voice.announce(neo.message)}catch{neo.message=error.localizedDescription}}
                    if neo.calibrationStep>0 || neo.selectingSeat {Button("Annulla calibrazione"){neo.cancelCalibration()}}
                    Button("Saluta") {neo.demo("wave");neo.controlsVisible=false}
                    Button("Ferma movimento e musica") {neo.stopPerformance();neo.room.stopWalking();neo.room.followUser=false;neo.room.rig.stop(stand:false)}
                }
                Section { Button("Termina esperienza",role:.destructive) {neo.suspend()} }
            }.tint(mint).navigationTitle("NEO").navigationBarTitleDisplayMode(.inline)
                .toolbar {ToolbarItem(placement:.topBarTrailing) {Button("Riprendi"){neo.controlsVisible=false}}}
        }.presentationDetents([.medium,.large]).presentationDragIndicator(.visible).presentationCornerRadius(30)
    }
    private var observations: some View {
        NavigationStack {
            List {
                Section {Text(neo.answer.isEmpty ? "Chiedi a NEO cosa vede." : neo.answer).textSelection(.enabled)}
                ForEach(neo.objects) { object in VStack(alignment:.leading) { Text(object.observation.label);Text(object.source).font(.caption).foregroundStyle(.secondary) } }
                Section("Istruzioni") {
                    HStack {TextField("Marca e modello o domanda",text:$search);Button {neo.search(search)} label:{Image(systemName:"arrow.up.right")}.disabled(search.trimmingCharacters(in:.whitespaces).isEmpty || neo.busy)}
                    ForEach(neo.sources) {source in if let url=source.safeURL {Link(source.title,destination:url)}}
                }
                Section("Avatar") {
                    Text("Uomo, donna e Shiba Inu · Quaternius CC0. Una mesh e una palette 64 px per avatar; movimento locale.").font(.caption)
                    Link("Fonte e licenza",destination:URL(string:"https://quaternius.com")!)
                }
            }.navigationTitle("Osservazioni").toolbar {ToolbarItem(placement:.topBarTrailing){Button("Chiudi"){neo.showDetails=false}}}
        }.presentationDetents([.medium,.large]).presentationCornerRadius(30)
    }
}

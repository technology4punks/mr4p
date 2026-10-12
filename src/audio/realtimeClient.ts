import { recognizableSpeech } from "./speechGate";
import { AudioLevel } from "./audioLevel";
import type { StoryResult, StorySnapshot } from "../story/StoryEngine";
import type { AvatarState } from "../avatar/animations";
import type { VoiceActivity } from "./voicePresentation";
export type VoiceSnapshot = {
  status: "off" | "connecting" | "connected" | "error";
  state: AvatarState;
  muted: boolean;
  inputBlocked: boolean;
  inputSuspended: boolean;
  interruptions: boolean;
  playbackBlocked: boolean;
  peer: string;
  message: string;
  activity: VoiceActivity;
  microphone: "off" | "live" | "paused" | "ended";
  inputHealth?: "checking" | "flowing" | "stalled" | "recovering";
};
export type RealtimeEvent = {
  type: string;
  transcript?: string;
  delta?: string;
  item_id?: string;
  audio_start_ms?: number;
  audio_end_ms?: number;
  response?: { id?: string; status?: string };
  response_id?: string;
  error?: { code?: string };
  call_id?: string;
  name?: string;
  arguments?: string;
};
export function stateForEvent(type: string): AvatarState | undefined {
  switch (type) {
    case "input_audio_buffer.speech_started":
      return "listening";
    case "input_audio_buffer.speech_stopped":
    case "response.created":
      return "thinking";
    case "output_audio_buffer.started":
      return "speaking";
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return "listening";
    case "error":
      return "error";
  }
}
export class RealtimeClient {
  snapshot: VoiceSnapshot = {
    status: "off",
    state: "idle",
    muted: false,
    inputBlocked: false,
    inputSuspended: false,
    interruptions: true,
    playbackBlocked: false,
    peer: "closed",
    message: "Conversazione spenta",
    activity: "off",
    microphone: "off",
    inputHealth: "checking",
  };
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private mic?: MediaStream;
  private sender?: RTCRtpSender;
  private immersive = false;
  private repairingInput = false;
  private attemptedRepair = false;
  private statsPending = false;
  private lastInputCheck = 0;
  private lastInputProgress = 0;
  private inputBytes?: number;
  private inputSamples?: number;
  private lastResponseEvent = 0;
  private responseFinishedAt = 0;
  private remote?: MediaStream;
  private audio = document.createElement("audio");
  private context?: AudioContext;
  private inputLevel?: AudioLevel;
  private outputLevel?: AudioLevel;
  private abort?: AbortController;
  private generation = 0;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  private processedCalls = new Set<string>();
  private pendingToolResponse = false;
  private responseActive = false;
  private outputPlaying = false;
  private activeResponseId?: string;
  private outputResponseId?: string;
  private settledResponses = new Set<string>();
  private cancelledPlayback = new Set<string>();
  private cancelling = false;
  private cancelTimer?: ReturnType<typeof setTimeout>;
  private livenessTimer?: ReturnType<typeof setInterval>;
  private heardOutput = false;
  private lastOutputEnergy = 0;
  private transcriptionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private micResumeTimer?: ReturnType<typeof setTimeout>;
  private pendingNarration = false;
  private pendingUserResponse = false;
  private inflightRequest?: { user: boolean; narration: boolean; tool: boolean };
  private utterances = new Map<
    string,
    {
      start: number;
      receivedAt: number;
      end?: number;
      overlap: boolean;
      text: string;
      interrupted: boolean;
    }
  >();
  private answeredItems = new Set<string>();
  private storyContext?: StorySnapshot;
  constructor(
    private changed: (snapshot: VoiceSnapshot) => void,
    private transcript: (role: string, text: string) => void,
    private onTool?: (name: string, args: string) => StoryResult,
    private onReady?: () => void,
  ) {
    this.audio.autoplay = true;
    this.audio.setAttribute("playsinline", "");
    this.audio.hidden = true;
    document.body.appendChild(this.audio);
    document.addEventListener("visibilitychange", this.background);
    window.addEventListener("pagehide", this.background);
    this.audio.addEventListener("pause", this.paused);
  }
  private paused = () => {
    if (this.snapshot.status === "connected" && this.remote)
      this.patch({
        playbackBlocked: true,
        message: "Audio sospeso. Premi Riattiva audio.",
      });
  };
  private background = (event: Event) => {
    if (event.type === "pagehide" || (document.hidden && !this.immersive))
      this.stop(
        "Conversazione terminata in background. Riavviala per continuare.",
      );
    else if (!document.hidden && this.snapshot.status === "connected") void this.unlockAudio();
  };
  setImmersive(active: boolean) {
    this.immersive = active;
    if (!active && document.hidden) this.background(new Event("visibilitychange"));
  }
  private patch(patch: Partial<VoiceSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    const tracks = this.mic?.getAudioTracks() ?? [];
    this.snapshot.microphone = !tracks.length ? "off"
      : this.snapshot.inputHealth === "recovering" || this.snapshot.inputHealth === "stalled" ? "paused"
      : tracks.some((track) => track.readyState === "ended") ? "ended"
      : tracks.some((track) => track.enabled && !track.muted) ? "live" : "paused";
    this.snapshot.activity = this.snapshot.status !== "connected" ? this.snapshot.status
      : this.snapshot.muted ? "muted"
      : this.snapshot.playbackBlocked ? "audio-blocked"
      : this.snapshot.inputSuspended ? "paused"
      : this.snapshot.inputHealth === "recovering" || this.snapshot.inputHealth === "stalled" ? "paused"
      : this.outputPlaying ? "speaking"
      : this.snapshot.inputBlocked ? "paused"
      : this.snapshot.microphone === "paused" ? "paused"
      : (this.responseActive && !this.cancelling) || [...this.utterances.values()].some((u) => u.end !== undefined) ? "processing"
      : [...this.utterances.values()].some((u) => u.end === undefined) ? "listening" : "ready";
    this.changed(this.snapshot);
  }
  private refreshVoice(message?: string) {
    this.patch({
      state: this.snapshot.status === "off" ? "idle"
        : this.snapshot.status === "error" ? "error"
          : this.snapshot.status === "connecting" ? "thinking"
            : this.outputPlaying ? "speaking"
        : (this.responseActive && !this.cancelling) || [...this.utterances.values()].some((u) => u.end !== undefined) ? "thinking" : "listening",
      ...(message ? { message } : {}),
    });
  }
  private remember(set: Set<string>, id: string) {
    if (set.size >= 64) set.delete(set.values().next().value!);
    set.add(id);
  }
  private cancelResponse() {
    if (!this.responseActive) return;
    this.cancelling = true;
    this.send({ type: "response.cancel", ...(this.activeResponseId ? { response_id: this.activeResponseId } : {}) });
    const generation = this.generation;
    clearTimeout(this.cancelTimer);
    this.cancelTimer = setTimeout(() => {
      if (generation !== this.generation || !this.cancelling) return;
      this.finishCancellation();
    }, 1500);
  }
  private finishCancellation() {
    clearTimeout(this.cancelTimer);
    this.cancelling = false;
    if (this.activeResponseId) this.remember(this.settledResponses, this.activeResponseId);
    this.activeResponseId = undefined;
    this.responseActive = false;
    this.inflightRequest = undefined;
    this.flushResponse();
    this.refreshVoice();
  }
  private finishPlayback() {
    this.outputPlaying = false;
    this.outputResponseId = undefined;
    this.heardOutput = false;
    this.flushResponse();
    const generation = this.generation;
    clearTimeout(this.micResumeTimer);
    this.micResumeTimer = setTimeout(() => {
      if (generation === this.generation && !this.outputPlaying) {
        this.blockMicrophone(false);
        this.refreshVoice("Puoi parlare. Il microfono è acceso.");
      }
    }, this.snapshot.inputBlocked ? 350 : 0);
    this.refreshVoice();
  }
  private watchPlayback = () => {
    const now = Date.now();
    const levels = this.levels();
    if (now - this.lastInputCheck >= 1000) {
      this.lastInputCheck = now;
      void this.checkInput();
    }
    // Missing create/done events must not hold every later user turn forever.
    // Streaming response events and audible playback keep this deadline alive.
    if (this.responseActive && !this.cancelling && now - this.lastResponseEvent > 30000 && levels.output < 0.008) {
      this.inflightRequest = undefined;
      this.cancelResponse();
      if (this.outputPlaying) {
        this.send({ type: "output_audio_buffer.clear" });
        if (this.outputResponseId) this.remember(this.cancelledPlayback, this.outputResponseId);
        this.finishPlayback();
      }
      this.refreshVoice("Risposta interrotta. Puoi ripetere la domanda.");
    }
    if (!this.outputPlaying) return;
    if (levels.audible && levels.output > 0.008) {
      this.heardOutput = true;
      this.lastOutputEnergy = Date.now();
      this.lastResponseEvent = Date.now();
    } else if (!this.responseActive && this.heardOutput && levels.audible && Date.now() - this.lastOutputEnergy >= 2500) {
      // Only recover after completed generation AND heard playback followed by
      // sustained silence. Never reopen protected input on response.done alone.
      this.finishPlayback();
    } else if (!this.responseActive && !this.heardOutput && levels.audible && this.responseFinishedAt && now - this.responseFinishedAt >= 5000) {
      // A completed empty/inaudible response can also lose its stopped event.
      this.finishPlayback();
    }
  };
  private resetInputHealth() {
    this.lastInputProgress = Date.now();
    this.inputBytes = this.inputSamples = undefined;
  }
  private bindMicrophone(mic: MediaStream) {
    this.mic = mic;
    this.inputLevel?.dispose();
    this.inputLevel = new AudioLevel(this.context!, mic);
    const generation = this.generation;
    mic.getAudioTracks().forEach((track) => {
      track.enabled = !this.snapshot.muted && !this.snapshot.inputBlocked && !this.snapshot.inputSuspended;
      track.onmute = track.onunmute = () => {
        if (generation !== this.generation) return;
        this.resetInputHealth();
        if (!track.muted && track.readyState === "live" && !this.repairingInput) this.patch({ inputHealth: "checking" });
        this.refreshVoice();
      };
      track.onended = () => {
        if (generation !== this.generation) return;
        this.patch({ inputHealth: "stalled", message: "Microfono interrotto. Ripristino l’ascolto…" });
        if (!this.snapshot.inputSuspended && !this.snapshot.muted) void this.repairMicrophone();
      };
    });
    this.resetInputHealth();
  }
  private async checkInput() {
    if (this.snapshot.status !== "connected" || this.repairingInput || this.statsPending) return;
    if (this.snapshot.muted || this.snapshot.inputBlocked || this.snapshot.inputSuspended) {
      this.resetInputHealth();
      return;
    }
    const track = this.mic?.getAudioTracks()[0];
    if (!track) return;
    let stalled = track.readyState === "ended" || (track.muted && Date.now() - this.lastInputProgress >= 5000);
    if (!track.muted && track.readyState === "live" && this.sender?.getStats) {
      const generation = this.generation;
      this.statsPending = true;
      try {
        const stats = await this.sender.getStats();
        if (generation !== this.generation || this.repairingInput || track !== this.mic?.getAudioTracks()[0] || this.snapshot.muted || this.snapshot.inputBlocked || this.snapshot.inputSuspended) return;
        let bytes: number | undefined, samples: number | undefined;
        stats.forEach((report) => {
          if (report.type === "outbound-rtp" && (report.kind === "audio" || report.mediaType === "audio")) bytes = report.bytesSent;
          if (report.type === "media-source" && report.kind === "audio") samples = report.totalSamplesDuration;
        });
        if (bytes !== undefined) {
          if (this.inputBytes === undefined) {
            this.lastInputProgress = Date.now();
          } else if (bytes > this.inputBytes) {
            this.lastInputProgress = Date.now();
            this.attemptedRepair = false;
            if (this.snapshot.inputHealth !== "flowing") this.patch({ inputHealth: "flowing" });
          } else if (Date.now() - this.lastInputProgress >= 8000) {
            // Silence/DTX alone is not a fault. Require stopped capture or
            // measurable local audio with no outbound packets as well.
            stalled ||= (samples !== undefined && this.inputSamples !== undefined && samples === this.inputSamples) || this.levels().input > 0.015;
          }
          this.inputBytes = bytes;
          this.inputSamples = samples;
        }
      } catch { /* Optional browser stats must not stop the conversation. */ }
      finally { if (generation === this.generation) this.statsPending = false; }
    }
    if (stalled) {
      if (this.snapshot.inputHealth !== "stalled") this.patch({ inputHealth: "stalled", message: "Il microfono non invia audio. Premi Riprendi ascolto." });
      if (!this.attemptedRepair) void this.repairMicrophone();
    }
  }
  private async repairMicrophone() {
    if (this.repairingInput || this.snapshot.status !== "connected" || this.snapshot.inputSuspended) return;
    const sender = this.sender;
    if (!sender?.replaceTrack) {
      this.patch({ inputHealth: "stalled", message: "Microfono interrotto. Termina e riavvia la conversazione." });
      return;
    }
    const generation = this.generation;
    this.repairingInput = this.attemptedRepair = true;
    this.patch({ inputHealth: "recovering", message: "Ripristino del microfono…" });
    let fresh: MediaStream | undefined;
    try {
      fresh = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (generation !== this.generation) { fresh.getTracks().forEach((t) => t.stop()); return; }
      const track = fresh.getAudioTracks()[0];
      if (!track || track.readyState !== "live" || track.muted) throw new Error("No microphone");
      track.enabled = !this.snapshot.muted && !this.snapshot.inputBlocked && !this.snapshot.inputSuspended;
      await sender.replaceTrack(track);
      if (generation !== this.generation) { fresh.getTracks().forEach((t) => t.stop()); return; }
      const previous = this.mic;
      this.bindMicrophone(fresh);
      previous?.getTracks().forEach((t) => { t.onended = t.onmute = t.onunmute = null; t.stop(); });
      this.patch({ inputHealth: "checking", message: "Microfono ripristinato. Puoi parlare." });
    } catch {
      fresh?.getTracks().forEach((t) => t.stop());
      if (generation === this.generation) this.patch({ inputHealth: "stalled", message: "Microfono non disponibile. Verifica i permessi e premi Riprendi ascolto." });
    } finally {
      if (generation === this.generation) this.repairingInput = false;
    }
  }
  /** A deliberate recovery gesture repairs capture without replacing the session. */
  async resumeListening() {
    if (this.snapshot.status !== "connected" || this.snapshot.inputSuspended) return;
    const repair = this.snapshot.activity !== "speaking" && this.snapshot.activity !== "processing";
    this.mute(false);
    const unlock = this.unlockAudio();
    this.interrupt();
    if (repair || this.snapshot.inputHealth === "stalled") await this.repairMicrophone();
    await unlock;
  }
  async start() {
    if (
      this.snapshot.status === "connected" ||
      this.snapshot.status === "connecting"
    )
      return;
    this.stop();
    if (
      !isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined" ||
      typeof AudioContext === "undefined"
    ) {
      this.patch({
        status: "error",
        state: "error",
        message:
          "Microfono e WebRTC richiedono un browser compatibile su HTTPS (o localhost).",
      });
      return;
    }
    const generation = ++this.generation;
    const abort = (this.abort = new AbortController());
    this.patch({
      status: "connecting",
      state: "thinking",
      message: "Consenti il microfono. Connessione voce…",
      peer: "new",
    });
    this.connectTimer = setTimeout(() => {
      if (generation === this.generation)
        this.fail(
          "Connessione scaduta. Verifica rete e permessi, poi riprova.",
        );
    }, 30_000);
    try {
      // Must happen synchronously in the user's gesture, before awaiting network/mic.
      this.context = new AudioContext();
      this.context.onstatechange = () => {
        if (generation !== this.generation || !this.remote || this.context?.state === "closed") return;
        if (this.context?.state === "running") void this.unlockAudio();
        else this.patch({ playbackBlocked: true, message: "Audio sospeso. Premi Riattiva audio." });
      };
      const unlock = this.context.resume().catch(() => {});
      const buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      const silent = this.context.createBufferSource();
      silent.buffer = buffer;
      silent.connect(this.context.destination);
      silent.start();
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== this.generation) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      this.mic = mic;
      await unlock;
      if (generation !== this.generation) return;
      this.bindMicrophone(mic);
      const tokenResponse = await fetch("/api/realtime-token", {
        method: "POST",
        signal: abort.signal,
        cache: "no-store",
      });
      const token = (await tokenResponse.json()) as {
        value?: string;
        expires_at?: number;
        error?: string;
      };
      if (generation !== this.generation) return;
      if (!tokenResponse.ok)
        throw new Error(token.error || "Sessione voce non autorizzata.");
      if (
        !token.value ||
        !token.expires_at ||
        token.expires_at * 1000 <= Date.now()
      )
        throw new Error("Token voce non valido o scaduto. Riprova.");
      const pc = (this.pc = new RTCPeerConnection());
      this.channel = pc.createDataChannel("oai-events");
      this.channel.onopen = () => {
        if (generation !== this.generation) return;
        this.updateTurnDetection();
        if (this.storyContext) this.synchronizeStory(this.storyContext);
        this.onReady?.();
      };
      this.channel.onmessage = (event) => {
        if (generation !== this.generation) return;
        try {
          this.event(JSON.parse(event.data) as RealtimeEvent);
        } catch {
          /* Ignore malformed, nonessential events. */
        }
      };
      this.channel.onerror = () => {
        if (generation === this.generation)
          this.fail("Canale eventi voce interrotto. Riprova.");
      };
      this.channel.onclose = () => {
        if (
          generation === this.generation &&
          this.snapshot.status === "connected"
        )
          this.fail("Sessione voce chiusa dal servizio.");
      };
      pc.ontrack = (event) => {
        if (generation !== this.generation) return;
        this.remote = event.streams[0] || new MediaStream([event.track]);
        this.audio.srcObject = this.remote;
        this.outputLevel?.dispose();
        this.outputLevel = new AudioLevel(this.context!, this.remote);
        event.track.onended = () => {
          if (generation === this.generation)
            this.fail("Audio remoto terminato. Riavvia la conversazione.");
        };
        void this.unlockAudio();
      };
      pc.onconnectionstatechange = () => {
        if (generation !== this.generation) return;
        this.patch({ peer: pc.connectionState });
        if (pc.connectionState === "connected") {
          clearTimeout(this.connectTimer);
          clearTimeout(this.disconnectTimer);
          this.disconnectTimer = undefined;
          this.patch({
            status: "connected",
            state: "listening",
            message: "Puoi parlare. Il microfono è acceso.",
          });
          this.livenessTimer ??= setInterval(this.watchPlayback, 200);
        }
        if (pc.connectionState === "failed" || pc.connectionState === "closed")
          this.fail("Connessione voce interrotta. Verifica la rete e riprova.");
        if (pc.connectionState === "disconnected")
          this.disconnectTimer ??= setTimeout(
            () => this.fail("Rete voce disconnessa. Riprova."),
            5000,
          );
      };
      this.sender = pc.addTrack(mic.getAudioTracks()[0], mic);
      const offer = await pc.createOffer();
      if (generation !== this.generation) return;
      await pc.setLocalDescription(offer);
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        signal: abort.signal,
        headers: {
          Authorization: `Bearer ${token.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      if (generation !== this.generation) return;
      if (!answer.ok) {
        const message =
          answer.status === 429
            ? "Quota o limite voce raggiunto."
            : answer.status === 401 || answer.status === 403
              ? "Sessione voce non autorizzata o token scaduto."
              : "Connessione Realtime non riuscita. Verifica modello e rete.";
        throw new Error(message);
      }
      const sdp = await answer.text();
      if (generation === this.generation)
        await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (error) {
      if (generation !== this.generation) return;
      const name = error instanceof Error ? error.name : "";
      this.fail(
        name === "NotAllowedError"
          ? "Permesso microfono negato. Consenti il microfono nelle impostazioni del browser e riprova."
          : name === "NotFoundError"
            ? "Microfono non trovato."
            : name === "NotReadableError"
              ? "Microfono occupato o interrotto da una chiamata."
              : error instanceof Error && name !== "TypeError"
                ? error.message
                : "Rete indisponibile. Verifica la connessione e riprova.",
      );
    }
  }
  private send(value: object) {
    if (this.channel?.readyState !== "open") return false;
    this.channel.send(JSON.stringify(value));
    return true;
  }
  get audioContext() {
    return this.context;
  }
  synchronizeStory(snapshot: StorySnapshot) {
    this.storyContext = { ...snapshot };
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Stato narrativo autorevole: " +
              JSON.stringify(snapshot) +
              ". Rispetta i consensi e continua a rispondere alle domande.",
          },
        ],
      },
    });
  }
  requestNarration(text: string) {
    if (
      !this.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: text.slice(0, 1000) }],
        },
      })
    )
      return false;
    this.pendingNarration = true;
    this.flushResponse();
    return true;
  }
  private flushResponse() {
    if (
      this.responseActive ||
      this.outputPlaying ||
      !(
        this.pendingUserResponse ||
        this.pendingNarration ||
        this.pendingToolResponse
      )
    )
      return;
    this.inflightRequest = { user: this.pendingUserResponse, narration: this.pendingNarration, tool: this.pendingToolResponse };
    this.pendingUserResponse =
      this.pendingNarration =
      this.pendingToolResponse =
        false;
    if (this.send({ type: "response.create" })) {
      this.responseActive = true;
      this.lastResponseEvent = Date.now();
      this.refreshVoice();
    }
  }
  private acceptSpeech(event: RealtimeEvent) {
    const id = event.item_id;
    if (!id || this.answeredItems.has(id)) return;
    const utterance = this.utterances.get(id) ?? {
      start: 0,
      end: 450,
      receivedAt: Date.now(),
      overlap: this.outputPlaying,
      text: "",
      interrupted: false,
    };
    utterance.text = event.transcript ?? utterance.text + (event.delta ?? "");
    this.utterances.set(id, utterance);
    const duration = utterance.end === undefined ? Date.now() - utterance.receivedAt + 350 : utterance.end - utterance.start;
    const valid =
      !this.snapshot.muted && !this.snapshot.inputSuspended && !this.snapshot.inputBlocked &&
      recognizableSpeech(utterance.text, duration, utterance.overlap);
    const completed = event.type.endsWith(".completed");
    if (
      valid &&
      utterance.overlap &&
      this.snapshot.interruptions &&
      !utterance.interrupted
    ) {
      utterance.interrupted = true;
      this.pendingNarration = this.pendingToolResponse = false;
      this.cancelResponse();
      if (this.outputPlaying) this.send({ type: "output_audio_buffer.clear" });
      if (this.outputResponseId) this.remember(this.cancelledPlayback, this.outputResponseId);
      this.outputPlaying = false;
      this.outputResponseId = undefined;
      this.blockMicrophone(false);
      this.refreshVoice("Ti ascolto.");
      // Preserve the committed user audio: never clear the input buffer here.
    }
    if (!completed) return;
    clearTimeout(this.transcriptionTimers.get(id));
    this.transcriptionTimers.delete(id);
    this.utterances.delete(id);
    if (this.answeredItems.size >= 64)
      this.answeredItems.delete(this.answeredItems.values().next().value!);
    this.answeredItems.add(id);
    if (!valid || (utterance.overlap && !this.snapshot.interruptions)) {
      this.send({ type: "conversation.item.delete", item_id: id });
      this.refreshVoice();
      return;
    }
    this.transcript("Tu", utterance.text);
    this.pendingUserResponse = true;
    this.flushResponse();
    this.refreshVoice();
  }
  private event(event: RealtimeEvent) {
    if (event.type.startsWith("response.") && this.responseActive && (!event.response_id || !this.activeResponseId || event.response_id === this.activeResponseId)) this.lastResponseEvent = Date.now();
    if (event.type === "input_audio_buffer.speech_started" && event.item_id) {
      if (this.answeredItems.has(event.item_id) || this.utterances.has(event.item_id)) return;
      if (this.utterances.size >= 32) {
        const oldest = this.utterances.keys().next().value!;
        this.utterances.delete(oldest);
        clearTimeout(this.transcriptionTimers.get(oldest));
        this.transcriptionTimers.delete(oldest);
        this.remember(this.answeredItems, oldest);
      }
      this.utterances.set(event.item_id, {
        start: event.audio_start_ms ?? 0,
        receivedAt: Date.now(),
        overlap: this.outputPlaying,
        text: "",
        interrupted: false,
      });
      const id = event.item_id, generation = this.generation;
      this.transcriptionTimers.set(id, setTimeout(() => {
        if (generation !== this.generation || !this.utterances.has(id)) return;
        this.utterances.delete(id);
        this.transcriptionTimers.delete(id);
        this.remember(this.answeredItems, id);
        this.send({ type: "input_audio_buffer.clear" });
        this.refreshVoice("Ascolto ripristinato. Puoi ripetere la domanda?");
      }, 60000));
    }
    if (event.type === "input_audio_buffer.speech_stopped" && event.item_id) {
      const utterance = this.utterances.get(event.item_id);
      if (utterance) {
        utterance.end = event.audio_end_ms ?? utterance.start;
        const id = event.item_id, generation = this.generation;
        clearTimeout(this.transcriptionTimers.get(id));
        this.transcriptionTimers.set(id, setTimeout(() => {
          if (generation !== this.generation || !this.utterances.has(id)) return;
          this.utterances.delete(id);
          this.transcriptionTimers.delete(id);
          this.remember(this.answeredItems, id);
          this.send({ type: "conversation.item.delete", item_id: id });
          this.refreshVoice("Non ho ricevuto le parole. Puoi ripetere?");
        }, 10000));
      }
    }
    if (
      event.type === "conversation.item.input_audio_transcription.delta" ||
      event.type === "conversation.item.input_audio_transcription.completed"
    ) {
      this.acceptSpeech(event);
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.failed") {
      if (event.item_id) {
        clearTimeout(this.transcriptionTimers.get(event.item_id));
        this.transcriptionTimers.delete(event.item_id);
        this.utterances.delete(event.item_id);
        this.send({ type: "conversation.item.delete", item_id: event.item_id });
      }
      this.refreshVoice("Non ho capito. Puoi ripetere?");
      return;
    }
    if (event.type === "output_audio_buffer.started") {
      if (event.response_id && this.cancelledPlayback.has(event.response_id)) return;
      clearTimeout(this.micResumeTimer);
      this.outputPlaying = true;
      this.outputResponseId = event.response_id;
      this.heardOutput = false;
      this.lastOutputEnergy = Date.now();
      this.responseFinishedAt = 0;
      if (!this.snapshot.interruptions) this.blockMicrophone(true);
    }
    if (
      event.type === "output_audio_buffer.stopped" ||
      event.type === "output_audio_buffer.cleared"
    ) {
      if (event.response_id && this.outputResponseId && event.response_id !== this.outputResponseId) return;
      if (event.response_id && this.cancelledPlayback.has(event.response_id)) return;
      this.finishPlayback();
    }
    if (event.type === "response.created") {
      if (event.response?.id && this.settledResponses.has(event.response.id)) return;
      this.responseActive = true;
      this.lastResponseEvent = Date.now();
      this.activeResponseId = event.response?.id;
      this.inflightRequest = undefined;
    }
    // Full function arguments only: never act on argument deltas or transcripts.
    if (event.type === "response.function_call_arguments.done") {
      if (
        !event.call_id ||
        event.call_id.length > 160 ||
        !event.name ||
        typeof event.arguments !== "string" ||
        this.processedCalls.has(event.call_id)
      )
        return;
      if (this.processedCalls.size >= 64)
        this.processedCalls.delete(this.processedCalls.values().next().value!);
      this.processedCalls.add(event.call_id);
      const result = this.onTool?.(event.name, event.arguments) ?? {
        accepted: false,
        reason: "Story Engine non disponibile.",
      };
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: event.call_id,
          output: JSON.stringify(result),
        },
      });
      this.pendingToolResponse = true;
      return;
    }
    if (event.type === "response.done") {
      const id = event.response?.id;
      if (id && (this.settledResponses.has(id) || (this.activeResponseId && id !== this.activeResponseId))) return;
      if (id) this.remember(this.settledResponses, id);
      clearTimeout(this.cancelTimer);
      this.cancelling = false;
      this.responseActive = false;
      this.inflightRequest = undefined;
      this.responseFinishedAt = Date.now();
      this.activeResponseId = undefined;
      if (event.response?.status !== "completed")
        this.pendingToolResponse = false;
      if (event.response?.status !== "failed") this.flushResponse();
    }
    if (event.type === "error" && event.error?.code === "response_cancel_not_active") {
      if (this.cancelling) this.finishCancellation();
      return;
    }
    if (event.type === "error" && event.error?.code === "conversation_already_has_active_response") {
      // A rejected create must not consume the validated user's turn.
      this.pendingUserResponse ||= this.inflightRequest?.user ?? false;
      this.pendingNarration ||= this.inflightRequest?.narration ?? false;
      this.pendingToolResponse ||= this.inflightRequest?.tool ?? false;
      this.inflightRequest = undefined;
      this.refreshVoice("NEO sta ancora rispondendo. Premi Interrompi per parlare.");
      return;
    }

    if (
      event.type === "error" ||
      (event.type === "response.done" && event.response?.status === "failed")
    ) {
      this.fail(
        event.error?.code === "insufficient_quota"
          ? "Quota OpenAI raggiunta."
          : "Il servizio voce ha segnalato un errore. Riavvia la conversazione.",
      );
      return;
    }
    if (stateForEvent(event.type) || event.type === "response.done") this.refreshVoice();
    if (
      event.type === "response.output_audio_transcript.done" &&
      event.transcript
    )
      this.transcript("NEO", event.transcript);
  }
  async unlockAudio() {
    const generation = this.generation;
    try {
      await this.context?.resume();
      if (generation !== this.generation) return;
      if (this.remote) await this.audio.play();
      if (generation === this.generation)
        this.patch({ playbackBlocked: false });
    } catch {
      if (generation === this.generation)
        this.patch({
          playbackBlocked: true,
          message: "Audio bloccato. Premi Riattiva audio.",
        });
    }
  }
  mute(force?: boolean) {
    if (!this.mic) return;
    const muted = force ?? !this.snapshot.muted;
    this.mic.getAudioTracks().forEach((track) => {
      track.enabled = !muted && !this.snapshot.inputBlocked && !this.snapshot.inputSuspended;
    });
    this.patch({ muted });
  }
  private blockMicrophone(blocked: boolean) {
    this.mic?.getAudioTracks().forEach((track) => {
      track.enabled = !blocked && !this.snapshot.muted && !this.snapshot.inputSuspended;
    });
    this.patch({ inputBlocked: blocked });
  }
  setInputSuspended(suspended: boolean) {
    this.mic?.getAudioTracks().forEach((track) => {
      track.enabled = !suspended && !this.snapshot.muted && !this.snapshot.inputBlocked;
    });
    this.resetInputHealth();
    this.patch({ inputSuspended: suspended });
    if (!suspended && this.snapshot.status === "connected") void this.unlockAudio();
    this.refreshVoice();
  }
  private updateTurnDetection() {
    this.send({
      type: "session.update",
      session: {
        type: "realtime",
        audio: {
          input: {
            noise_reduction: { type: "near_field" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 350,
              silence_duration_ms: 650,
              create_response: false,
              interrupt_response: false,
            },
          },
        },
      },
    });
  }
  toggleInterruptions() {
    this.patch({ interruptions: !this.snapshot.interruptions });
    this.updateTurnDetection();
    this.blockMicrophone(this.outputPlaying && !this.snapshot.interruptions);
  }
  interrupt() {
    if (this.snapshot.status !== "connected") return;
    clearTimeout(this.micResumeTimer);
    this.pendingUserResponse =
      this.pendingNarration =
      this.pendingToolResponse =
        false;
    this.cancelResponse();
    if (this.outputPlaying) this.send({ type: "output_audio_buffer.clear" });
    if (this.outputResponseId) this.remember(this.cancelledPlayback, this.outputResponseId);
    this.send({ type: "input_audio_buffer.clear" });
    this.outputPlaying = false;
    this.outputResponseId = undefined;
    for (const timer of this.transcriptionTimers.values()) clearTimeout(timer);
    this.transcriptionTimers.clear();
    for (const id of this.utterances.keys()) this.remember(this.answeredItems, id);
    this.utterances.clear();
    this.blockMicrophone(false);
    this.patch({
      state: "listening",
      message: this.snapshot.muted
        ? "Riattiva il microfono per parlare."
        : "Ti ascolto. Parla ora.",
    });
  }
  levels() {
    const audible =
      !!this.remote &&
      !this.audio.paused &&
      !this.audio.muted &&
      this.context?.state === "running" &&
      this.remote
        .getAudioTracks()
        .some((track) => track.readyState === "live" && !track.muted);
    return {
      input:
        this.snapshot.muted || this.snapshot.inputBlocked || this.snapshot.inputSuspended
          ? 0
          : (this.inputLevel?.read() ?? 0),
      output: audible ? (this.outputLevel?.read() ?? 0) : 0,
      audible,
    };
  }
  private fail(message: string) {
    this.stop();
    this.patch({ status: "error", state: "error", message });
  }
  stop(message = "Conversazione spenta") {
    this.generation++;
    this.sender = undefined;
    this.repairingInput = this.statsPending = this.attemptedRepair = false;
    this.resetInputHealth();
    this.processedCalls.clear();
    this.utterances.clear();
    this.answeredItems.clear();
    this.pendingUserResponse = false;
    this.inflightRequest = undefined;
    this.pendingToolResponse = false;
    this.responseActive = false;
    this.outputPlaying = false;
    this.activeResponseId = this.outputResponseId = undefined;
    this.settledResponses.clear();
    this.cancelledPlayback.clear();
    this.cancelling = this.heardOutput = false;
    clearTimeout(this.cancelTimer);
    clearInterval(this.livenessTimer);
    this.cancelTimer = this.livenessTimer = undefined;
    for (const timer of this.transcriptionTimers.values()) clearTimeout(timer);
    this.transcriptionTimers.clear();
    clearTimeout(this.micResumeTimer);
    this.micResumeTimer = undefined;
    this.pendingNarration = false;
    this.abort?.abort();
    this.abort = undefined;
    clearTimeout(this.connectTimer);
    clearTimeout(this.disconnectTimer);
    this.connectTimer = this.disconnectTimer = undefined;
    this.channel?.close();
    this.channel = undefined;
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = undefined;
    }
    this.mic?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = track.onunmute = null;
      track.enabled = false;
      track.stop();
    });
    this.mic = undefined;
    this.remote?.getTracks().forEach((track) => {
      track.onended = null;
      track.enabled = false;
      track.stop();
    });
    this.remote = undefined;
    this.audio.pause();
    this.audio.srcObject = null;
    this.inputLevel?.dispose();
    this.outputLevel?.dispose();
    this.inputLevel = this.outputLevel = undefined;
    if (this.context) this.context.onstatechange = null;
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.patch({
      status: "off",
      state: "idle",
      muted: false,
      inputBlocked: false,
      inputSuspended: false,
      inputHealth: "checking",
      playbackBlocked: false,
      peer: "closed",
      message,
    });
  }
  dispose() {
    this.stop();
    document.removeEventListener("visibilitychange", this.background);
    window.removeEventListener("pagehide", this.background);
    this.audio.removeEventListener("pause", this.paused);
    this.audio.remove();
  }
}

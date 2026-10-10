import { AudioLevel } from "./audioLevel";
import type { AvatarState } from "../avatar/animations";
export type VoiceSnapshot = {
  status: "off" | "connecting" | "connected" | "error";
  state: AvatarState;
  muted: boolean;
  playbackBlocked: boolean;
  peer: string;
  message: string;
};
export type RealtimeEvent = {
  type: string;
  transcript?: string;
  response?: { status?: string };
  error?: { code?: string };
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
    playbackBlocked: false,
    peer: "closed",
    message: "Conversazione spenta",
  };
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private mic?: MediaStream;
  private remote?: MediaStream;
  private audio = document.createElement("audio");
  private context?: AudioContext;
  private inputLevel?: AudioLevel;
  private outputLevel?: AudioLevel;
  private abort?: AbortController;
  private generation = 0;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private durationTimer?: ReturnType<typeof setTimeout>;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  constructor(
    private changed: (snapshot: VoiceSnapshot) => void,
    private transcript: (role: string, text: string) => void,
  ) {
    this.audio.autoplay = true;
    this.audio.setAttribute("playsinline", "");
    this.audio.hidden = true;
    document.body.append(this.audio);
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
    if (document.hidden || event.type === "pagehide")
      this.stop(
        "Conversazione terminata in background. Riavviala per continuare.",
      );
  };
  private patch(patch: Partial<VoiceSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.changed(this.snapshot);
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
      this.inputLevel = new AudioLevel(this.context!, mic);
      mic.getTracks().forEach((track) => {
        track.onended = () => {
          if (generation === this.generation)
            this.fail(
              "Microfono interrotto o permesso revocato. Riavvia la conversazione.",
            );
        };
      });
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
            message: "Pronto: parla in italiano.",
          });
          this.durationTimer ??= setTimeout(
            () =>
              this.stop(
                "Sessione terminata dopo 10 minuti. Puoi avviarne una nuova.",
              ),
            600_000,
          );
        }
        if (pc.connectionState === "failed" || pc.connectionState === "closed")
          this.fail("Connessione voce interrotta. Verifica la rete e riprova.");
        if (pc.connectionState === "disconnected")
          this.disconnectTimer ??= setTimeout(
            () => this.fail("Rete voce disconnessa. Riprova."),
            5000,
          );
      };
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));
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
  private event(event: RealtimeEvent) {
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
    const state = stateForEvent(event.type);
    if (state) this.patch({ state });
    if (
      event.type === "conversation.item.input_audio_transcription.completed" &&
      event.transcript
    )
      this.transcript("Tu", event.transcript);
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
      track.enabled = !muted;
    });
    this.patch({ muted });
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
      input: this.snapshot.muted ? 0 : (this.inputLevel?.read() ?? 0),
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
    this.abort?.abort();
    this.abort = undefined;
    clearTimeout(this.connectTimer);
    clearTimeout(this.durationTimer);
    clearTimeout(this.disconnectTimer);
    this.connectTimer = this.durationTimer = this.disconnectTimer = undefined;
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
      track.stop();
    });
    this.mic = undefined;
    this.remote?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.remote = undefined;
    this.audio.pause();
    this.audio.srcObject = null;
    this.inputLevel?.dispose();
    this.outputLevel?.dispose();
    this.inputLevel = this.outputLevel = undefined;
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.patch({
      status: "off",
      state: "idle",
      muted: false,
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

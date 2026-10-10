// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient, stateForEvent } from "../src/audio/realtimeClient";
import { StoryEngine } from "../src/story/StoryEngine";
class FakeContext {
  state = "running";
  sampleRate = 48000;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createBuffer = vi.fn();
  createBufferSource = () => ({ connect: vi.fn(), start: vi.fn() });
  createAnalyser = () => ({
    fftSize: 512,
    getFloatTimeDomainData: (data: Float32Array) => data.fill(0.1),
    disconnect: vi.fn(),
  });
  createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() });
}
class FakePeer {
  static latest: FakePeer;
  connectionState = "new";
  onconnectionstatechange?: () => void;
  ontrack?: (event: unknown) => void;
  channel = {
    onmessage: undefined as unknown,
    onopen: undefined as unknown,
    readyState: "open",
    send: vi.fn(),
    onerror: null,
    onclose: null,
    close: vi.fn(),
  };
  createDataChannel = () => this.channel;
  addTrack = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: "offer", sdp: "mock-offer" });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockImplementation(async () => {
    this.connectionState = "connected";
    this.onconnectionstatechange?.();
  });
  close = vi.fn();
  constructor() {
    FakePeer.latest = this;
  }
}
const mic = () => {
  const track = {
    stop: vi.fn(),
    enabled: true,
    readyState: "live",
    onended: null,
    muted: false,
    onmute: null as ((event: Event) => void) | null,
    onunmute: null as ((event: Event) => void) | null,
  };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream,
  };
};
let client: RealtimeClient;
let getUserMedia: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) =>
      url.startsWith("/api")
        ? new Response(
            JSON.stringify({
              value: "ephemeral",
              expires_at: Math.floor(Date.now() / 1000) + 60,
            }),
          )
        : new Response("mock-answer"),
    ),
  );
  client = new RealtimeClient(vi.fn(), vi.fn());
});
describe("Realtime narrative transport", () => {
  const deliver = (event: object) => {
    (FakePeer.latest.channel.onmessage as (event: { data: string }) => void)({
      data: JSON.stringify(event),
    });
  };
  const sent = () =>
    FakePeer.latest.channel.send.mock.calls.map(([text]) => JSON.parse(text));
  it("sends authoritative state on channel readiness and starts discovery only when ready", async () => {
    client.dispose();
    const engine = new StoryEngine();
    const ready = vi.fn(() =>
      client.requestNarration("Inizia la conversazione."),
    );
    client = new RealtimeClient(
      vi.fn(),
      vi.fn(),
      (name, args) => engine.tool(name, args),
      ready,
    );
    client.synchronizeStory(engine.snapshot);
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    expect(ready).not.toHaveBeenCalled();
    (FakePeer.latest.channel.onopen as () => void)();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(
      sent().find((e) => e.item?.role === "system").item.content[0].text,
    ).toContain("INTRODUCTION");
    expect(sent().at(-1).type).toBe("response.create");
  });
  it("executes full validated calls once, returns rejection and waits until response completion", async () => {
    client.dispose();
    const engine = new StoryEngine();
    const onTool = vi.fn((name: string, args: string) =>
      engine.tool(name, args),
    );
    client = new RealtimeClient(vi.fn(), vi.fn(), onTool);
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    const call = {
      type: "response.function_call_arguments.done",
      call_id: "call1",
      name: "select_theme",
      arguments: '{"theme":"environmental"}',
    };
    deliver({ ...call, type: "response.function_call_arguments.delta" });
    expect(onTool).not.toHaveBeenCalled();
    deliver(call);
    deliver(call);
    expect(onTool).toHaveBeenCalledTimes(1);
    expect(engine.snapshot.state).toBe("INVITATION");
    expect(JSON.parse(sent()[0].item.output).accepted).toBe(true);
    expect(sent().some((e) => e.type === "response.create")).toBe(false);
    deliver({ type: "response.done", response: { status: "completed" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    deliver({
      ...call,
      call_id: "call2",
      name: "enter_observatory",
      arguments: '{"consent":"true"}',
    });
    expect(JSON.parse(sent().at(-1).item.output).accepted).toBe(false);
    expect(client.snapshot.status).toBe("connected");
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
  it("preserves the peer while scene updates queue narration and does not resume cancelled tools", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    deliver({ type: "response.created" });
    client.synchronizeStory(new StoryEngine().snapshot);
    client.requestNarration("La stanza è pronta.");
    expect(sent().some((e) => e.type === "response.create")).toBe(false);
    deliver({ type: "response.done", response: { status: "completed" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    deliver({
      type: "response.function_call_arguments.done",
      call_id: "cancelled",
      name: "return_to_reality",
      arguments: "{}",
    });
    deliver({ type: "response.done", response: { status: "cancelled" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
});
afterEach(() => {
  client.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("WebRTC voice lifecycle (mocked transport)", () => {
  it("does not ask for microphone on construction", () => {
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(client.snapshot.status).toBe("off");
  });
  it("uses GA SDP exchange, controls mic and stops tracks/peer", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    expect(client.snapshot.status).toBe("connected");
    expect(FakePeer.latest.addTrack).toHaveBeenCalledWith(track, stream);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls",
      expect.objectContaining({
        body: "mock-offer",
        headers: {
          Authorization: "Bearer ephemeral",
          "Content-Type": "application/sdp",
        },
      }),
    );
    client.mute();
    expect(track.enabled).toBe(false);
    expect(client.levels().input).toBe(0);
    client.mute();
    expect(track.enabled).toBe(true);
    client.stop();
    expect(track.stop).toHaveBeenCalled();
    expect(FakePeer.latest.close).toHaveBeenCalled();
    expect(client.snapshot.status).toBe("off");
    expect(client.levels().output).toBe(0);
  });
  it("stops late mic tracks when the user cancels while permissions are pending", async () => {
    let resolve!: (s: MediaStream) => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise<MediaStream>((r) => {
          resolve = r;
        }),
    );
    const starting = client.start();
    client.stop();
    const { stream, track } = mic();
    resolve(stream);
    await starting;
    expect(track.stop).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(client.snapshot.status).toBe("off");
  });
  it("handles permission denial and allows a fresh start", async () => {
    getUserMedia.mockRejectedValue(
      new DOMException("Denied", "NotAllowedError"),
    );
    await client.start();
    expect(client.snapshot.status).toBe("error");
    expect(client.snapshot.message).toContain("microfono negato");
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    expect(client.snapshot.status).toBe("connected");
  });
  it("cleans up mic on backend error and does not negotiate SDP", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Quota raggiunta" }), {
        status: 429,
      }),
    );
    await client.start();
    expect(track.stop).toHaveBeenCalled();
    expect(client.snapshot.message).toBe("Quota raggiunta");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("closes voice when backgrounded and does not restart it automatically", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    window.dispatchEvent(new Event("pagehide"));
    expect(track.stop).toHaveBeenCalled();
    expect(client.snapshot.status).toBe("off");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(client.snapshot.status).toBe("off");
  });
  it("uses audio buffer lifecycle, not early response.done, for speaking animation", () => {
    expect(stateForEvent("input_audio_buffer.speech_started")).toBe(
      "listening",
    );
    expect(stateForEvent("input_audio_buffer.speech_stopped")).toBe("thinking");
    expect(stateForEvent("output_audio_buffer.started")).toBe("speaking");
    expect(stateForEvent("output_audio_buffer.cleared")).toBe("listening");
    expect(stateForEvent("response.done")).toBeUndefined();
  });
  it("recovers when the browser refuses an AudioContext", async () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("Audio non disponibile");
        }
      },
    );
    await client.start();
    expect(client.snapshot.status).toBe("error");
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe("protected conversation in a noisy headset", () => {
  beforeEach(() => client.toggleInterruptions());
  const deliver = (event: object) =>
    (FakePeer.latest.channel.onmessage as (event: { data: string }) => void)({
      data: JSON.stringify(event),
    });
  it("keeps input off until audio playback finishes, even after response generation ends", async () => {
    vi.useFakeTimers();
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: expect.objectContaining({
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true,
        }),
      }),
    );
    deliver({ type: "output_audio_buffer.started" });
    expect(track.enabled).toBe(false);
    expect(client.snapshot.inputBlocked).toBe(true);
    deliver({ type: "response.done", response: { status: "completed" } });
    deliver({ type: "input_audio_buffer.speech_started" });
    expect(client.snapshot.state).toBe("speaking");
    expect(track.enabled).toBe(false);
    deliver({ type: "output_audio_buffer.stopped" });
    await vi.advanceTimersByTimeAsync(349);
    expect(track.enabled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(track.enabled).toBe(true);
  });
  it("takes the floor explicitly without losing the peer", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    deliver({ type: "response.created" });
    deliver({ type: "output_audio_buffer.started" });
    client.interrupt();
    expect(track.enabled).toBe(true);
    expect(client.snapshot.state).toBe("listening");
    const events = FakePeer.latest.channel.send.mock.calls.map(
      ([s]) => JSON.parse(s).type,
    );
    expect(events).toContain("response.cancel");
    expect(events).toContain("output_audio_buffer.clear");
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
  it("honors manual mute and cannot reopen a stopped microphone with a late timer", async () => {
    vi.useFakeTimers();
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    deliver({ type: "output_audio_buffer.started" });
    client.mute(true);
    deliver({ type: "output_audio_buffer.stopped" });
    await vi.advanceTimersByTimeAsync(400);
    expect(track.enabled).toBe(false);
    expect(client.snapshot.muted).toBe(true);
    client.mute(false);
    expect(track.enabled).toBe(true);
    deliver({ type: "output_audio_buffer.started" });
    deliver({ type: "output_audio_buffer.stopped" });
    client.stop();
    await vi.advanceTimersByTimeAsync(400);
    expect(track.enabled).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(client.snapshot.status).toBe("off");
  });
  it("lets the user opt back into voice interruption without leaving the session", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    deliver({ type: "output_audio_buffer.started" });
    expect(track.enabled).toBe(false);
    client.toggleInterruptions();
    expect(track.enabled).toBe(true);
    const updates = FakePeer.latest.channel.send.mock.calls
      .map(([s]) => JSON.parse(s))
      .filter((e) => e.type === "session.update");
    expect(
      updates.at(-1).session.audio.input.turn_detection.interrupt_response,
    ).toBe(false);
    client.toggleInterruptions();
    expect(track.enabled).toBe(false);
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
});

describe("recognizable speech interruptions", () => {
  const deliver = (event: object) =>
    (FakePeer.latest.channel.onmessage as (e: { data: string }) => void)({
      data: JSON.stringify(event),
    });
  const sent = () =>
    FakePeer.latest.channel.send.mock.calls.map(([s]) => JSON.parse(s));
  const speech = (id: string, text: string, duration = 900) => {
    deliver({
      type: "input_audio_buffer.speech_started",
      item_id: id,
      audio_start_ms: 1000,
    });
    deliver({
      type: "input_audio_buffer.speech_stopped",
      item_id: id,
      audio_end_ms: 1000 + duration,
    });
    deliver({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: id,
      transcript: text,
    });
  };
  it("leaves microphone open but does not cancel audio for VAD, coughs or very short noise", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    deliver({ type: "response.created" });
    deliver({ type: "output_audio_buffer.started" });
    expect(track.enabled).toBe(true);
    speech("noise", "[rumore]");
    speech("cough", "eh");
    speech("click", "ciao", 100);
    expect(sent().some((e) => e.type === "response.cancel")).toBe(false);
    expect(
      sent().filter((e) => e.type === "conversation.item.delete"),
    ).toHaveLength(3);
    expect(client.snapshot.state).toBe("speaking");
  });
  it("interrupts a real phrase, keeps the user audio and waits for cancellation before answering once", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    deliver({ type: "response.created" });
    deliver({ type: "output_audio_buffer.started" });
    speech("word", "Aspetta, ho una domanda");
    expect(sent().map((e) => e.type)).toContain("response.cancel");
    expect(sent().map((e) => e.type)).toContain("output_audio_buffer.clear");
    expect(sent().map((e) => e.type)).not.toContain("input_audio_buffer.clear");
    expect(sent().some((e) => e.type === "response.create")).toBe(false);
    deliver({ type: "response.done", response: { status: "cancelled" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    deliver({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "word",
      transcript: "Aspetta",
    });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
  it("recognizes a single word even when generation already finished and audio is buffered", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    deliver({ type: "output_audio_buffer.started" });
    deliver({ type: "response.done", response: { status: "completed" } });
    speech("no", "No", 550);
    expect(sent().map((e) => e.type)).toContain("output_audio_buffer.clear");
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
  });
  it("responds to short normal answers and recovers from failed transcription without disconnecting", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    speech("yes", "Sì", 400);
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    deliver({
      type: "conversation.item.input_audio_transcription.failed",
      item_id: "bad",
    });
    expect(client.snapshot.status).toBe("connected");
    expect(client.snapshot.message).toContain("ripetere");
  });
});

describe("consecutive turns and recovery", () => {
  const deliver = (event: object) =>
    (FakePeer.latest.channel.onmessage as (e: { data: string }) => void)({ data: JSON.stringify(event) });
  const sent = () => FakePeer.latest.channel.send.mock.calls.map(([s]) => JSON.parse(s));
  const speech = (id: string, transcript: string) => {
    deliver({ type: "input_audio_buffer.speech_started", item_id: id, audio_start_ms: 1000 });
    deliver({ type: "input_audio_buffer.speech_stopped", item_id: id, audio_end_ms: 1900 });
    deliver({ type: "conversation.item.input_audio_transcription.completed", item_id: id, transcript });
  };
  it("does not display listening or request a microphone when XR focus returns with voice off", async () => {
    client.setInputSuspended(true);
    client.setInputSuspended(false);
    expect(client.snapshot.activity).toBe("off");
    expect(client.snapshot.state).toBe("idle");
    expect(getUserMedia).not.toHaveBeenCalled();
    getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    await client.start();
    client.setInputSuspended(false);
    expect(client.snapshot.activity).toBe("error");
    expect(client.snapshot.state).toBe("error");
  });
  it("shows a device-paused microphone separately from user mute and resumes on the track event", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    track.muted = true;
    track.onmute?.(new Event("mute"));
    expect(client.snapshot.microphone).toBe("paused");
    expect(client.snapshot.activity).toBe("paused");
    expect(client.snapshot.muted).toBe(false);
    track.muted = false;
    track.onunmute?.(new Event("unmute"));
    expect(client.snapshot.activity).toBe("ready");
    expect(client.snapshot.microphone).toBe("live");
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
  it("resumes input after temporary XR focus loss without overriding a manual mute", async () => {
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    client.setInputSuspended(true);
    expect(track.enabled).toBe(false);
    expect(client.snapshot.muted).toBe(false);
    expect(client.snapshot.activity).toBe("paused");
    client.setInputSuspended(false);
    expect(track.enabled).toBe(true);
    expect(client.snapshot.activity).toBe("ready");
    client.mute(true);
    client.setInputSuspended(true);
    client.setInputSuspended(false);
    expect(track.enabled).toBe(false);
    expect(client.snapshot.activity).toBe("muted");
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(FakePeer.latest.close).not.toHaveBeenCalled();
  });
  it("does not leave the response queue locked when cancellation reports no active response", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    deliver({ type: "response.created", response: { id: "first" } });
    deliver({ type: "output_audio_buffer.started", response_id: "first" });
    speech("question", "Aspetta, vorrei chiederti una cosa");
    deliver({ type: "error", error: { code: "response_cancel_not_active" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    expect(client.snapshot.status).toBe("connected");
  });
  it("recovers a missing cancellation acknowledgement and ignores the late old completion", async () => {
    vi.useFakeTimers();
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    deliver({ type: "response.created", response: { id: "old" } });
    deliver({ type: "output_audio_buffer.started", response_id: "old" });
    speech("question", "Aspetta, ho una domanda");
    await vi.advanceTimersByTimeAsync(1500);
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
    deliver({ type: "response.created", response: { id: "new" } });
    deliver({ type: "output_audio_buffer.started", response_id: "new" });
    deliver({ type: "response.done", response: { id: "old", status: "cancelled" } });
    expect(client.snapshot.activity).toBe("speaking");
  });
  it("preserves a validated user turn if its create races an existing server response", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    speech("question", "Parliamo di sostenibilità");
    deliver({ type: "error", error: { code: "conversation_already_has_active_response" } });
    deliver({ type: "response.done", response: { id: "server-active", status: "completed" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(2);
    expect(client.snapshot.status).toBe("connected");
  });
  it("completes three turns and displays when it is ready to listen again", async () => {
    vi.useFakeTimers();
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    for (let i = 0; i < 3; i++) {
      expect(client.snapshot.activity).toBe("ready");
      speech(`user${i}`, i ? "Parlami degli alberi" : "Mi chiamo Luca");
      deliver({ type: "response.created", response: { id: `reply${i}` } });
      deliver({ type: "output_audio_buffer.started", response_id: `reply${i}` });
      expect(client.snapshot.activity).toBe("speaking");
      deliver({ type: "response.done", response: { id: `reply${i}`, status: "completed" } });
      expect(client.snapshot.activity).toBe("speaking");
      deliver({ type: "output_audio_buffer.stopped", response_id: `reply${i}` });
      await vi.advanceTimersByTimeAsync(350);
      expect(track.enabled).toBe(true);
      expect(client.snapshot.microphone).toBe("live");
    }
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(3);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
  it("ignores late audio-clear and response-done events from a previous turn", async () => {
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    speech("one", "Ciao");
    deliver({ type: "response.created", response: { id: "old" } });
    deliver({ type: "output_audio_buffer.started", response_id: "old" });
    speech("two", "Aspetta");
    deliver({ type: "response.done", response: { id: "old", status: "cancelled" } });
    deliver({ type: "response.created", response: { id: "new" } });
    deliver({ type: "output_audio_buffer.started", response_id: "new" });
    deliver({ type: "output_audio_buffer.cleared", response_id: "old" });
    deliver({ type: "response.done", response: { id: "old", status: "cancelled" } });
    expect(client.snapshot.activity).toBe("speaking");
    speech("three", "Un'altra domanda");
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(2);
    deliver({ type: "response.done", response: { id: "new", status: "cancelled" } });
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(3);
  });
  it("reopens protected input after completed playback falls silent even if stopped is missing", async () => {
    vi.useFakeTimers();
    const { stream, track } = mic();
    getUserMedia.mockResolvedValue(stream);
    await client.start();
    client.toggleInterruptions();
    deliver({ type: "response.created", response: { id: "reply" } });
    deliver({ type: "output_audio_buffer.started", response_id: "reply" });
    deliver({ type: "response.done", response: { id: "reply", status: "completed" } });
    const read = vi.spyOn(client, "levels");
    read.mockReturnValue({ input: 0, output: 0.1, audible: true });
    await vi.advanceTimersByTimeAsync(1200);
    expect(track.enabled).toBe(false);
    read.mockReturnValue({ input: 0, output: 0, audible: true });
    await vi.advanceTimersByTimeAsync(3000);
    expect(track.enabled).toBe(true);
    expect(client.snapshot.activity).toBe("ready");
    read.mockRestore();
    speech("next", "Continuiamo");
    expect(sent().filter((e) => e.type === "response.create")).toHaveLength(1);
  });
  it("returns to ready after rejected noise and a lost transcription without dropping the peer", async () => {
    vi.useFakeTimers();
    getUserMedia.mockResolvedValue(mic().stream);
    await client.start();
    speech("noise", "[rumore]");
    expect(client.snapshot.activity).toBe("ready");
    deliver({ type: "input_audio_buffer.speech_started", item_id: "lost", audio_start_ms: 1000 });
    expect(client.snapshot.activity).toBe("listening");
    deliver({ type: "input_audio_buffer.speech_stopped", item_id: "lost", audio_end_ms: 1800 });
    expect(client.snapshot.activity).toBe("processing");
    await vi.advanceTimersByTimeAsync(10000);
    expect(client.snapshot.activity).toBe("ready");
    expect(client.snapshot.message).toContain("ripetere");
    expect(client.snapshot.status).toBe("connected");
    deliver({ type: "conversation.item.input_audio_transcription.completed", item_id: "lost", transcript: "Risposta tardiva" });
    expect(sent().some((e) => e.type === "response.create")).toBe(false);
  });
});

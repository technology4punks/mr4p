// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient, stateForEvent } from "../src/audio/realtimeClient";
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

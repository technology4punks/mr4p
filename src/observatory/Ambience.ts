import type { CityState } from "../decision/DecisionEngine";
// Quiet procedural soundscape; no downloads, microphone input or extra audio context.
export class Ambience {
  private gain?: GainNode;
  private noise?: AudioBufferSourceNode;
  private hum?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private context?: AudioContext;
  private lastUpdate = 0;
  private amount = 0;
  private immersion = 0;
  private enabled = false;
  private city?: CityState;
  private details: {
    oscillator: OscillatorNode;
    gain: GainNode;
    panner: StereoPannerNode;
    id: string;
  }[] = [];
  setCity(state: CityState) {
    this.city = state;
  }
  enable(context?: AudioContext) {
    this.enabled = true;
    if (context && this.context !== context) this.attach(context);
  }
  disable() {
    this.enabled = false;
    if (this.gain) this.gain.gain.value = 0;
  }
  attach(context: AudioContext) {
    this.dispose();
    this.context = context;
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(context.destination);
    this.filter = context.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 180;
    this.filter.connect(this.gain);
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let seed = 41;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296 - 0.5) * 0.5;
    }
    this.noise = context.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.noise.connect(this.filter);
    this.noise.start();
    this.hum = context.createOscillator();
    this.hum.frequency.value = 65;
    const low = context.createGain();
    low.gain.value = 0.05;
    this.hum.connect(low);
    low.connect(this.filter);
    this.hum.start();
    for (const [id, frequency, pan] of [
      ["MOB_TRAM", 160, 0],
      ["BIO_RIVER", 420, -0.4],
      ["GREEN_PARK", 880, -0.25],
      ["LOG_CARGO", 230, 0.35],
      ["WASTE_ENERGY", 95, 0.6],
    ] as const) {
      const oscillator = context.createOscillator(),
        gain = context.createGain(),
        panner = context.createStereoPanner();
      oscillator.type = id === "GREEN_PARK" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0;
      panner.pan.value = pan;
      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(this.gain);
      oscillator.start();
      this.details.push({ id, oscillator, gain, panner });
    }
  }
  update(amount: number, immersion: number, duck: boolean, time: number) {
    this.amount = amount;
    this.immersion = immersion;
    if (
      !this.gain ||
      !this.filter ||
      !this.hum ||
      !this.context ||
      time - this.lastUpdate < 100
    )
      return;
    this.lastUpdate = time;
    const now = this.context.currentTime;
    this.gain.gain.setTargetAtTime(
      this.enabled ? this.immersion * (duck ? 0.04 : 0.14) : 0,
      now,
      0.15,
    );
    const frequency = 65;
    this.filter.frequency.setTargetAtTime(180 + this.amount * 650, now, 0.3);
    this.hum.frequency.setTargetAtTime(frequency - this.amount * 15, now, 0.3);
    for (const detail of this.details) {
      const active = this.city?.active.includes(detail.id);
      const moving = detail.id === "MOB_TRAM" || detail.id === "LOG_CARGO";
      const pass = (1 + Math.sin(time / (moving ? 1800 : 2700))) / 2;
      detail.gain.gain.setTargetAtTime(
        active ? 0.012 * (0.2 + 0.8 * pass) : 0,
        now,
        0.4,
      );
      if (moving)
        detail.panner.pan.setTargetAtTime(
          Math.sin(time / 4000) * 0.65,
          now,
          0.3,
        );
    }
  }
  dispose() {
    for (const detail of this.details) {
      detail.oscillator.stop();
      detail.oscillator.disconnect();
      detail.gain.disconnect();
      detail.panner.disconnect();
    }
    this.details = [];
    this.noise?.stop();
    this.hum?.stop();
    this.noise?.disconnect();
    this.hum?.disconnect();
    this.filter?.disconnect();
    this.gain?.disconnect();
    this.noise = undefined;
    this.hum = undefined;
    this.filter = undefined;
    this.gain = undefined;
    this.context = undefined;
  }
}

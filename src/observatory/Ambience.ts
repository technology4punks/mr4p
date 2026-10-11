// Quiet procedural soundscape; no downloads, microphone input or extra audio context.
import type { Theme } from "../story/scenarios";
export class Ambience {
  private theme: Theme = "environmental";
  setTheme(theme: Theme) {
    this.theme = theme;
  }
  private gain?: GainNode;
  private noise?: AudioBufferSourceNode;
  private hum?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private context?: AudioContext;
  private lastUpdate = 0;
  private amount = 0;
  private immersion = 0;
  private enabled = false;
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
    const frequency =
      this.theme === "economic" ? 95 : this.theme === "social" ? 42 : 65;
    this.filter.frequency.setTargetAtTime(
      180 + this.amount * (this.theme === "social" ? 950 : 650),
      now,
      0.3,
    );
    this.hum.frequency.setTargetAtTime(frequency - this.amount * 15, now, 0.3);
  }
  dispose() {
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

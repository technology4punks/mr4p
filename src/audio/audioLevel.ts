export function rms(samples: ArrayLike<number>): number {
  if (!samples.length) return 0;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  return Math.sqrt(energy / samples.length);
}
export function speechEnvelope(
  previous: number,
  energy: number,
  delta: number,
  audible: boolean,
): number {
  if (!audible) return 0;
  const target = energy < 0.008 ? 0 : Math.min(1, energy * 9);
  return (
    previous +
    (target - previous) * (1 - Math.exp(-delta * (target > previous ? 24 : 12)))
  );
}
export class AudioLevel {
  readonly analyser: AnalyserNode;
  private samples = new Float32Array(512);
  constructor(context: AudioContext, stream: MediaStream) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 512;
    this.source = context.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    // No connection to destination: the media element alone plays audio.
  }
  private source: MediaStreamAudioSourceNode;
  read() {
    this.analyser.getFloatTimeDomainData(this.samples);
    return rms(this.samples);
  }
  dispose() {
    this.source.disconnect();
    this.analyser.disconnect();
  }
}

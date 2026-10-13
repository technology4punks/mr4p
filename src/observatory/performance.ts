export type Quality = "high" | "balanced" | "low";
export class AdaptiveQuality {
  quality: Quality = "high";
  private slow = 0;
  sample(fps: number, immersive: boolean) {
    const target = immersive ? 72 : 50;
    if (fps > 0 && fps < target * 0.85) this.slow++;
    else this.slow = Math.max(0, this.slow - 1);
    if (this.slow >= 3 && this.quality !== "low") {
      this.quality = this.quality === "high" ? "balanced" : "low";
      this.slow = 0;
      return true;
    }
    return false;
  }
  get pixelRatio() {
    return this.quality === "high"
      ? 1.5
      : this.quality === "balanced"
        ? 1.15
        : 0.85;
  }
  get framebufferScale() {
    return this.quality === "high"
      ? 1
      : this.quality === "balanced"
        ? 0.85
        : 0.7;
  }
}
export function smoothTransition(time: number, duration: number) {
  const x = Math.min(1, Math.max(0, time / duration));
  return x * x * (3 - 2 * x);
}

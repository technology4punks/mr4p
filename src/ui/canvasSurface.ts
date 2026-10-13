/** Shared glass palette; rasterized once, no blur/post-processing in XR. */
export const glass = {
  panel: "rgba(12, 28, 36, 0.64)",
  card: "rgba(12, 28, 36, 0.58)",
  button: "rgba(30, 55, 65, 0.72)",
  selected: "rgba(47, 104, 95, 0.88)",
  border: "rgba(190, 231, 226, 0.28)",
  accent: "rgba(157, 239, 219, 0.82)",
};

/** Rounded alpha edges use a canvas texture, without XR post-processing. */
export function canvasSurface(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, border = "#3c545d", radius = 24) {
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.roundRect(3, 3, width - 6, height - 6, radius);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

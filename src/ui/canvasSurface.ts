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

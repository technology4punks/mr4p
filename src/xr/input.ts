/** One activation per press, shared by native events and polled fallback inputs. */
export class XRInputLatch {
  private down = new Map<string, boolean>();
  private last = new Map<string, number>();
  private axisTime = 0;
  private axisDirection = "";
  edge(key: string, pressed: boolean, now: number) {
    const previous = this.down.get(key) ?? false;
    this.down.set(key, pressed);
    if (!pressed || previous || now - (this.last.get(key) ?? -Infinity) < 250)
      return false;
    this.last.set(key, now);
    return true;
  }
  release(key: string, now?: number) {
    this.down.set(key, false);
    if (now !== undefined) this.last.set(key, now);
  }
  axis(x: number, y: number, now: number): [number, number] | undefined {
    const horizontal =
      Math.abs(x) > 0.65 && Math.abs(x) > Math.abs(y) ? Math.sign(x) : 0;
    const vertical = Math.abs(y) > 0.65 && !horizontal ? Math.sign(y) : 0;
    if (!horizontal && !vertical) {
      this.axisDirection = "";
      return;
    }
    const direction = horizontal + "," + vertical;
    if (direction !== this.axisDirection || now - this.axisTime > 350) {
      this.axisDirection = direction;
      this.axisTime = now;
      return [horizontal, vertical];
    }
  }
}

/** Decode a small moving window, retain only compressed frames for quick reversal. */
export class AtelierSequence {
  private blobs = new Map<number, Blob>();
  private bitmaps = new Map<number, ImageBitmap>();
  private fetching = new Map<number, AbortController>();
  private decoding = new Set<number>();
  private unavailable = new Set<number>();
  private wanted = 0;
  private painted = -1;
  private active = false;
  private destroyed = false;
  private generation = 0;
  private context: CanvasRenderingContext2D;
  private count = 120;
  private cacheLimit = 10;

  constructor(
    private canvas: HTMLCanvasElement,
    private folder: string,
    mobile: boolean,
    private onFailure: () => void,
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || typeof createImageBitmap !== 'function') throw new Error('Frame rendering unavailable');
    this.context = context;
    canvas.width = mobile ? 768 : 1280;
    canvas.height = mobile ? 432 : 720;
  }

  setActive(active: boolean) {
    this.active = active && !document.hidden;
    if (this.active) {
      this.paintNearest();
      this.pumpNetwork();
      this.pumpDecode();
    } else {
      // Stop speculative downloads and release decoded surfaces off-screen.
      this.fetching.forEach(controller => controller.abort());
      this.bitmaps.forEach(bitmap => bitmap.close());
      this.bitmaps.clear();
      this.generation++;
    }
  }

  setProgress(progress: number) {
    this.wanted = Math.round(Math.max(0, Math.min(1, progress)) * (this.count - 1));
    if (!this.active || this.destroyed) return;
    this.paintNearest();
    this.pumpDecode();
    this.pumpNetwork();
  }

  private paintNearest() {
    if (!this.active || this.destroyed || !this.bitmaps.size) return;
    const index = [...this.bitmaps.keys()].reduce((best, index) =>
      Math.abs(index - this.wanted) < Math.abs(best - this.wanted) ? index : best);
    if (index === this.painted) return;
    const bitmap = this.bitmaps.get(index)!;
    this.context.drawImage(bitmap, 0, 0, this.canvas.width, this.canvas.height);
    this.painted = index;
    this.canvas.dataset.frame = String(index);
    this.canvas.parentElement!.dataset.frameReady = '';
  }

  private pumpDecode() {
    if (!this.active || this.destroyed) return;
    // Target first, then a short neighborhood in either direction. Never decode all 120 images.
    const candidates = [...this.blobs.keys()]
      .filter(index => !this.bitmaps.has(index) && !this.decoding.has(index))
      .sort((a, b) => Math.abs(a - this.wanted) - Math.abs(b - this.wanted));
    const nearby = candidates.filter(index => Math.abs(index - this.wanted) <= 4);
    // A downloaded coarse frame can paint while a missing exact frame arrives.
    if (!this.bitmaps.has(this.wanted) && this.blobs.size && !nearby.length) {
      const closest = [...this.blobs.keys()].reduce((best, index) =>
        Math.abs(index - this.wanted) < Math.abs(best - this.wanted) ? index : best);
      if (!this.bitmaps.has(closest) && !this.decoding.has(closest)) nearby.push(closest);
    }
    for (const index of nearby) {
      if (this.decoding.size >= 2) break;
      this.decoding.add(index);
      const generation = this.generation;
      createImageBitmap(this.blobs.get(index)!).then(bitmap => {
        if (this.destroyed || !this.active || generation !== this.generation) { bitmap.close(); return; }
        this.bitmaps.set(index, bitmap);
        while (this.bitmaps.size > this.cacheLimit) {
          const furthest = [...this.bitmaps.keys()].reduce((worst, key) =>
            Math.abs(key - this.wanted) > Math.abs(worst - this.wanted) ? key : worst);
          this.bitmaps.get(furthest)!.close();
          this.bitmaps.delete(furthest);
        }
        this.paintNearest();
      }).catch(() => {
        this.blobs.delete(index);
        this.unavailable.add(index);
      }).finally(() => {
        this.decoding.delete(index);
        if (!this.destroyed && this.unavailable.size === this.count) { this.onFailure(); return; }
        this.pumpDecode();
      });
    }
  }

  private pumpNetwork() {
    if (!this.active || this.destroyed) return;
    if (this.blobs.size + this.unavailable.size === this.count) return;
    const missing = Array.from({ length: this.count }, (_, index) => index)
      .filter(index => !this.blobs.has(index) && !this.fetching.has(index) && !this.unavailable.has(index));
    // First cover the whole story sparsely, prioritizing the current scroll position.
    missing.sort((a, b) => {
      const score = (index: number) => Math.abs(index - this.wanted) <= 4
        ? Math.abs(index - this.wanted) - 1000
        : (index % 6 === 0 || index === this.count - 1 ? -500 : 0) + Math.abs(index - this.wanted);
      return score(a) - score(b);
    });
    for (const index of missing) {
      if (this.fetching.size >= 4) break;
      const controller = new AbortController();
      this.fetching.set(index, controller);
      fetch(this.folder + String(index).padStart(3, '0') + '.webp', { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('Frame unavailable');
        const blob = await response.blob();
        if (!this.destroyed && !controller.signal.aborted) this.blobs.set(index, blob);
      }).catch(() => {
        if (!controller.signal.aborted) this.unavailable.add(index);
      }).finally(() => {
        this.fetching.delete(index);
        if (this.destroyed) return;
        if (this.unavailable.size === this.count) { this.onFailure(); return; }
        this.pumpDecode();
        this.pumpNetwork();
      });
    }
  }

  destroy() {
    this.destroyed = true;
    this.setActive(false);
    this.blobs.clear();
    this.canvas.parentElement!.removeAttribute('data-frame-ready');
    delete this.canvas.dataset.frame;
  }
}

const cover = document.querySelector<HTMLElement>("[data-atelier-cover]");
if (cover) {
  const image = cover.querySelector<HTMLImageElement>("[data-cover-image]")!;
  let selection = 0;
  const buttons = [...cover.querySelectorAll<HTMLButtonElement>("[data-cover-view]")];
  buttons.forEach(button => {
    button.disabled = false;
    button.addEventListener("click", async () => {
      const token = ++selection;
      const preview = new Image();
      preview.src = button.dataset.coverView!;
      try { await preview.decode(); } catch { return; }
      if (token !== selection) return;
      image.getAnimations().forEach(a=>a.cancel());
      image.src = preview.src;
      image.alt = button.dataset.coverAlt!;
      cover.querySelector("[data-cover-caption]")!.textContent = button.dataset.coverCaptionValue!;
      buttons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
      if(document.documentElement.dataset.demoMotion!=="reduce") image.animate([{opacity:.45},{opacity:1}],{duration:360,easing:"cubic-bezier(.22,1,.36,1)"});
    });
  });
  addEventListener("brand-motion",()=>image.getAnimations().forEach(a=>a.cancel()));
}

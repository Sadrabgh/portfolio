import { AtelierSequence } from './atelier-sequence';
const root = document.documentElement;
const scene = document.querySelector<HTMLElement>('[data-at-scroll]');
const canvas = scene?.querySelector<HTMLCanvasElement>('[data-at-sequence]');
if (scene && canvas) {
  const card = canvas.parentElement!;
  const copy = scene.querySelector<HTMLElement>('[data-at-hero-copy]')!;
  const progressBar = scene.querySelector<HTMLElement>('[data-at-progress]')!;
  const chapter = scene.querySelector<HTMLElement>('[data-at-chapter]')!;
  const hint = scene.querySelector<HTMLElement>('[data-at-scroll-hint]')!;
  const callouts = [...scene.querySelectorAll<HTMLElement>('.at-callout')];
  const chapters = ['۰۱ / در میان درختان', '۰۲ / از آستانه تا خانه', '۰۳ / نشیمن رو به بیشه'];
  const mobile = matchMedia('(max-width:700px)');
  const motion = matchMedia('(prefers-reduced-motion:reduce)');
  let renderer: AtelierSequence | undefined;
  let mobileSource = mobile.matches;
  let frame = 0;
  let reduced = false;
  let failed = false;
  let active = true;
  let lastChapter = -1;
  let sceneTop = 0;
  let distance = 1;

  function measure() {
    // Geometry changes only on resize/motion changes, not after every style write.
    sceneTop = scene!.getBoundingClientRect().top + scrollY;
    distance = Math.max(1, scene!.offsetHeight - card.offsetHeight);
    schedule();
  }
  function schedule() {
    if (!frame && active && !document.hidden && !reduced && !failed) frame = requestAnimationFrame(update);
  }
  function update() {
    frame = 0;
    if (reduced || failed || !active) return;
    const progress = Math.max(0, Math.min(1, (scrollY - sceneTop) / distance));
    const opacity = String(Math.max(0, 1 - progress * 4));
    progressBar.style.transform = `scaleX(${progress})`;
    copy.style.opacity = opacity;
    callouts.forEach(callout => callout.style.opacity = opacity);
    copy.style.transform = `translateY(${-Math.min(progress, .3) * 90}px)`;
    const chapterIndex = progress < .32 ? 0 : progress < .52 ? 1 : 2;
    if (chapterIndex !== lastChapter) { chapter.textContent = chapters[chapterIndex]; lastChapter = chapterIndex; }
    renderer?.setProgress(progress);
  }
  function syncMotion() {
    reduced = root.dataset.demoMotion === 'reduce' || motion.matches;
    scene!.dataset.atScrub = reduced || failed ? 'static' : 'full';
    hint.textContent = reduced || failed ? 'کشف پروژه‌های آتلیه' : 'برای کشف فضا اسکرول کنید';
    if (reduced || failed) {
      cancelAnimationFrame(frame);
      frame = 0;
      renderer?.destroy();
      renderer = undefined;
      copy.style.removeProperty('opacity');
      callouts.forEach(callout => callout.style.removeProperty('opacity'));
      copy.style.removeProperty('transform');
      progressBar.style.transform = 'scaleX(0)';
      chapter.textContent = 'خانهٔ بیشه / مطالعهٔ مفهومی';
      lastChapter = -1;
      return;
    }
    if (renderer && mobile.matches !== mobileSource) { renderer.destroy(); renderer = undefined; }
    if (!renderer) {
      mobileSource = mobile.matches;
      try {
        renderer = new AtelierSequence(canvas!, mobileSource ? canvas!.dataset.mobileFrames! : canvas!.dataset.desktopFrames!, mobileSource, () => { failed = true; syncMotion(); });
      } catch { failed = true; syncMotion(); return; }
    }
    renderer.setActive(active);
    measure();
  }
  const visibility = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    renderer?.setActive(active);
    if (active) schedule();
    else { cancelAnimationFrame(frame); frame = 0; }
  });
  visibility.observe(scene);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  mobile.addEventListener('change', syncMotion);
  motion.addEventListener('change', syncMotion);
  window.addEventListener('brand-motion', syncMotion);
  window.addEventListener('pageshow', () => { renderer?.setActive(active); measure(); });
  document.addEventListener('visibilitychange', () => {
    renderer?.setActive(active);
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; renderer?.setActive(false); });
  syncMotion();
}
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-at-tab]')];
const panels = [...document.querySelectorAll<HTMLElement>('[data-at-panel]')];
function chooseTab(index: number) {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  panels.forEach((panel, i) => {
    panel.getAnimations().forEach(animation => animation.cancel());
    panel.hidden = i !== index;
    if (i === index && root.dataset.demoMotion !== 'reduce') panel.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  });
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => chooseTab(i));
  tab.addEventListener('keydown', event => {
    let next = i;
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next = (i + 1) % tabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    chooseTab(next);
    tabs[next].focus();
  });
});

export {};
const root = document.documentElement;
const scene = document.querySelector<HTMLElement>('[data-at-scroll]');
const video = scene?.querySelector<HTMLVideoElement>('[data-at-video]');
if (scene && video) {
  const copy = scene.querySelector<HTMLElement>('[data-at-hero-copy]')!;
  const progressBar = scene.querySelector<HTMLElement>('[data-at-progress]')!;
  const chapter = scene.querySelector<HTMLElement>('[data-at-chapter]')!;
  const hint = scene.querySelector<HTMLElement>('[data-at-scroll-hint]')!;
  const callouts = [...scene.querySelectorAll<HTMLElement>('.at-callout')];
  const chapters = ['۰۱ / در میان درختان', '۰۲ / از آستانه تا خانه', '۰۳ / نشیمن رو به بیشه'];
  let frame = 0;
  let reduced = false;
  let failed = false;
  let lastChapter = -1;
  let targetTime = 0;
  let active = true;
  const frameStep = 1 / 24;

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  function seekLatest() {
    if (reduced || failed || !active || document.hidden || video!.readyState < 2 || video!.seeking) return;
    // Only the latest scroll position is decoded. Never queue obsolete seeks.
    if (Math.abs(video!.currentTime - targetTime) >= frameStep / 2) video!.currentTime = targetTime;
  }
  function update() {
    frame = 0;
    if (reduced || failed) return;
    const rect = scene!.getBoundingClientRect();
    const cardHeight = scene!.firstElementChild!.getBoundingClientRect().height;
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - cardHeight)));
    progressBar.style.transform = `scaleX(${progress})`;
    copy.style.opacity = String(Math.max(0, 1 - progress * 4));
    callouts.forEach(callout => callout.style.opacity = String(Math.max(0, 1 - progress * 4)));
    copy.style.transform = `translateY(${-Math.min(progress, .3) * 90}px)`;
    const chapterIndex = progress < .32 ? 0 : progress < .52 ? 1 : 2;
    if (chapterIndex !== lastChapter) {
      chapter.textContent = chapters[chapterIndex];
      lastChapter = chapterIndex;
    }
    if (Number.isFinite(video!.duration)) targetTime = Math.min(Math.max(0, video!.duration - frameStep), progress * video!.duration);
    seekLatest();
  }
  function syncMotion() {
    reduced = root.dataset.demoMotion === 'reduce' || matchMedia('(prefers-reduced-motion:reduce)').matches;
    scene!.dataset.atScrub = reduced || failed ? 'static' : 'full';
    hint.textContent = reduced || failed ? 'کشف پروژه‌های آتلیه' : 'برای کشف فضا اسکرول کنید';
    if (reduced || failed) {
      cancelAnimationFrame(frame);
      frame = 0;
      copy.style.removeProperty('opacity');
      callouts.forEach(callout => callout.style.removeProperty('opacity'));
      copy.style.removeProperty('transform');
      progressBar.style.transform = 'scaleX(0)';
      chapter.textContent = 'خانهٔ بیشه / مطالعهٔ مفهومی';
      lastChapter = -1;
      video!.pause();
      video!.removeAttribute('data-frame-ready');
      if (video!.hasAttribute('src')) {
        video!.removeAttribute('src');
        video!.load();
      }
      return;
    }
    if (!video!.hasAttribute('src')) {
      video!.src = matchMedia('(max-width:700px)').matches ? video!.dataset.mobileSrc! : video!.dataset.src!;
      video!.preload = 'auto';
      video!.load();
    }
    schedule();
  }
  video.addEventListener('loadedmetadata', schedule);
  video.addEventListener('loadeddata', () => { video.dataset.frameReady = ''; schedule(); });
  video.addEventListener('seeked', () => { video.dataset.frameReady = ''; seekLatest(); });
  video.addEventListener('error', () => { failed = true; syncMotion(); });
  video.addEventListener('play', () => video.pause());
  const visibility = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active) schedule();
  });
  visibility.observe(scene);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('brand-motion', syncMotion);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); video.pause(); });
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

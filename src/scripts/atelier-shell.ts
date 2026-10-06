export {};
const dialog = document.querySelector<HTMLDialogElement>('#at-menu');
const trigger = document.querySelector<HTMLButtonElement>('[data-at-menu-open]');
let previousOverflow = '';
trigger?.addEventListener('click', () => {
  if (!dialog || dialog.open) return;
  previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  trigger.setAttribute('aria-expanded', 'true');
});
dialog?.querySelector('[data-at-menu-close]')?.addEventListener('click', () => dialog.close());
dialog?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => dialog.close()));
dialog?.addEventListener('close', () => {
  document.body.style.overflow = previousOverflow;
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.focus();
});
dialog?.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
});
window.addEventListener('pagehide', () => { if (dialog?.open) dialog.close(); });

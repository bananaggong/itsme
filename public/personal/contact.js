import { copyText } from '/utils.js?v=8c1091ee90';
for (const button of document.querySelectorAll('.ct-copy')) {
  if (!navigator.clipboard) continue;
  const status = button.closest('.ct-field').querySelector('.ct-status');
  button.hidden = false;
  let timer;
  button.addEventListener('click', async () => {
    if (!(await copyText(button.dataset.copy))) return;
    button.classList.add('is-copied');
    status.textContent = `${button.dataset.copy} 복사 완료`;
    clearTimeout(timer);
    timer = setTimeout(() => {button.classList.remove('is-copied'); status.textContent = '';}, 1800);
  });
}

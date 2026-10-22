const introTile = document.querySelector('.tile--intro');
const introToggle = introTile?.querySelector('.intro-toggle');
const introMore = introTile?.querySelector('.intro-more');

if (introTile && introToggle && introMore) {
  const body = introTile.querySelector('.intro-body');
  const label = introToggle.querySelector('span');
  const updateOverflow = () => {
    introTile.classList.toggle('has-preview-overflow', body.scrollHeight > body.clientHeight + 1);
  };

  // Without JavaScript, the full introduction stays readable.
  introMore.hidden = true;
  introToggle.hidden = false;
  introTile.classList.add('is-collapsible');
  updateOverflow();
  new ResizeObserver(updateOverflow).observe(body);

  introToggle.addEventListener('click', () => {
    const expanded = introToggle.getAttribute('aria-expanded') !== 'true';
    introMore.hidden = !expanded;
    introTile.classList.toggle('is-expanded', expanded);
    introToggle.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? '접기' : '더 보기';
    updateOverflow();

    // On long/mobile introductions, keep the card and focused control in view
    // when the text above the collapse button disappears.
    if (!expanded && introTile.getBoundingClientRect().top < 88) {
      window.scrollTo({ top: window.scrollY + introTile.getBoundingClientRect().top - 96, behavior: 'instant' });
    }
    introToggle.focus({ preventScroll: true });
  });
}

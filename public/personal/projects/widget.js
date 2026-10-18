const tile = document.querySelector('.tile--projects');

if (tile) {
  const buttons = [...tile.querySelectorAll('.sw-app')];
  const panels = [...tile.querySelectorAll('.sw-panel')];
  const cards = tile.querySelector('.sw-cards');
  const labelIcon = tile.querySelector('.sw-label-icon');
  const labelName = tile.querySelector('.sw-label-name');
  let selected = 0;

  function measure() {
    const button = buttons[selected].getBoundingClientRect();
    tile.style.setProperty('--caret-x', `${button.left + button.width/2 - cards.getBoundingClientRect().left}px`);
  }

  function select(index) {
    selected = index;
    const active = buttons[index];
    buttons.forEach(button => {
      const current = button === active;
      button.classList.toggle('is-active', current);
      button.setAttribute('aria-pressed', String(current));
    });
    panels.forEach(panel => {
      const current = panel.dataset.app === active.dataset.app;
      panel.hidden = !current;
      panel.classList.toggle('is-active', current);
    });
    labelIcon.src = active.querySelector('img').src;
    labelName.textContent = active.getAttribute('aria-label');
    measure();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') select(index); });
    button.addEventListener('focus', () => select(index));
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      const next = {ArrowRight: (index+1)%buttons.length, ArrowLeft: (index-1+buttons.length)%buttons.length, Home: 0, End: buttons.length-1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus();
    });
  });

  select(0);
  new ResizeObserver(measure).observe(tile);
}

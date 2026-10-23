const tile = document.querySelector('.tile--projects');

if (tile) {
  const links = [...tile.querySelectorAll('.sw-app')];
  const panels = [...tile.querySelectorAll('.sw-panel')];
  const cards = tile.querySelector('.sw-cards');
  const labelIcon = tile.querySelector('.sw-label-icon');
  const labelName = tile.querySelector('.sw-label-name');
  let selected = 0;

  function measure() {
    const link = links[selected].getBoundingClientRect();
    tile.style.setProperty('--caret-x', `${link.left + link.width/2 - cards.getBoundingClientRect().left}px`);
  }

  function select(index) {
    selected = index;
    const active = links[index];
    links.forEach(link => {
      link.classList.toggle('is-active', link === active);
    });
    panels.forEach(panel => {
      const current = panel.dataset.app === active.dataset.app;
      panel.hidden = !current;
      panel.classList.toggle('is-active', current);
    });
    labelIcon.src = active.querySelector('img').src;
    labelName.textContent = active.dataset.name;
    measure();
  }

  links.forEach((link, index) => {
    link.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') select(index); });
    link.addEventListener('focus', () => select(index));
    // Keep native link activation (including Ctrl/Cmd-click and mobile taps).
    link.addEventListener('keydown', event => {
      const next = {ArrowRight: (index+1)%links.length, ArrowLeft: (index-1+links.length)%links.length, Home: 0, End: links.length-1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      links[next].focus();
    });
  });

  select(0);
  new ResizeObserver(measure).observe(tile);
}

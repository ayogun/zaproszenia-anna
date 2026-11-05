(() => {
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const musicFile = body.dataset.musicFile || '';
  const musicBtn = $('music');

  if (musicFile) {
    const audio = new Audio(musicFile);
    let userPaused = false;
    audio.loop = true;
    audio.volume = 0.6;
    audio.preload = 'auto';

    const setUi = (on) => {
      musicBtn.classList.toggle('on', on);
      musicBtn.setAttribute('aria-pressed', String(on));
      $('music-label').textContent = on ? 'Wyłącz muzykę' : 'Włącz muzykę';
    };
    const play = () => {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    };

    audio.addEventListener('playing', () => setUi(true));
    audio.addEventListener('pause', () => setUi(false));
    audio.addEventListener('error', () => { musicBtn.hidden = true; });
    musicBtn.hidden = false;

    musicBtn.addEventListener('click', () => {
      if (!audio.paused) {
        userPaused = true;
        audio.pause();
      } else {
        userPaused = false;
        play();
      }
    });

    const firstGesture = (event) => {
      if (event.target.closest && event.target.closest('#music')) return;
      if (!userPaused && audio.paused) play();
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((event) =>
      window.addEventListener(event, firstGesture, { passive: true })
    );
    play();
  }

  const messages = JSON.parse(body.dataset.messages);
  const sheet = $('sheet');
  const cover = $('p1');
  const messageTemplate = $('message-template');
  const cardAction = $('card-action');
  const previous = $('previous');
  const next = $('next');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = [];
  let current = -1;
  let animating = false;
  let pointerStart = null;
  let suppressClick = false;
  let scrollingToPanel = false;
  let scrollTimer = 0;
  let scrollFrame = 0;

  function updateControls() {
    const last = current >= 0 && current === messages.length - 1;
    previous.setAttribute('aria-disabled', String(current < 0 || animating));
    next.setAttribute('aria-disabled', String(animating || !messages.length));
    cardAction.setAttribute('aria-disabled', String(animating || !messages.length));
    sheet.classList.toggle('is-open', panels.length > 0);
    cardAction.setAttribute('aria-label', !panels.length ? 'Otwórz zaproszenie' : last ? 'Wróć na początek' : 'Pokaż następną wiadomość');
    $('next-label').textContent = !panels.length ? 'Otwórz' : last ? 'Od początku' : 'Dalej';
    $('counter').textContent = `${String(current + 1).padStart(2, '0')} / ${String(messages.length).padStart(2, '0')}`;
  }

  function announceCurrent() {
    const message = messages[current];
    $('announcement').textContent = message
      ? [message.text, message.detail].filter(Boolean).join(' ')
      : 'Początek zaproszenia.';
  }

  function syncCurrentToScroll() {
    if (animating || scrollingToPanel || !panels.length) return;
    const center = (window.innerHeight - 110) / 2;
    let closest = -1;
    let distance = Infinity;
    [cover, ...panels].forEach((panel, index) => {
      const bounds = panel.getBoundingClientRect();
      const panelDistance = Math.abs(bounds.top + bounds.height / 2 - center);
      if (panelDistance < distance) {
        closest = index - 1;
        distance = panelDistance;
      }
    });
    if (closest !== current) {
      current = closest;
      updateControls();
    }
  }

  function scrollToCurrent() {
    const panel = current < 0 ? cover : panels[current];
    const center = (window.innerHeight - 110) / 2;
    const top = Math.max(0, sheet.getBoundingClientRect().top + window.scrollY + panel.offsetTop + panel.offsetHeight / 2 - center);
    const smooth = !reduceMotion && Math.abs(window.scrollY - top) <= window.innerHeight * 2;
    scrollingToPanel = true;
    window.clearTimeout(scrollTimer);
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    scrollTimer = window.setTimeout(() => {
      scrollingToPanel = false;
      syncCurrentToScroll();
    }, smooth ? 850 : 0);
  }

  function goTo(index) {
    if (animating || index < -1 || index >= panels.length || index === current) return;
    current = index;
    updateControls();
    scrollToCurrent();
    announceCurrent();
  }

  function unfoldNext() {
    const index = panels.length;
    const message = messages[index];
    if (!message) return;
    const panel = messageTemplate.content.firstElementChild.cloneNode(true);
    const face = panel.querySelector('.message');
    face.querySelector('.message-text').textContent = message.text;
    face.querySelector('.message-detail').textContent = message.detail || '';
    face.querySelector('.message-detail').hidden = !message.detail;
    face.querySelector('.message-heart').hidden = !message.final;
    face.classList.toggle('final', Boolean(message.final));
    panel.setAttribute('aria-hidden', 'true');
    if (!reduceMotion) panel.classList.add(index % 2 ? 'unfold-backward' : 'unfold-forward');
    sheet.insertBefore(panel, cardAction);
    panels.push(panel);
    current = index;
    animating = true;
    updateControls();
    scrollToCurrent();

    let finished = false;
    let timer = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      panel.classList.remove('unfold-forward', 'unfold-backward');
      panel.removeAttribute('aria-hidden');
      animating = false;
      updateControls();
      announceCurrent();
    };
    if (reduceMotion) {
      finish();
    } else {
      panel.addEventListener('animationend', finish, { once: true });
      timer = window.setTimeout(finish, 1000);
    }
  }

  const advance = () => {
    if (animating || !messages.length) return;
    if (current === messages.length - 1) goTo(-1);
    else if (current + 1 < panels.length) goTo(current + 1);
    else unfoldNext();
  };
  const retreat = () => goTo(current - 1);

  sheet.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    advance();
  });
  previous.addEventListener('click', retreat);
  next.addEventListener('click', advance);

  sheet.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  window.addEventListener('pointerup', (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const horizontal = event.clientX - pointerStart.x;
    const vertical = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(horizontal) < 45 || Math.abs(horizontal) <= Math.abs(vertical)) return;
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 500);
    if (horizontal < 0) advance();
    else retreat();
  });
  window.addEventListener('pointercancel', () => { pointerStart = null; });

  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      advance();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      retreat();
    }
  });
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      syncCurrentToScroll();
    });
  }, { passive: true });
  window.addEventListener('resize', syncCurrentToScroll);
  updateControls();
})();

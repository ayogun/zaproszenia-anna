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
  const stage = $('stage');
  const sheet = $('sheet');
  const p1 = $('p1');
  const p2 = $('p2');
  const cardAction = $('card-action');
  const previous = $('previous');
  const next = $('next');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (value) => (value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2);
  const radians = (degrees) => (degrees * Math.PI) / 180;
  let current = -1;
  let progress = 0;
  let animating = false;
  let pointerStart = null;
  let suppressClick = false;
  let wheelLocked = false;
  let wheelTimer = 0;
  let wheelDistance = 0;

  function updateScene() {
    const angle = -180 * (1 - progress);
    const height = p1.offsetHeight;
    const bottom = Math.max(height, height + height * Math.cos(radians(angle)));
    const availableHeight = Math.max(bottom, stage.offsetHeight - 100);
    p2.style.setProperty('--a2', `${angle}deg`);
    p2.style.setProperty('--shade', (1 - progress) * 0.35);
    sheet.style.transform = `translateY(${Math.max(16, (availableHeight - bottom) / 2)}px)`;
  }

  function updateControls() {
    const open = current >= 0;
    const last = current === messages.length - 1;
    previous.disabled = !open || animating;
    next.disabled = animating;
    sheet.classList.toggle('is-open', open);
    p2.setAttribute('aria-hidden', String(!open));
    cardAction.setAttribute('aria-disabled', String(animating));
    cardAction.setAttribute('aria-label', !open ? 'Otwórz zaproszenie' : last ? 'Wróć na początek' : 'Pokaż następną wiadomość');
    $('next-label').textContent = !open ? 'Otwórz' : last ? 'Od początku' : 'Dalej';
    $('counter').textContent = `${String(current + 1).padStart(2, '0')} / ${String(messages.length).padStart(2, '0')}`;
  }

  function showMessage(index) {
    const message = messages[index];
    $('message-text').textContent = message.text;
    $('message-detail').textContent = message.detail || '';
    $('message-detail').hidden = !message.detail;
    $('message-heart').hidden = !message.final;
    $('message-face').classList.toggle('final', Boolean(message.final));
    $('announcement').textContent = [message.text, message.detail].filter(Boolean).join(' ');
  }

  function animateFold(target, duration, done) {
    if (reduceMotion) {
      progress = target;
      updateScene();
      done();
      return;
    }
    const startProgress = progress;
    const startTime = performance.now();
    const step = (now) => {
      const time = Math.min(1, (now - startTime) / duration);
      progress = startProgress + (target - startProgress) * ease(time);
      updateScene();
      if (time < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }

  function goTo(index) {
    if (animating || index < -1 || index >= messages.length || index === current) return;
    animating = true;
    updateControls();
    const finish = () => {
      animating = false;
      updateControls();
    };

    if (current === -1) {
      current = index;
      showMessage(current);
      updateControls();
      animateFold(1, 650, finish);
    } else if (index === -1) {
      animateFold(0, 450, () => {
        current = -1;
        $('announcement').textContent = 'Początek zaproszenia.';
        finish();
      });
    } else {
      animateFold(0, 350, () => {
        current = index;
        showMessage(current);
        updateControls();
        animateFold(1, 500, finish);
      });
    }
  }

  const advance = () => goTo(current === messages.length - 1 ? -1 : current + 1);
  const retreat = () => goTo(current - 1);

  cardAction.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    advance();
  });
  previous.addEventListener('click', retreat);
  next.addEventListener('click', advance);

  cardAction.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  window.addEventListener('pointerup', (event) => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const horizontal = event.clientX - pointerStart.x;
    const vertical = event.clientY - pointerStart.y;
    pointerStart = null;
    const distance = Math.abs(horizontal) > Math.abs(vertical) ? horizontal : vertical;
    if (Math.abs(distance) < 45) return;
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 500);
    if (distance < 0) advance();
    else retreat();
  });
  window.addEventListener('pointercancel', () => { pointerStart = null; });

  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => { wheelLocked = false; wheelDistance = 0; }, 180);
    if (wheelLocked || animating) return;
    wheelDistance += Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(wheelDistance) < 25) return;
    wheelLocked = true;
    if (wheelDistance > 0) advance();
    else retreat();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      advance();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      retreat();
    }
  });
  window.addEventListener('resize', updateScene);
  updateControls();
  updateScene();
})();

const volumeInput = document.getElementById('volume');
    const volumeValue = document.getElementById('volume-value');
    const status = document.getElementById('playback-status');
    let currentAudio = null;
    let volume = .4;
    try {
      const saved = localStorage.getItem('classroom-volume');
      if (saved !== null && Number.isFinite(Number(saved))) volume = Math.min(1, Math.max(0, Number(saved)));
    } catch {}
    volumeInput.value = String(Math.round(volume * 100));
    volumeValue.textContent = volumeInput.value + '%';

    function clearActiveSound() {
      document.querySelectorAll('.sound-btn').forEach(button => button.classList.remove('active'));
    }
    function stopAllPlayback(message = 'Sound stopped. Ready when you are.') {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      clearActiveSound();
      status.textContent = message;
    }
    async function playLibrarySound(sound, button) {
      stopAllPlayback();
      const audio = new Audio(sound.src);
      currentAudio = audio;
      audio.volume = volume;
      button.classList.add('active');
      status.textContent = 'Playing: ' + sound.label;
      audio.onended = () => {
        if (currentAudio === audio) stopAllPlayback('Ready when you are.');
      };
      const reportError = () => {
        if (currentAudio === audio) stopAllPlayback('Couldn’t play this sound. Please try again.');
      };
      audio.onerror = reportError;
      try { await audio.play(); } catch { reportError(); }
    }
    soundLibrary.forEach(sound => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sound-btn ' + sound.cssClass;
      button.dataset.sound = sound.id;
      button.setAttribute('aria-label', 'Play ' + sound.label);
      button.title = sound.label;
      button.innerHTML = '<span class="icon" aria-hidden="true">' + sound.icon + '</span>';
      if (document.body.classList.contains('classroom-page')) {
        const label = document.createElement('span');
        label.className = 'sound-name';
        label.textContent = sound.label;
        button.appendChild(label);
      }
      button.addEventListener('click', () => playLibrarySound(sound, button));
      const target = document.getElementById(sound.category + '-sounds') || document.getElementById('sound-library');
      target.appendChild(button);
    });
    volumeInput.addEventListener('input', () => {
      volume = Number(volumeInput.value) / 100;
      volumeValue.textContent = volumeInput.value + '%';
      if (currentAudio) currentAudio.volume = volume;
      try { localStorage.setItem('classroom-volume', String(volume)); } catch {}
    });
    document.getElementById('stop-sound-btn').addEventListener('click', () => stopAllPlayback());
    document.addEventListener('keydown', event => { if (event.key === 'Escape') stopAllPlayback(); });

    const namesToggle = document.getElementById('show-names');
    if (namesToggle) namesToggle.addEventListener('change', () => {
      document.body.classList.toggle('show-names', namesToggle.checked);
    });
    window.addEventListener('pagehide', () => stopAllPlayback());

(() => {
  const key = 'diestroyers-tv-theme';
  const root = document.documentElement;
  const exportMode = new URLSearchParams(location.search).has('export');
  root.toggleAttribute('data-tv-export', exportMode);
  let light = false;
  if (!exportMode) {
    try { light = localStorage.getItem(key) === 'light'; } catch { /* Storage can be disabled. */ }
  }

  function applyTheme() {
    if (light) root.dataset.tvTheme = 'grid208';
    else delete root.dataset.tvTheme;
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('tvThemeToggle');
    if (!toggle || exportMode) return;

    function updateLabel() { toggle.textContent = light ? 'Dark mode' : 'Light mode'; }

    updateLabel();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      light = !light;
      applyTheme();
      updateLabel();
      window.dispatchEvent(new Event('diestroyers-tv-theme-change'));
      try { localStorage.setItem(key, light ? 'light' : 'dark'); } catch { /* The current page still switches. */ }
    });
    toggle.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
    });
  });
})();

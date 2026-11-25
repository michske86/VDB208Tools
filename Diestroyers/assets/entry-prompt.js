/* A browser-side entry prompt for Home and TV. Published files remain public. */
(() => {
  if (location.protocol !== 'https:') return;

  const cookieName = 'diestroyers_open';
  if (document.cookie.split(';').some(entry => entry.trim() === cookieName + '=1')) return;

  const root = document.documentElement;
  root.dataset.diestroyersLocked = '';
  const style = document.createElement('style');
  style.textContent = `
    html[data-diestroyers-locked] body > :not(.diestroyers-prompt) { opacity: 0 !important; pointer-events: none !important; }
    .diestroyers-prompt { position: fixed; inset: 0; margin: auto; width: min(420px, calc(100% - 32px)); max-height: calc(100% - 32px); box-sizing: border-box; padding: 24px; background: #161416; color: #fff; border: 1px solid #514046; border-left: 4px solid #e11919; border-radius: 16px; font: 16px/1.4 system-ui, sans-serif; }
    .diestroyers-prompt::backdrop { background: #070507; }
    .diestroyers-prompt form { display: grid; gap: 12px; }
    .diestroyers-prompt h1 { margin: 0; font: 700 25px/1.15 system-ui, sans-serif; color: #fff; }
    .diestroyers-prompt label { color: #e8e0e2; }
    .diestroyers-prompt input, .diestroyers-prompt button { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 12px; border-radius: 8px; color: #fff; font: inherit; }
    .diestroyers-prompt input { background: #231f22; border: 1px solid #695960; }
    .diestroyers-prompt button { background: #a8192b; border: 1px solid #df4358; cursor: pointer; }
    .diestroyers-prompt :focus-visible { outline: 2px solid #ff8a9f; outline-offset: 2px; }
    .diestroyers-prompt p { margin: 0; color: #ffb7c3; font-size: 14px; }
    .diestroyers-prompt p:empty { display: none; }
  `;
  document.head.append(style);

  window.addEventListener('DOMContentLoaded', () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'diestroyers-prompt';
    dialog.setAttribute('aria-labelledby', 'diestroyers-prompt-title');
    dialog.innerHTML = `
      <form>
        <h1 id="diestroyers-prompt-title">Diestroyers</h1>
        <label for="diestroyers-password">Wachtwoord</label>
        <input id="diestroyers-password" type="password" autocomplete="current-password" required autofocus>
        <p role="status"></p>
        <button type="submit">Open dashboard</button>
      </form>
    `;
    const form = dialog.querySelector('form');
    const field = form.querySelector('input');
    const button = form.querySelector('button');
    const message = form.querySelector('[role="status"]');
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('cancel', event => event.preventDefault());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      try {
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(field.value));
        const digest = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
        if (digest !== 'cfc296e3e9d28185380f4a1ecbb6531be86f830f3f224785e6f23f7653fdfd91') {
          message.textContent = 'Dat wachtwoord klopt niet.';
          field.focus();
          field.select();
          return;
        }

        const path = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
        document.cookie = cookieName + '=1; Path=' + path + '; Max-Age=31536000; Secure; SameSite=Lax';
        delete root.dataset.diestroyersLocked;
        dialog.remove();
        style.remove();
      } catch {
        message.textContent = 'Het wachtwoord kon niet worden gecontroleerd. Probeer opnieuw.';
      } finally {
        button.disabled = false;
      }
    });
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else {
      dialog.setAttribute('open', '');
      field.focus();
    }
  }, {once:true});
})();

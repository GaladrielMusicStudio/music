/* Galadriel Music Studio — GA4 V31. No external analytics code is loaded until consent. */
(() => {
  'use strict';
  const ID = 'G-M8EFKB3K65';
  const CONSENT_KEY = 'gms_analytics_choice_v31';
  const ROUTES = {
    canales: 'Canales',
    escuchar: 'Escuchar',
    estudio: 'Estudio',
    tienda: 'Tienda'
  };
  let consent = null;
  let initialized = false;
  let prompt;
  try { consent = localStorage.getItem(CONSENT_KEY); } catch (_) { /* restrictive browser */ }
  if (consent !== 'accepted' && consent !== 'rejected') consent = null;

  const routeFromUrl = () => {
    const hash = (location.hash || '').replace(/^#/, '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(ROUTES, hash) ? hash : 'canales';
  };
  const setSectionTitle = (route) => {
    route = Object.prototype.hasOwnProperty.call(ROUTES, route) ? route : routeFromUrl();
    document.title = 'Galadriel Music Studio | ' + ROUTES[route];
  };
  const bootTracking = () => {
    if (initialized || consent !== 'accepted') return;
    initialized = true;
    setSectionTitle(routeFromUrl());
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // GA4 Enhanced Measurement has Page views / Changes in browser history ON.
    // Use it as the *only* owner of page_view; do not send manual duplicates.
    window.gtag('config', ID);
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
    document.head.appendChild(tag);
  };
  const hidePrompt = () => {
    if (prompt) prompt.hidden = true;
  };
  const save = (choice) => {
    const wasAccepted = consent === 'accepted';
    consent = choice;
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (_) {}
    hidePrompt();
    if (choice === 'accepted') bootTracking();
    else if (wasAccepted) {
      // Restart without a loaded Google tag when consent is withdrawn.
      location.reload();
    }
  };
  const openPreferences = () => {
    if (prompt) prompt.hidden = false;
  };
  const renderPrompt = () => {
    prompt = document.createElement('section');
    prompt.className = 'gms-analytics-consent';
    prompt.setAttribute('aria-label', 'Preferencias de estadísticas');
    prompt.innerHTML = '<div class="gms-consent-copy"><strong>Estadísticas de Galadriel</strong><p>¿Nos permites medir estadísticas de uso con Google Analytics? Nos ayuda a mejorar la web. No es necesario para navegar y puedes cambiar tu elección cuando quieras. <a href="privacidad.html">Privacidad</a>.</p></div><div class="gms-consent-buttons"><button type="button" data-gms-analytics="reject">Rechazar</button><button type="button" data-gms-analytics="accept">Aceptar estadísticas</button></div>';
    prompt.querySelector('[data-gms-analytics="reject"]').addEventListener('click', () => save('rejected'));
    prompt.querySelector('[data-gms-analytics="accept"]').addEventListener('click', () => save('accepted'));
    document.body.appendChild(prompt);
    prompt.hidden = consent !== null;
    // Allow changing the choice without a new UI tab or redesign.
    const footer = document.querySelector('.site-footer');
    if (footer && !footer.querySelector('#gmsPrivacyPrefs')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'gmsPrivacyPrefs';
      btn.textContent = 'Preferencias de estadísticas';
      btn.addEventListener('click', openPreferences);
      footer.appendChild(btn);
    }
  };

  window.addEventListener('galadriel:view-change', (event) => {
    setSectionTitle(event.detail && event.detail.view);
    // GA4 Enhanced Measurement observes app.js pushState / popstate automatically.
  });
  window.addEventListener('hashchange', () => setSectionTitle(routeFromUrl()));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderPrompt, { once: true });
  else renderPrompt();
  if (consent === 'accepted') bootTracking();
})();

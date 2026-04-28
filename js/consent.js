(function () {
  'use strict';

  var GA_ID = 'G-FV9SFXG94P';
  var CONSENT_KEY = '18g_cookie_consent';

  function loadGA() {
    if (document.getElementById('ga-script')) return;
    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function getConsent() {
    return localStorage.getItem(CONSENT_KEY);
  }

  function setConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
  }

  function hideBanner() {
    var banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(20px)';
      setTimeout(function () { banner.style.display = 'none'; }, 400);
    }
  }

  function showBanner() {
    var banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.style.display = 'flex';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          banner.style.opacity = '1';
          banner.style.transform = 'translateY(0)';
        });
      });
    }
  }

  // Check existing consent
  var consent = getConsent();
  if (consent === 'accepted') {
    loadGA();
    return;
  }
  if (consent === 'declined') {
    return;
  }

  // No consent yet — show banner after DOM is ready
  function init() {
    // Create banner
    var banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p class="cookie-text">We use cookies to understand how visitors use our site. ' +
      '<a href="/privacy-policy">Privacy policy</a></p>' +
      '<div class="cookie-actions">' +
      '<button id="cookieDecline" class="cookie-btn cookie-btn-decline">Decline</button>' +
      '<button id="cookieAccept" class="cookie-btn cookie-btn-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(banner);

    // Bind events
    document.getElementById('cookieAccept').addEventListener('click', function () {
      setConsent('accepted');
      loadGA();
      hideBanner();
    });

    document.getElementById('cookieDecline').addEventListener('click', function () {
      setConsent('declined');
      hideBanner();
    });

    // Show with slight delay so page loads first
    setTimeout(showBanner, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * LinkedOFF — Shared UI Utilities
 * Injected in all app pages. Handles:
 *   1. Back-to-top button
 *   2. Sidebar live counters (saved jobs + sent CVs)
 *   3. Notification badge in topbar
 */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════
     1. BACK TO TOP BUTTON
  ════════════════════════════════════════════════════ */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.id = 'backToTopBtn';
    btn.setAttribute('aria-label', 'العودة لأعلى');
    btn.innerHTML = '↑';
    btn.style.cssText = [
      'position:fixed',
      'bottom:64px',
      'left:20px',
      'z-index:9998',
      'width:40px',
      'height:40px',
      'border-radius:50%',
      'border:none',
      'background:linear-gradient(135deg,#00A859,#00D66F)',
      'color:#fff',
      'font-size:18px',
      'font-weight:900',
      'cursor:pointer',
      'box-shadow:0 4px 14px rgba(0,168,89,.4)',
      'opacity:0',
      'transform:translateY(10px)',
      'transition:opacity .25s,transform .25s',
      'pointer-events:none',
      'font-family:Cairo,sans-serif',
      'line-height:1',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    document.body.appendChild(btn);

    var scrollTarget = document.querySelector('.app-main') || window;

    function onScroll() {
      var scrollY = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
      var visible = scrollY > 300;
      btn.style.opacity    = visible ? '1' : '0';
      btn.style.transform  = visible ? 'translateY(0)' : 'translateY(10px)';
      btn.style.pointerEvents = visible ? 'auto' : 'none';
    }

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });

    btn.addEventListener('click', function () {
      if (scrollTarget === window) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollTarget.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'translateY(-3px)';
      btn.style.boxShadow = '0 8px 20px rgba(0,168,89,.5)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 14px rgba(0,168,89,.4)';
    });
  }


  /* ════════════════════════════════════════════════════
     2. SIDEBAR LIVE COUNTERS
     Adds small badges next to:
       💾 الوظائف المحفوظة  — count from savedJobs
       📬 سجل الإرسال       — count from appliedJobs
  ════════════════════════════════════════════════════ */
  function initSidebarCounters() {
    try {
      var savedCount   = (JSON.parse(localStorage.getItem('savedJobs')   || '[]')).length;
      var appliedCount = Object.keys(JSON.parse(localStorage.getItem('appliedJobs') || '{}')).length;

      var style = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'min-width:18px',
        'height:18px',
        'padding:0 5px',
        'border-radius:999px',
        'font-size:10px',
        'font-weight:900',
        'margin-right:auto',          /* push to left in RTL */
        'font-family:Cairo,sans-serif',
        'line-height:1',
      ].join(';');

      document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (a) {
        var href = (a.getAttribute('href') || '').toLowerCase();
        var count = 0;
        var color = '';

        if (href.includes('saved.html') && savedCount > 0) {
          count = savedCount;
          color = 'background:rgba(29,191,115,.2);color:#1dbf73;border:1px solid rgba(29,191,115,.3)';
        } else if (href.includes('history.html') && appliedCount > 0) {
          count = appliedCount;
          color = 'background:rgba(96,200,255,.2);color:#60c8ff;border:1px solid rgba(96,200,255,.3)';
        }

        if (count > 0 && !a.querySelector('.nav-counter')) {
          var badge = document.createElement('span');
          badge.className = 'nav-counter';
          badge.style.cssText = style + ';' + color;
          badge.textContent = count > 99 ? '99+' : count;
          a.appendChild(badge);
        }
      });
    } catch (e) {}
  }


  /* ════════════════════════════════════════════════════
     3. TOPBAR NOTIFICATION BADGE
     Shows a dot / count badge on a bell icon in topbar
     if there are unseen saved jobs (savedJobs key)
  ════════════════════════════════════════════════════ */
  function initNotifBadge() {
    try {
      var savedCount = (JSON.parse(localStorage.getItem('savedJobs') || '[]')).length;
      var appliedCount = Object.keys(JSON.parse(localStorage.getItem('appliedJobs') || '{}')).length;
      var total = savedCount + appliedCount;
      if (total === 0) return;

      var actions = document.querySelector('.topbar-actions');
      if (!actions) return;

      var bell = document.createElement('div');
      bell.id = 'topbarNotif';
      bell.title = savedCount + ' محفوظة، ' + appliedCount + ' مُرسلة';
      bell.style.cssText = [
        'position:relative',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'width:34px',
        'height:34px',
        'border-radius:10px',
        'cursor:pointer',
        'font-size:17px',
        'transition:background .2s',
        'flex-shrink:0',
      ].join(';');
      bell.innerHTML = '🔔';

      var dot = document.createElement('span');
      dot.style.cssText = [
        'position:absolute',
        'top:3px',
        'right:3px',
        'min-width:14px',
        'height:14px',
        'border-radius:999px',
        'background:linear-gradient(135deg,#ef4444,#f97316)',
        'color:#fff',
        'font-size:9px',
        'font-weight:900',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:0 3px',
        'font-family:Cairo,sans-serif',
        'line-height:1',
        'pointer-events:none',
      ].join(';');
      dot.textContent = total > 9 ? '9+' : total;
      bell.appendChild(dot);

      /* Click → open saved page */
      bell.addEventListener('click', function () {
        window.location.href = 'saved.html';
      });
      bell.addEventListener('mouseenter', function () {
        bell.style.background = 'rgba(255,255,255,.08)';
      });
      bell.addEventListener('mouseleave', function () {
        bell.style.background = 'transparent';
      });

      /* Insert before dark mode button */
      var darkBtn = document.getElementById('darkModeBtn');
      if (darkBtn) {
        actions.insertBefore(bell, darkBtn);
      } else {
        actions.appendChild(bell);
      }
    } catch (e) {}
  }


  /* ════════════════════════════════════════════════════
     INIT — run after DOM is ready
  ════════════════════════════════════════════════════ */
  function init() {
    initBackToTop();
    initSidebarCounters();
    initNotifBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose refresh function so other scripts can re-trigger counters */
  window.refreshUICounters = function () {
    /* Remove existing counters and badges, then re-init */
    document.querySelectorAll('.nav-counter').forEach(function (el) { el.remove(); });
    var notif = document.getElementById('topbarNotif');
    if (notif) notif.remove();
    initSidebarCounters();
    initNotifBadge();
  };

})();

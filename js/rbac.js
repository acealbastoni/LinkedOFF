/**
 * LinkedOFF KSA — Role-Based Access Control (RBAC)
 * ─────────────────────────────────────────────────
 * Roles  : admin | user
 *
 * How a user's role is resolved (in priority order):
 *   1. user.role field returned by the backend (stored in linkedoff_user)
 *   2. APP_CONFIG.adminEmails list  (email-based override — no backend change needed)
 *   3. Default → 'user'
 *
 * Page restrictions are defined in APP_CONFIG.pageAccess (config.js).
 */

const RBAC = {

  // ── Role Resolution ────────────────────────────────────────────────────────

  /** Returns the current user's role: 'admin' | 'user' | 'guest' */
  getRole() {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('linkedoff_user') || 'null');
    } catch (e) { /* ignore */ }

    if (!user) return 'guest';

    // 1) Backend-supplied role
    const backendRole = String(user.role || '').toLowerCase();
    if (backendRole === 'admin') return 'admin';

    // 2) Admin email override (from config.js)
    const adminEmails = (window.APP_CONFIG && APP_CONFIG.adminEmails) || [];
    const userEmail   = String(user.email || '').toLowerCase();
    if (adminEmails.some(e => String(e).toLowerCase() === userEmail)) {
      return 'admin';
    }

    // 3) Users registry override (managed via users.html)
    try {
      const registry = JSON.parse(localStorage.getItem('linkedoff_users_registry') || '[]');
      const entry    = registry.find(u => String(u.email || '').toLowerCase() === userEmail);
      if (entry && entry.role === 'admin') return 'admin';
      if (entry && entry.role === 'user')  return 'user';
    } catch (e) { /* ignore */ }

    // 4) Default
    return backendRole || 'user';
  },

  // ── Access Check ───────────────────────────────────────────────────────────

  /** Returns true if the current user can access the given page filename. */
  canAccess(pageFilename) {
    const role = this.getRole();
    if (role === 'admin') return true; // admin always has full access

    // 1) Dynamic override from settings panel (stored in localStorage)
    try {
      const stored = JSON.parse(localStorage.getItem('linkedoff_rbac_config') || 'null');
      if (stored && stored.pageAccess && stored.pageAccess[pageFilename] !== undefined) {
        const req = stored.pageAccess[pageFilename];
        if (req === 'admin') return false; // non-admin blocked
        return true;
      }
    } catch (e) { /* ignore */ }

    // 2) Static fallback from APP_CONFIG.pageAccess (config.js)
    const access   = (window.APP_CONFIG && APP_CONFIG.pageAccess) || {};
    const required = access[pageFilename];
    if (!required) return true;           // not restricted → everyone can access
    if (required === 'admin') return false;
    return true;
  },

  // ── Sidebar Filtering ──────────────────────────────────────────────────────

  /**
   * Hides sidebar links the current user cannot access.
   * Also injects a role badge and user name into the sidebar.
   */
  applySidebar() {
    const role = this.getRole();

    // Hide restricted nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
      const href     = (link.getAttribute('href') || '').split('?')[0].split('#')[0];
      const filename = href.split('/').pop();
      if (!this.canAccess(filename)) {
        link.style.display = 'none';
      }
    });

    // Apply group config (collapse state + visible pages + role-based hide)
    this.initSidebarGroup();

    // Hide sidebar groups if all sub-items are hidden (after config applied)
    document.querySelectorAll('.sidebar-nav .sidebar-group').forEach(group => {
      const items = group.querySelectorAll('.nav-item');
      if (items.length > 0 && Array.from(items).every(item => item.style.display === 'none')) {
        group.style.display = 'none';
      }
    });

    // Inject role badge + user name under the brand logo
    this._injectSidebarMeta(role);

    // Reveal sidebar now that filtering is done — prevents flash of all items
    document.querySelectorAll('.sidebar-nav').forEach(nav => {
      nav.style.visibility = 'visible';
    });
  },

  // ── Page Guard ─────────────────────────────────────────────────────────────

  /**
   * Redirects unauthorized users away from restricted pages.
   * Call this after DOMContentLoaded (or inline, reading from localStorage).
   */
  guardPage() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    if (!this.canAccess(filename)) {
      this._showAccessDenied();
    }
  },

  // ── Private Helpers ────────────────────────────────────────────────────────

  _showAccessDenied() {
    // Build a minimal overlay so the user sees something before redirect
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'background:#0a0a0a', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:Cairo,sans-serif', 'direction:rtl', 'text-align:center',
      'padding:30px',
    ].join(';');
    overlay.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px;">⛔</div>
      <h2 style="color:#ef4444;font-size:1.5rem;margin-bottom:10px;">غير مصرح</h2>
      <p style="color:#aaa;font-size:0.95rem;margin-bottom:24px;max-width:340px;line-height:1.6;">
        ليس لديك صلاحية للوصول إلى هذه الصفحة.<br>
        سيتم تحويلك تلقائياً...
      </p>
      <div style="width:40px;height:40px;border:4px solid #333;border-top-color:#ef4444;
                  border-radius:50%;animation:rbacSpin .8s linear infinite;"></div>
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes rbacSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    setTimeout(() => window.location.replace('search.html'), 1800);
  },

  _injectSidebarMeta(role) {
    const brand = document.querySelector('.sidebar-brand');
    if (!brand || brand.querySelector('.rbac-meta')) return;

    // Get user name
    let userName = '';
    try {
      const user = JSON.parse(localStorage.getItem('linkedoff_user') || 'null');
      userName = (user && (user.name || user.email)) || '';
    } catch (e) { /* ignore */ }

    const isAdmin  = role === 'admin';
    const meta     = document.createElement('div');
    meta.className = 'rbac-meta';
    meta.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);';

    // Role badge
    const badge = document.createElement('span');
    badge.className  = 'rbac-role-badge';
    badge.textContent = isAdmin ? '👑 مدير النظام' : '👤 مستخدم';
    badge.style.cssText = [
      'display:inline-block',
      'padding:3px 12px',
      'border-radius:20px',
      'font-size:11px',
      'font-weight:700',
      'letter-spacing:0.3px',
      isAdmin
        ? 'background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.3)'
        : 'background:rgba(0,168,89,.12);color:#00A859;border:1px solid rgba(0,168,89,.25)',
    ].join(';');

    meta.appendChild(badge);

    // User name (if available)
    if (userName) {
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.45);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;';
      nameEl.textContent = userName;
      meta.appendChild(nameEl);
    }

    brand.appendChild(meta);
  },

  // ── Sidebar Group (Collapsible + Configurable) ────────────────────────────

  /**
   * 1. Restores collapsed state from localStorage.
   * 2. Hides the whole group for certain roles (from linkedoff_settings_group_cfg).
   * 3. Hides individual sub-items not in the configured visiblePages list.
   */
  initSidebarGroup() {
    // 1) Restore collapse state
    const isCollapsed = localStorage.getItem('linkedoff_sidebar_group_collapsed') === '1';
    document.querySelectorAll('#sidebarSettingsGroup').forEach(group => {
      if (isCollapsed) group.classList.add('collapsed');
    });

    // 2 & 3) Apply config
    try {
      const cfgRaw = localStorage.getItem('linkedoff_settings_group_cfg');
      if (!cfgRaw) return;
      const cfg = JSON.parse(cfgRaw);
      const role = this.getRole();

      // Hide entire group for configured roles
      if (cfg.hideForRoles && cfg.hideForRoles.includes(role)) {
        document.querySelectorAll('#sidebarSettingsGroup').forEach(el => {
          el.style.display = 'none';
        });
        return;
      }

      // Hide sub-items not in visiblePages
      if (cfg.visiblePages && cfg.visiblePages.length > 0) {
        document.querySelectorAll('[data-group-page]').forEach(item => {
          const page = item.getAttribute('data-group-page');
          if (!cfg.visiblePages.includes(page)) {
            item.style.display = 'none';
          }
        });
      }
    } catch (e) { /* ignore */ }
  },
};

// ── Auto-Initialize on DOM Ready ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  RBAC.applySidebar();
  RBAC.guardPage();
});

// ── Safety fallback: ensure sidebar is always visible even if RBAC fails ─────
// (fires 600ms after page load as a last resort)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.sidebar-nav').forEach(nav => {
      if (nav.style.visibility !== 'visible') {
        nav.style.visibility = 'visible';
      }
    });
  }, 600);
});

// ── Expose globally ───────────────────────────────────────────────────────────
window.RBAC = RBAC;

// Toggle sidebar group collapse (called from onclick in HTML)
window.toggleSidebarGroup = function (header) {
  const group = header.closest('.sidebar-group');
  if (!group) return;
  const isCollapsed = group.classList.toggle('collapsed');
  try {
    localStorage.setItem('linkedoff_sidebar_group_collapsed', isCollapsed ? '1' : '0');
  } catch (e) { /* ignore */ }
};

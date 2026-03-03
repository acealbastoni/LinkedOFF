/**
 * LinkedOFF KSA — DataStore Abstraction Layer
 * ─────────────────────────────────────────────
 * Provides a unified data API regardless of which backend is active.
 *
 * Available adapters:
 *   local         — localStorage (default, works offline, zero config)
 *   google-sheets — Google Sheets via Google Apps Script Web App
 *   staging       — REST API (staging / QA environment)
 *   production    — REST API (production environment)
 *
 * Usage anywhere in the app:
 *   const users = await DataStore.getUsers();
 *   await DataStore.saveUser({ email, name, role });
 *
 * Admin UI: settings-datasource.html
 * Active source key: localStorage → 'linkedoff_datasource'
 * Adapter configs  : localStorage → 'linkedoff_datasource_config'
 */

// ── Storage Keys ──────────────────────────────────────────────────────────────
const DS_SOURCE_KEY  = 'linkedoff_datasource';        // active adapter name
const DS_CONFIG_KEY  = 'linkedoff_datasource_config'; // per-adapter config objects

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTER 1 — LOCAL  (localStorage)
// ══════════════════════════════════════════════════════════════════════════════
const LocalAdapter = {
  name:  'local',
  label: 'مخزن محلي (Local Storage)',
  icon:  '💾',

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers() {
    try { return JSON.parse(localStorage.getItem('linkedoff_users_registry') || '[]'); }
    catch { return []; }
  },

  async saveUser(user) {
    try {
      const users = await this.getUsers();
      const idx   = users.findIndex(u => u.email === user.email);
      if (idx >= 0) users[idx] = { ...users[idx], ...user };
      else          users.push({ ...user, addedAt: user.addedAt || new Date().toISOString() });
      localStorage.setItem('linkedoff_users_registry', JSON.stringify(users));
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },

  async deleteUser(email) {
    try {
      const users = await this.getUsers();
      localStorage.setItem('linkedoff_users_registry', JSON.stringify(users.filter(u => u.email !== email)));
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },

  // ── RBAC Config ────────────────────────────────────────────────────────────
  async getRbacConfig() {
    try { return JSON.parse(localStorage.getItem('linkedoff_rbac_config') || 'null'); }
    catch { return null; }
  },

  async saveRbacConfig(cfg) {
    try { localStorage.setItem('linkedoff_rbac_config', JSON.stringify(cfg)); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  },

  // ── Sidebar Group Config ───────────────────────────────────────────────────
  async getGroupConfig() {
    try { return JSON.parse(localStorage.getItem('linkedoff_settings_group_cfg') || 'null'); }
    catch { return null; }
  },

  async saveGroupConfig(cfg) {
    try { localStorage.setItem('linkedoff_settings_group_cfg', JSON.stringify(cfg)); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  },

  // ── Health Check ───────────────────────────────────────────────────────────
  async testConnection() {
    return { ok: true, message: 'المخزن المحلي يعمل بشكل طبيعي ✓' };
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTER 2 — GOOGLE SHEETS  (via Apps Script Web App)
// ══════════════════════════════════════════════════════════════════════════════
const GoogleSheetsAdapter = {
  name:  'google-sheets',
  label: 'Google Sheets (Apps Script)',
  icon:  '📊',

  _cfg()  { return DataStore.getAdapterConfig('google-sheets'); },
  _url()  { return (this._cfg().scriptUrl || '').trim(); },

  /** GET request — params sent as query string */
  async _get(params) {
    const url = this._url();
    if (!url) throw new Error('رابط Apps Script غير محدد');
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  /** POST request — data sent as JSON body */
  async _post(action, data = {}) {
    const url = this._url();
    if (!url) throw new Error('رابط Apps Script غير محدد');
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for doPost JSON
      body:    JSON.stringify({ action, ...data }),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers() {
    try   { const d = await this._get({ action: 'getUsers' }); return d.users || []; }
    catch (e) { console.error('[GSheets] getUsers:', e); return []; }
  },

  async saveUser(user) {
    try   { return await this._post('saveUser', { user }); }
    catch (e) { return { ok: false, error: e.message }; }
  },

  async deleteUser(email) {
    try   { return await this._post('deleteUser', { email }); }
    catch (e) { return { ok: false, error: e.message }; }
  },

  // ── RBAC Config ────────────────────────────────────────────────────────────
  async getRbacConfig() {
    try   { const d = await this._get({ action: 'getRbacConfig' }); return d.config || null; }
    catch { return null; }
  },

  async saveRbacConfig(cfg) {
    try   { return await this._post('saveRbacConfig', { config: cfg }); }
    catch (e) { return { ok: false, error: e.message }; }
  },

  // ── Sidebar Group Config ───────────────────────────────────────────────────
  async getGroupConfig() {
    try   { const d = await this._get({ action: 'getGroupConfig' }); return d.config || null; }
    catch { return null; }
  },

  async saveGroupConfig(cfg) {
    try   { return await this._post('saveGroupConfig', { config: cfg }); }
    catch (e) { return { ok: false, error: e.message }; }
  },

  // ── Health Check ───────────────────────────────────────────────────────────
  async testConnection() {
    try {
      if (!this._url()) return { ok: false, message: 'رابط Apps Script غير محدد' };
      const d = await this._get({ action: 'ping' });
      return d.ok
        ? { ok: true,  message: `متصل بـ Google Sheets ✓ ${d.sheetName ? `(${d.sheetName})` : ''}` }
        : { ok: false, message: d.error || 'فشل الاتصال' };
    } catch (e) { return { ok: false, message: `خطأ: ${e.message}` }; }
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTER FACTORY — REST API  (used for staging + production)
// ══════════════════════════════════════════════════════════════════════════════
function _createRestAdapter(name, label, icon) {
  return {
    name, label, icon,

    _cfg()     { return DataStore.getAdapterConfig(name); },
    _base()    { return (this._cfg().apiUrl || '').replace(/\/$/, ''); },
    _headers() {
      const h = { 'Content-Type': 'application/json' };
      const k = this._cfg().apiKey;
      if (k) h['Authorization'] = `Bearer ${k}`;
      return h;
    },

    async _get(path) {
      const res = await fetch(this._base() + path, { headers: this._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async _post(path, body) {
      const res = await fetch(this._base() + path, {
        method: 'POST', headers: this._headers(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    async _delete(path) {
      const res = await fetch(this._base() + path, { method: 'DELETE', headers: this._headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    // ── Users ────────────────────────────────────────────────────────────────
    async getUsers() {
      try   { const d = await this._get('/api/users'); return d.users || d || []; }
      catch (e) { console.error(`[${name}] getUsers:`, e); return []; }
    },
    async saveUser(user) {
      try   { return await this._post('/api/users', user); }
      catch (e) { return { ok: false, error: e.message }; }
    },
    async deleteUser(email) {
      try   { return await this._delete(`/api/users/${encodeURIComponent(email)}`); }
      catch (e) { return { ok: false, error: e.message }; }
    },

    // ── RBAC Config ──────────────────────────────────────────────────────────
    async getRbacConfig() {
      try   { const d = await this._get('/api/config/rbac'); return d.config || d || null; }
      catch { return null; }
    },
    async saveRbacConfig(cfg) {
      try   { return await this._post('/api/config/rbac', cfg); }
      catch (e) { return { ok: false, error: e.message }; }
    },

    // ── Sidebar Group Config ─────────────────────────────────────────────────
    async getGroupConfig() {
      try   { const d = await this._get('/api/config/group'); return d.config || d || null; }
      catch { return null; }
    },
    async saveGroupConfig(cfg) {
      try   { return await this._post('/api/config/group', cfg); }
      catch (e) { return { ok: false, error: e.message }; }
    },

    // ── Health Check ─────────────────────────────────────────────────────────
    async testConnection() {
      try {
        if (!this._base()) return { ok: false, message: 'رابط API غير محدد' };
        const d = await this._get('/api/health');
        return (d.ok || d.status === 'ok')
          ? { ok: true,  message: `متصل بـ ${label} ✓` }
          : { ok: false, message: d.message || 'لم يستجب السيرفر بشكل صحيح' };
      } catch (e) { return { ok: false, message: `خطأ: ${e.message}` }; }
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ADAPTERS REGISTRY
// ══════════════════════════════════════════════════════════════════════════════
const DS_ADAPTERS = {
  'local':          LocalAdapter,
  'google-sheets':  GoogleSheetsAdapter,
  'staging':        _createRestAdapter('staging',    '🧪 Staging (بيئة الاختبار)', '🧪'),
  'production':     _createRestAdapter('production', '🏭 Production (بيئة الإنتاج)', '🏭'),
};

// ══════════════════════════════════════════════════════════════════════════════
// DATASTORE MANAGER
// Central entry point — all app code calls DataStore.xxx()
// ══════════════════════════════════════════════════════════════════════════════
const DataStore = {

  // ── Source Management ───────────────────────────────────────────────────────

  /** Returns the name of the currently active data source. Default: 'local' */
  getActiveSource() {
    return localStorage.getItem(DS_SOURCE_KEY) || 'local';
  },

  /** Switches the active data source. Throws if name is unknown. */
  setActiveSource(name) {
    if (!DS_ADAPTERS[name]) throw new Error(`Unknown adapter: ${name}`);
    localStorage.setItem(DS_SOURCE_KEY, name);
  },

  /** Returns the active adapter instance. Falls back to local on error. */
  getAdapter() {
    return DS_ADAPTERS[this.getActiveSource()] || DS_ADAPTERS['local'];
  },

  /** Returns all adapters as a flat metadata list (for the UI). */
  getAvailableAdapters() {
    return Object.values(DS_ADAPTERS).map(a => ({ name: a.name, label: a.label, icon: a.icon }));
  },

  // ── Per-Adapter Config ──────────────────────────────────────────────────────

  /** Returns saved config object for a specific adapter. */
  getAdapterConfig(adapterName) {
    try {
      const all = JSON.parse(localStorage.getItem(DS_CONFIG_KEY) || '{}');
      return all[adapterName] || {};
    } catch { return {}; }
  },

  /** Merges and saves config for a specific adapter. */
  saveAdapterConfig(adapterName, config) {
    try {
      const all = JSON.parse(localStorage.getItem(DS_CONFIG_KEY) || '{}');
      all[adapterName] = { ...(all[adapterName] || {}), ...config };
      localStorage.setItem(DS_CONFIG_KEY, JSON.stringify(all));
      return true;
    } catch { return false; }
  },

  // ── Unified Data API ────────────────────────────────────────────────────────
  // Use these methods everywhere in the app instead of localStorage directly.

  async getUsers()           { return this.getAdapter().getUsers(); },
  async saveUser(user)       { return this.getAdapter().saveUser(user); },
  async deleteUser(email)    { return this.getAdapter().deleteUser(email); },
  async getRbacConfig()      { return this.getAdapter().getRbacConfig(); },
  async saveRbacConfig(cfg)  { return this.getAdapter().saveRbacConfig(cfg); },
  async getGroupConfig()     { return this.getAdapter().getGroupConfig(); },
  async saveGroupConfig(cfg) { return this.getAdapter().saveGroupConfig(cfg); },
  async testConnection()     { return this.getAdapter().testConnection(); },
};

// ── Expose globally ───────────────────────────────────────────────────────────
window.DataStore   = DataStore;
window.DS_ADAPTERS = DS_ADAPTERS;

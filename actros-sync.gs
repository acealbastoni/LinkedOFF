/**
 * ══════════════════════════════════════════════════════════
 *  Actros — Google Apps Script Backend
 *  Sheet ID : 12DOdU_mhknF4v4c6I5Q0w779zrCbiuLwzb_B3EaSFOg
 *
 *  خطوات الـ Deploy:
 *    1. افتح script.google.com → مشروع جديد
 *    2. الصق كل هذا الكود وتخلص من الكود الافتراضي
 *    3. Deploy → New Deployment
 *       Type : Web app
 *       Execute as : Me (حسابك)
 *       Who has access : Anyone
 *    4. انسخ الـ Deployment URL وحطه في إعدادات أكتروس
 *
 *  POST Actions (body = JSON string):
 *    { action: 'ping' }
 *    { action: 'syncMonth', vehicleId, month, entries[] }
 *    { action: 'getMonth',  vehicleId, month }
 * ══════════════════════════════════════════════════════════
 */

const SHEET_ID            = '12DOdU_mhknF4v4c6I5Q0w779zrCbiuLwzb_B3EaSFOg';
const SHEET_NAME          = 'actros_entries';
const USER_SETTINGS_SHEET = 'user_settings';

// Column order (header row)
const COLS = [
  'id', 'vehicleId', 'month', 'date', 'type',
  'client', 'route', 'tripsCount', 'revenue',
  'desc', 'amount', 'direction',
  'dieselL', 'dieselPrice',
  'notes', 'syncedAt', 'raw'
];

// ── Entry point ────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    switch (data.action) {
      case 'ping':         return ok({ message: 'pong' });
      case 'syncMonth':    return syncMonth(data);
      case 'getMonth':     return getMonth(data);
      case 'saveSettings': return saveUserSettings(data);
      case 'getSettings':  return getUserSettings(data);
      default:             return err('Unknown action: ' + data.action);
    }
  } catch (ex) {
    return err(ex.toString());
  }
}

function doGet(e) {
  if (e.parameter.action === 'ping') return ok({ message: 'pong' });
  return err('Use POST requests');
}

// ── Response helpers ───────────────────────────────────────────────────────────
function ok(extra)  { return respond({ ok: true,  ...extra }); }
function err(msg)   { return respond({ ok: false, error: msg }); }
function respond(o) {
  return ContentService
    .createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Month cell helper ── Sheets auto-converts '2026-03' → Date object ──────────
function cellToMonth(v) {
  if (!v && v !== 0) return '';
  if (v instanceof Date)
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM');
  return String(v).trim().slice(0, 7);
}

// ── Sheet access (auto-creates sheet + headers if needed) ──────────────────────
function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    const hdr = sh.getRange(1, 1, 1, COLS.length);
    hdr.setValues([COLS]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#e8f5e9');
    sh.setFrozenRows(1);
    sh.setColumnWidth(COLS.indexOf('raw') + 1, 400);
    sh.setColumnWidth(COLS.indexOf('desc') + 1, 200);
  }
  return sh;
}

// ── syncMonth ── upsert all entries for vehicleId + month ─────────────────────
function syncMonth(data) {
  const { vehicleId, month, entries } = data;
  if (!vehicleId || !month || !Array.isArray(entries))
    return err('Missing vehicleId, month, or entries[]');

  const sh       = getSheet();
  const syncedAt = new Date().toISOString();
  const vId      = String(vehicleId).trim();
  const mn       = String(month).trim();

  // ── Step 1: read all existing data rows (below header) ──────────────────────
  const lastRow  = sh.getLastRow();
  let keptRows   = [];
  if (lastRow > 1) {
    const existing = sh.getRange(2, 1, lastRow - 1, COLS.length).getValues();
    // Keep rows that belong to OTHER vehicles or OTHER months
    // Note: cellToMonth() handles Sheets auto-converting '2026-03' → Date object
    keptRows = existing.filter(row =>
      !(String(row[1]).trim() === vId && cellToMonth(row[2]) === mn)
    );
  }

  // ── Step 2: build new rows for this sync ────────────────────────────────────
  const newRows = entries.map(e => [
    e.id              || '',
    vId,
    mn,
    e.date            || '',
    e.type            || 'legacy',
    e.client          || '',
    e.route           || '',
    e.tripsCount      != null ? e.tripsCount      : '',
    e.revenue         != null ? e.revenue         : '',
    e.breakdownDesc   || e.driverExpDesc || e.otherDesc || '',
    e.breakdownCost   != null ? e.breakdownCost   :
    e.otherExp        != null ? e.otherExp        :
    e.otherAmt        != null ? e.otherAmt        : '',
    e.direction       || '',
    e.dieselL         != null ? e.dieselL         : '',
    e.dieselPriceOverride != null ? e.dieselPriceOverride : '',
    e.notes           || '',
    syncedAt,
    JSON.stringify(e),
  ]);

  // ── Step 3: clear data area then write everything in one shot ───────────────
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, COLS.length).clearContent();
  }
  const allData = [...keptRows, ...newRows];
  if (allData.length > 0) {
    const range = sh.getRange(2, 1, allData.length, COLS.length);
    // Force vehicleId (col 2) and month (col 3) to text so Sheets never
    // auto-converts '2026-03' to a Date object on future reads.
    sh.getRange(2, 2, allData.length, 1).setNumberFormat('@');
    sh.getRange(2, 3, allData.length, 1).setNumberFormat('@');
    range.setValues(allData);
  }
  SpreadsheetApp.flush();

  return ok({ synced: entries.length, month: mn, vehicleId: vId });
}

// ── user_settings sheet (auto-creates if needed) ───────────────────────────────
function getUserSettingsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(USER_SETTINGS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USER_SETTINGS_SHEET);
    const hdr = sh.getRange(1, 1, 1, 3);
    hdr.setValues([['email', 'settingsJson', 'updatedAt']]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#e3f2fd');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 220);
    sh.setColumnWidth(2, 700);
    sh.getRange('A2:A1000').setNumberFormat('@'); // email as plain text
  }
  return sh;
}

// ── saveUserSettings ── upsert settings row by email ──────────────────────────
function saveUserSettings(data) {
  const { email, settingsJson } = data;
  if (!email) return err('Missing email');
  if (!settingsJson) return err('Missing settingsJson');

  const sh        = getUserSettingsSheet();
  const updatedAt = new Date().toISOString();
  const emailStr  = String(email).trim().toLowerCase();
  const lastRow   = sh.getLastRow();

  if (lastRow > 1) {
    const rows = sh.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toLowerCase() === emailStr) {
        sh.getRange(i + 2, 1, 1, 3).setValues([[email, settingsJson, updatedAt]]);
        SpreadsheetApp.flush();
        return ok({ saved: true, email });
      }
    }
  }
  // New user — append
  sh.appendRow([email, settingsJson, updatedAt]);
  SpreadsheetApp.flush();
  return ok({ saved: true, email });
}

// ── getUserSettings ── return settings JSON for a user ────────────────────────
function getUserSettings(data) {
  const { email } = data;
  if (!email) return err('Missing email');

  const sh       = getUserSettingsSheet();
  const lastRow  = sh.getLastRow();
  if (lastRow <= 1) return ok({ settings: null, email });

  const emailStr = String(email).trim().toLowerCase();
  const rows     = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === emailStr) {
      try {
        return ok({ settings: JSON.parse(rows[i][1] || 'null'), email, updatedAt: String(rows[i][2]) });
      } catch {
        return ok({ settings: null, email });
      }
    }
  }
  return ok({ settings: null, email });
}

// ── getMonth ── pull entries back to client (future pull-sync) ─────────────────
function getMonth(data) {
  const { vehicleId, month } = data;
  if (!vehicleId || !month) return err('Missing vehicleId or month');

  const sh      = getSheet();
  const allRows = sh.getDataRange().getValues();
  const rawIdx  = COLS.indexOf('raw');
  const entries = [];

  for (let i = 1; i < allRows.length; i++) {
    if (String(allRows[i][1]).trim() === String(vehicleId).trim() &&
        cellToMonth(allRows[i][2]) === String(month).trim().slice(0, 7)) {
      try {
        const raw = allRows[i][rawIdx];
        if (raw) entries.push(JSON.parse(raw));
      } catch (ex) { /* skip malformed */ }
    }
  }

  return ok({ entries, month, vehicleId, count: entries.length });
}

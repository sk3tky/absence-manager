// 欠課管理アプリ バックエンド（スプレッドシートに紐づくGASとして作成）
// スクリプトプロパティ: CLIENT_ID（GoogleクライアントID）, ALLOWED_EMAILS（許可メールをカンマ区切り）
const SHEETS = {
  subjects: ['id', 'category', 'name', 'credits', 'limit', 'limitCert', 'required', 'initial'],
  timetables: ['id', 'name', 'start', 'end'],
  slots: ['id', 'ttId', 'dow', 'period', 'subjectId'],
  absences: ['id', 'ttId', 'date', 'period', 'subjectId', 'updated_by', 'updated_at'],
  irregular: ['id', 'date', 'period', 'type', 'reason', 'subjectId'],
  settings: ['key', 'value'],
};

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    const email = verify(b.token);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (b.action === 'load') {
      const data = {};
      for (const n in SHEETS) data[n] = read(ss, n);
      return out({ ok: true, data });
    }
    if (b.action === 'save') {
      if (!SHEETS[b.sheet]) throw new Error('bad sheet');
      write(ss, b.sheet, b.rows || [], email);
      return out({ ok: true });
    }
    throw new Error('bad action');
  } catch (err) {
    return out({ ok: false, error: String(err.message || err) });
  }
}

function verify(token) {
  if (!token) throw new Error('auth');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('auth');
  const info = JSON.parse(r.getContentText());
  const props = PropertiesService.getScriptProperties();
  if (info.aud !== props.getProperty('CLIENT_ID')) throw new Error('auth');
  const allowed = (props.getProperty('ALLOWED_EMAILS') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (String(info.email_verified) !== 'true' || !allowed.includes(String(info.email).toLowerCase())) throw new Error('forbidden');
  return info.email;
}

function sheetOf(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
  }
  return sh;
}

function read(ss, name) {
  const sh = sheetOf(ss, name), cols = SHEETS[name];
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).getValues()
    .filter(r => r[0] !== '')
    .map(r => Object.fromEntries(cols.map((c, i) => [c, String(r[i])])));
}

function write(ss, name, rows, email) {
  const sh = sheetOf(ss, name), cols = SHEETS[name], now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, cols.length).clearContent();
    if (!rows.length) return;
    const values = rows.map(r => cols.map(c => {
      if (name === 'absences' && c === 'updated_by') return r[c] || email;
      if (name === 'absences' && c === 'updated_at') return r[c] || now;
      const v = r[c];
      return v === undefined || v === null ? '' : String(v);
    }));
    const range = sh.getRange(2, 1, values.length, cols.length);
    range.setNumberFormat('@'); // 日付・数値の自動変換を防ぐ
    range.setValues(values);
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

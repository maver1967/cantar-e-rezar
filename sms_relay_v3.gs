// ════════════════════════════════════════════════════════════
// SMS RELAY v3 — Cantar e Rezar
// ════════════════════════════════════════════════════════════

const SECRET_KEY  = 'CantarRezar2026!';
const CODE_SECRET = 'CSFM-MAXIXE-2026';
const SHEET_ID    = '1bDpjJcmY-uvccSItM9gV_0ublq_ZoYiWryfw3j4pVR8';
const SHEET_SMS   = 'SMS_Queue';
const SHEET_CODES = 'Codigos_Auto';

function getSmsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_SMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SMS);
    sheet.appendRow(['Timestamp','Telefone','Mensagem','Status','Codigo','SentAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCodesSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CODES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CODES);
    sheet.appendRow(['Timestamp','Telefone','Codigo','Status']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sha256Hex(message) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    message,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function getNextCodeId() {
  const sheet = getCodesSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return 'A001';
  const nums = data.slice(1)
    .map(r => parseInt(String(r[2]).slice(1), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return 'A' + String(max + 1).padStart(3, '0');
}

function generateCode(phone) {
  const id       = getNextCodeId();
  const hash     = sha256Hex(CODE_SECRET + id);
  const checksum = hash.slice(0, 4).toUpperCase();
  const code     = id + '-' + checksum;
  getCodesSheet().appendRow([new Date().toISOString(), phone, code, 'generated']);
  const appUrl  = 'https://maver1967.github.io/cantar-e-rezar/?code=' + code;
  const message = '🎵 Cantar e Rezar\nO seu código de activação: ' + code +
                  '\nOu abra directamente:\n' + appUrl;
  getSmsSheet().appendRow([new Date().toISOString(), phone, message, 'pending', code, '']);
  return { code, message };
}

// ── GET: todas as acções via GET (evita CORS) ──────────────
function doGet(e) {
  const params = e.parameter;
  if (params.secret !== SECRET_KEY) return json({ error: 'unauthorized' });

  const sheet = getSmsSheet();

  // Marcar como enviado
  if (params.action === 'mark' && params.row) {
    const row = parseInt(params.row);
    sheet.getRange(row, 4).setValue('sent');
    sheet.getRange(row, 6).setValue(new Date().toISOString());
    return json({ ok: true, marked: row });
  }

  // Geração automática (M-Pesa / E-Mola)
  if (params.action === 'generate' && params.phone) {
    const result = generateCode(params.phone);
    return json({ ok: true, code: result.code, queued: params.phone });
  }

  // Envio manual do admin (GET com todos os parâmetros)
  if (params.action === 'queue' && params.phone && params.message) {
    sheet.appendRow([
      new Date().toISOString(),
      params.phone,
      params.message,
      'pending',
      params.codigo || '',
      ''
    ]);
    return json({ ok: true, queued: params.phone });
  }

  // Devolver primeiro SMS pendente (para Tasker)
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === 'pending') {
      return json({
        found:   true,
        row:     i + 1,
        phone:   String(data[i][1]),
        message: String(data[i][2]),
        codigo:  String(data[i][4])
      });
    }
  }
  return json({ found: false });
}

// Mantém POST para compatibilidade
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET_KEY) return json({ error: 'unauthorized' });
    if (data.action === 'generate') {
      const result = generateCode(data.phone);
      return json({ ok: true, code: result.code });
    }
    getSmsSheet().appendRow([
      new Date().toISOString(), data.phone, data.message,
      'pending', data.codigo || '', ''
    ]);
    return json({ ok: true, queued: data.phone });
  } catch(err) {
    return json({ error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

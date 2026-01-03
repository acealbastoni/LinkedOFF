const SHEET_ID = '12DOdU_mhknF4v4c6I5Q0w779zrCbiuLwzb_B3EaSFOg';
const USERS_SHEET_NAME = 'Users';
const SESSION_TTL_MS = 25 * 1000; // 1 minute


// في Apps Script Console
function testRegister() {
  const e = {
    postData: {
      contents: JSON.stringify({
        action: 'register',
        name: 'Test User',
        email: 'test2@test.com',
        password: '123456'
      })
    }
  };
  
  const result = doPost(e);
  Logger.log('Register Result: ' + result.getContent());
  return result;
}




/************* Helpers *************/
function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function toHex_(bytes) {
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function hashPassword_(plain) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    plain
  );
  return toHex_(bytes);
}

function getUsersSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    sheet.appendRow(['id', 'name', 'email', 'pass', 'role', 'createdAt']);
  }
  return sheet;
}

/************* Main Router *************/
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ status: 'error', message: 'No POST body' });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonResponse_({ status: 'error', message: 'Invalid JSON: ' + err });
    }

    const action = String(payload.action || '').toLowerCase();


    const PUBLIC_ACTIONS = { register: true, login: true, check_session: true };

    if (!PUBLIC_ACTIONS[action]) {
      const guard = requireValidSession_(payload);
      if (!guard.ok) {
        return jsonResponse_({ status: 'error', code: guard.code, message: guard.message });
      }
      // لو احتجت rowNumber لأي logging مستقبلاً:
      payload._sessionRowNumber = guard.rowNumber;
    }




    if (action === 'register') {
      return handleRegister_(payload);
    } else if (action === 'login') {
      return handleLogin_(payload);
    } else if (action === 'check_session') {
      return handleCheckSession_(payload);
    } else {
      return jsonResponse_({ status: 'error', message: 'Unknown action: ' + action });
    }

  } catch (err) {
    // علشان تعرف الخطأ لو حصل
    Logger.log('doPost error: ' + (err.stack || err));
    return jsonResponse_({ status: 'error', message: String(err) });
  }
}

/************* Register *************/
function handleRegister_(payload) {
  const name     = (payload.name  || '').trim();
  const emailRaw = (payload.email || '').trim().toLowerCase();
  const passRaw  = (payload.password || '').trim();

  if (!name || !emailRaw || !passRaw) {
    return jsonResponse_({ status: 'error', message: 'name, email, password are required' });
  }

  const sheet   = getUsersSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailCol = headers.indexOf('email') + 1;
  const passCol  = headers.indexOf('pass')  + 1;

  // لو الإيميل مكرر
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][emailCol - 1]).toLowerCase();
    if (rowEmail === emailRaw) {
      return jsonResponse_({ status: 'error', message: 'Email already exists' });
    }
  }

  const id        = 'U-' + new Date().getTime();
  const passHash  = hashPassword_(passRaw);
  const role      = 'user';
  const createdAt = new Date();

  sheet.appendRow([id, name, emailRaw, passHash, role, createdAt]);

  return jsonResponse_({
    status: 'success',
    user: { id, name, email: emailRaw, role }
  });
}

/************* Login *************/
/************* Login *************/
function handleLogin_(payload) {
  const emailRaw = (payload.email || '').trim().toLowerCase();
  const passRaw  = (payload.password || '').trim();

  if (!emailRaw || !passRaw) {
    return jsonResponse_({ status: 'error', message: 'email and password are required' });
  }

  const sheet = getUsersSheet_();
  const data  = sheet.getDataRange().getValues();
  if (!data || data.length < 2) {
    return jsonResponse_({ status: 'error', message: 'No users found' });
  }

  // اقرأ الهيدر مرة واحدة
  let headers = data[0].map(h => String(h).trim());

  // الأعمدة الأساسية
  const idCol    = headers.indexOf('id') + 1;
  const nameCol  = headers.indexOf('name') + 1;
  const emailCol = headers.indexOf('email') + 1;
  const passCol  = headers.indexOf('pass') + 1;
  const roleCol  = headers.indexOf('role') + 1;

  if (!idCol || !nameCol || !emailCol || !passCol) {
    return jsonResponse_({ status: 'error', message: 'Users sheet headers are missing required columns' });
  }

  // ✅ تأكد أن عمود Last Login موجود
  let lastLoginCol = headers.indexOf('Last Login') + 1;

  
  if (!lastLoginCol) {
    // أضف العمود في آخر الهيدر
    const newColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, newColIndex).setValue('Last Login');
    lastLoginCol = newColIndex;

    // حدث الهيدر في الذاكرة عشان الحسابات تبقى صحيحة
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  }


// ✅ تأكد أن أعمدة Session موجودة
let sessionTokenCol = headers.indexOf('Session Token') + 1;
if (!sessionTokenCol) {
  const c = sheet.getLastColumn() + 1;
  sheet.getRange(1, c).setValue('Session Token');
  sessionTokenCol = c;
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
}

let sessionExpCol = headers.indexOf('Session Expires At (ms)') + 1;
if (!sessionExpCol) {
  const c = sheet.getLastColumn() + 1;
  sheet.getRange(1, c).setValue('Session Expires At (ms)');
  sessionExpCol = c;
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
}

  const inputHash = hashPassword_(passRaw);

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
    const rowHash  = String(data[i][passCol  - 1]).trim();

    if (rowEmail === emailRaw && rowHash === inputHash) {

      // ✅ سجّل Last Login في نفس صف المستخدم
      // i + 1 لأن data index يبدأ من 0 لكن الشيت يبدأ من row 1
      const rowNumber = i + 1;
  sheet.getRange(rowNumber, lastLoginCol)
     .setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'));


      const user = {
        id:   data[i][idCol - 1],
        name: data[i][nameCol - 1],
        email: rowEmail,
        role: (roleCol ? data[i][roleCol - 1] : '') || 'user'
      };

// ✅ Create new session for 1 minute
const sessionToken = Utilities.getUuid();
const expiresAtMs = Date.now() + SESSION_TTL_MS;

sheet.getRange(rowNumber, sessionTokenCol).setValue(sessionToken);
sheet.getRange(rowNumber, sessionExpCol).setValue(expiresAtMs);

     return jsonResponse_({
  status: 'success',
  user,
  session: {
    token: sessionToken,
    expiresAtMs: expiresAtMs,
    ttlSeconds: Math.floor(SESSION_TTL_MS / 1000)
  }
});

    }
  }

  return jsonResponse_({ status: 'error', message: 'Invalid email or password' });
}







function handleCheckSession_(payload) {
  const emailRaw = (payload.email || '').trim().toLowerCase();
  const token = (payload.sessionToken || '').trim();

  if (!emailRaw || !token) {
    return jsonResponse_({ status: 'error', message: 'email and sessionToken are required' });
  }

  const sheet = getUsersSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const emailCol = headers.indexOf('email') + 1;
  const sessionTokenCol = headers.indexOf('Session Token') + 1;
  const sessionExpCol = headers.indexOf('Session Expires At (ms)') + 1;

  if (!emailCol || !sessionTokenCol || !sessionExpCol) {
    return jsonResponse_({ status: 'error', message: 'Session columns are missing. Login again.' });
  }

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
    if (rowEmail !== emailRaw) continue;

    const savedToken = String(data[i][sessionTokenCol - 1] || '').trim();
    const expMs = Number(data[i][sessionExpCol - 1] || 0);

    if (!savedToken || !expMs) {
      return jsonResponse_({ status: 'error', code: 'no_session', message: 'No active session. Login again.' });
    }

    if (savedToken !== token) {
      return jsonResponse_({ status: 'error', code: 'invalid_session', message: 'Invalid session token. Login again.' });
    }

    const now = Date.now();
    if (now > expMs) {
      return jsonResponse_({ status: 'error', code: 'session_expired', message: 'Session expired. Please login again.' });
    }

    return jsonResponse_({
      status: 'success',
      remainingSeconds: Math.max(0, Math.floor((expMs - now) / 1000))
    });
  }

  return jsonResponse_({ status: 'error', message: 'User not found' });
}

// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████




/**
 * ✅ Test Runner (Backend)
 * شغّل testAuthBackend_() من Run في Apps Script
 * هيسجل مستخدم (اختياري) وبعدين يعمل Login ويطبع الرد في الـ Logger
 */
function testAuthBackend() {
  // غيّر الإيميل ده كل مرة لو بتعمل register تاني (عشان "Email already exists")
  const email = 'test_' + new Date().getTime() + '@test.com';
  const password = '123456';
  const name = 'Test User';

  // 1) Test Register
  const registerPayload = {
    action: 'register',
    name: name,
    email: email,
    password: password
  };

  const regRes = handleRegister_(registerPayload);
  Logger.log('REGISTER RESPONSE: ' + regRes.getContent());

  // 2) Test Login (صح)
  const loginPayloadOk = {
    action: 'login',
    email: email,
    password: password
  };

  const loginResOk = handleLogin_(loginPayloadOk);
  Logger.log('LOGIN OK RESPONSE: ' + loginResOk.getContent());

  // 3) Test Login (غلط)
  const loginPayloadBad = {
    action: 'login',
    email: email,
    password: 'wrong_password'
  };

  const loginResBad = handleLogin_(loginPayloadBad);
  Logger.log('LOGIN BAD RESPONSE: ' + loginResBad.getContent());

  Logger.log('✅ Done. Check: View > Logs');
}





// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
// ██████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████




















/**
 * ✅ Helper: بيعمل Mock للـ doPost(e) بنفس شكل Apps Script الحقيقي
 */
function mockDoPost_(payloadObj) {
  const e = {
    postData: {
      contents: JSON.stringify(payloadObj)
    }
  };
  const res = doPost(e);               // ده بيرجع TextOutput
  return res.getContent();             // نص JSON
}

/**
 * ✅ Test: محاكاة doPost(e) حرفيًا
 * شغّل testDoPostLikeReal_() من Run
 */
function testDoPostLikeReal() {
  const email = 'acealbastony@gmail.com'//'test_' + new Date().getTime() + '@test.com';
  const password = '123456';

  // 1) REGISTER via doPost(e)
  const reg = mockDoPost_({
    action: 'register',
    name: 'Test User',
    email: email,
    password: password
  });
  Logger.log('REGISTER (doPost) => ' + reg);

  // 2) LOGIN OK via doPost(e)
  const loginOk = mockDoPost_({
    action: 'login',
    email: email,
    password: password
  });
  Logger.log('LOGIN OK (doPost) => ' + loginOk);

  // 3) LOGIN BAD via doPost(e)
  const loginBad = mockDoPost_({
    action: 'login',
    email: email,
    password: 'wrong_password'
  });
  Logger.log('LOGIN BAD (doPost) => ' + loginBad);

  // 4) Unknown action
  const unknown = mockDoPost_({
    action: 'something_else',
    x: 1
  });
  Logger.log('UNKNOWN ACTION (doPost) => ' + unknown);

  // 5) Invalid JSON simulation (حرفيًا نفس سيناريو JSON parse error)
  const invalidJsonE = { postData: { contents: "{not valid json" } };
  const invalidRes = doPost(invalidJsonE).getContent();
  Logger.log('INVALID JSON (doPost) => ' + invalidRes);

  Logger.log('✅ Done. Check: View > Logs');
}

























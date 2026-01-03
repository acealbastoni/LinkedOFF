function requireValidSession_(payload) {
  const emailRaw = (payload.email || '').trim().toLowerCase();
  const token = (payload.sessionToken || '').trim();

  if (!emailRaw || !token) {
    return { ok: false, code: 'no_session', message: 'email and sessionToken are required' };
  }

  const sheet = getUsersSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const emailCol = headers.indexOf('email') + 1;
  const sessionTokenCol = headers.indexOf('Session Token') + 1;
  const sessionExpCol = headers.indexOf('Session Expires At (ms)') + 1;

  if (!emailCol || !sessionTokenCol || !sessionExpCol) {
    return { ok: false, code: 'no_session', message: 'Session columns missing. Login again.' };
  }

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][emailCol - 1]).trim().toLowerCase();
    if (rowEmail !== emailRaw) continue;

    const savedToken = String(data[i][sessionTokenCol - 1] || '').trim();
    const expMs = Number(data[i][sessionExpCol - 1] || 0);

    if (!savedToken || !expMs) {
      return { ok: false, code: 'no_session', message: 'No active session. Login again.' };
    }
    if (savedToken !== token) {
      return { ok: false, code: 'invalid_session', message: 'Invalid session token. Login again.' };
    }
    if (Date.now() > expMs) {
      return { ok: false, code: 'session_expired', message: 'Session expired. Please login again.' };
    }

    return { ok: true, rowNumber: i + 1 };
  }

  return { ok: false, code: 'user_not_found', message: 'User not found' };
}

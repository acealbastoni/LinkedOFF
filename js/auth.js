// ===== AUTH CONFIG =====
const AUTH_CONFIG = {
  baseURL: 'https://script.google.com/macros/s/AKfycbwJpiH3xUH2EjqR5V9UzjgqHppfxPu6Tr9GmU-IlFig28jyanGW4ATSQUy_THVcMByLtw/exec'
  // لا تكتب أي query string هنا (زي ?hl=ar) خليه /exec فقط
};

// ===== LocalStorage Keys =====
const LS_USER_KEY = 'linkedoff_user';
const LS_SESSION_KEY = 'linkedoff_session'; // { token, expiresAtMs }

// ===== Helpers: User =====
function getCurrentUser() {
  const userStr = localStorage.getItem(LS_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Invalid user in localStorage', e);
    return null;
  }
}

function setCurrentUser(user) {
  if (!user) localStorage.removeItem(LS_USER_KEY);
  else localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
}

// ===== Helpers: Session =====
function getCurrentSession() {
  const sessStr = localStorage.getItem(LS_SESSION_KEY);
  if (!sessStr) return null;
  try {
    return JSON.parse(sessStr);
  } catch (e) {
    console.error('Invalid session in localStorage', e);
    return null;
  }
}

function setCurrentSession(sessionObj) {
  if (!sessionObj) localStorage.removeItem(LS_SESSION_KEY);
  else localStorage.setItem(LS_SESSION_KEY, JSON.stringify(sessionObj));
}

function isSessionExpired(sess) {
  if (!sess || !sess.expiresAtMs) return true;
  return Date.now() > Number(sess.expiresAtMs);
}

function isLoggedIn() {
  const user = getCurrentUser();
  const sess = getCurrentSession();
  if (!user || !sess || !sess.token) return false;
  return !isSessionExpired(sess);
}

// ===== Raw request (NO session enforcement) =====
async function rawAuthRequest(action, payload = {}) {
  const res = await fetch(AUTH_CONFIG.baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // علشان ما يعملش preflight
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Raw response from Apps Script:', text);
    throw new Error('Invalid JSON from server');
  }

  if ((data.status && data.status !== 'success') || data.success === false) {
    const err = new Error(data.message || 'Auth error');
    if (data.code) err.code = data.code;
    if (data.remainingQuota !== undefined) err.remainingQuota = data.remainingQuota;
    throw err;
  }

  return data;
}

// ===== Secure request (session enforced for ALL non-public actions) =====
async function authRequest(action, payload = {}) {
  const act = String(action || '').toLowerCase();

  // Public actions don't need a session
  if (act === 'login' || act === 'register') {
    return rawAuthRequest(action, payload);
  }

  // 1) local quick check
  const user = getCurrentUser();
  const sess = getCurrentSession();
  if (!user || !sess || !sess.token || isSessionExpired(sess)) {
    performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
    throw new Error('Session expired');
  }

  // 2) attach session to backend
  try {
    return await rawAuthRequest(action, {
      ...payload,
      email: user.email,
      sessionToken: sess.token
    });
  } catch (err) {
    // if backend says session invalid/expired -> logout immediately
    if (err.code === 'session_expired' || err.code === 'invalid_session' || err.code === 'no_session') {
      performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
    }
    throw err;
  }
}

// ===== Register =====
// async function registerUserFromForm(event) {
//   event.preventDefault();

//   const name = document.getElementById('regName').value.trim();
//   const email = document.getElementById('regEmail').value.trim();
//   const password = document.getElementById('regPassword').value.trim();

//   if (!name || !email || !password) {
//     alert('يرجى ملء جميع الحقول');
//     return;
//   }

//   try {
//     const data = await rawAuthRequest('register', { name, email, password });

//     // backend should return: data.user
//     setCurrentUser(data.user);

//     // NOTE: register usually doesn't create a session; force login after register
//     setCurrentSession(null);

//     alert('✅ تم التسجيل بنجاح! برجاء تسجيل الدخول.');
//     window.location.href = 'login.html';
//   } catch (err) {
//     alert('❌ فشل التسجيل: ' + err.message);
//   }
// }


async function registerUserFromForm(event) {
    event.preventDefault();
  
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
  
    setFormStatus('registerStatus', 'info', 'جاري إنشاء الحساب...');

    if (!name || !email || !password) {
      setFormStatus('registerStatus', 'error', 'يرجى ملء جميع الحقول.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      setFormStatus('registerStatus', 'error', 'صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }

    if (password.length < 6) {
      setFormStatus('registerStatus', 'error', 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل.');
      return;
    }
  
    try {
      setFormLoading('registerForm', true, 'registerBtn');
  
      const data = await withTimeout(rawAuthRequest('register', { name, email, password }), 12000);
  
      // غالبًا register مش بيعمل session، فنقول للمستخدم يسجّل دخول
      setFormStatus('registerStatus', 'success', '✅ تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.');
      setTimeout(() => {
        // تنقله لتبويب تسجيل الدخول
        if (typeof switchAuthTab === 'function') switchAuthTab('login');
      }, 600);
  
    } catch (err) {
      let msg = err.message || 'فشل إنشاء الحساب';
      if (msg === 'timeout') msg = 'التواصل مع السيرفر تأخر. حاول مرة أخرى.';
      setFormStatus('registerStatus', 'error', '❌ ' + msg);
    } finally {
      setFormLoading('registerForm', false, 'registerBtn');
    }
  }
  











// ===== Login =====
// async function loginUserFromForm(event) {
//   event.preventDefault();

//   const email = document.getElementById('loginEmail').value.trim();
//   const password = document.getElementById('loginPassword').value.trim();

//   if (!email || !password) {
//     alert('يرجى إدخال البريد وكلمة المرور');
//     return;
//   }

//   try {
//     const data = await rawAuthRequest('login', { email, password });

//     // backend should return: data.user + data.session { token, expiresAtMs }
//     setCurrentUser(data.user);

//     if (data.session && data.session.token && data.session.expiresAtMs) {
//       setCurrentSession({
//         token: data.session.token,
//         expiresAtMs: data.session.expiresAtMs
//       });
//     } else {
//       // If backend isn't returning session yet, don't keep user logged in (avoid a broken state)
//       setCurrentUser(null);
//       setCurrentSession(null);
//       throw new Error('Backend did not return session (token/expiresAtMs). Please update Apps Script login response.');
//     }

//     alert('✅ تم تسجيل الدخول بنجاح');
//     window.location.href = 'search.html';
//   } catch (err) {
//     alert('❌ فشل تسجيل الدخول: ' + err.message);
//   }
// }




async function loginUserFromForm(event) {
    event.preventDefault();
  
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
  
    setFormStatus('loginStatus', 'info', 'جاري التحقق من بيانات الدخول...');

    if (!email || !password) {
      setFormStatus('loginStatus', 'error', 'يرجى إدخال البريد وكلمة المرور.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      setFormStatus('loginStatus', 'error', 'صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }
  
    try {
      setFormLoading('loginForm', true, 'loginBtn');
  
      // ✅ rawAuthRequest (لأن login public)
      const data = await withTimeout(rawAuthRequest('login', { email, password }), 12000);
  
      setCurrentUser(data.user);
  
      if (data.session && data.session.token && data.session.expiresAtMs) {
        let expiresAt = Number(data.session.expiresAtMs);
        /* If "تذكرني" is checked, extend session to 7 days from now */
        const rememberEl = document.getElementById('rememberMe');
        if (rememberEl && rememberEl.checked) {
          expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
          localStorage.setItem('linkedoff_rememberMe', '1');
        } else {
          localStorage.removeItem('linkedoff_rememberMe');
        }
        setCurrentSession({ token: data.session.token, expiresAtMs: expiresAt });
      } else {
        setCurrentUser(null);
        setCurrentSession(null);
        throw new Error('لم يتم استلام Session من السيرفر.');
      }
  
      setFormStatus('loginStatus', 'success', 'تم تسجيل الدخول بنجاح ✅ جاري تحويلك...');
      setTimeout(() => window.location.href = 'search.html', 600);
  
    } catch (err) {
      let msg = err.message || 'فشل تسجيل الدخول';
  
      if (msg === 'timeout') {
        msg = 'التواصل مع السيرفر تأخر. حاول مرة أخرى خلال ثواني.';
      }
  
      setFormStatus('loginStatus', 'error', '❌ ' + msg);
    } finally {
      setFormLoading('loginForm', false, 'loginBtn');
    }
  }
  





// ===== Logout =====
// forceToLogin = true => redirect to login.html (for session timeout)
// otherwise => redirect to index.html (normal logout)
function performLogout(message, forceToLogin = false) {
    setCurrentUser(null);
    setCurrentSession(null);
  
    showSessionModal(
      'انتهت صلاحية الجلسة',
      message || 'انتهت مدة الجلسة لأسباب أمنية. برجاء تسجيل الدخول مرة أخرى.',
      forceToLogin
    );
  }
  
// ===== Optional: protect a page (auto-kick if session expires) =====
function startSessionEnforcer(intervalMs = 5000) {
  if (!isLoggedIn()) {
    performLogout(null, true);
    return;
  }

  // Schedule a warning 2 minutes before session expiry
  const sess = getCurrentSession();
  if (sess && sess.expiresAtMs) {
    const remaining = Number(sess.expiresAtMs) - Date.now();
    const warnBefore = 2 * 60 * 1000; // 2 minutes
    const warnDelay  = remaining - warnBefore;

    if (warnDelay > 0) {
      setTimeout(function () {
        if (isLoggedIn()) _showSessionExpiryWarning();
      }, warnDelay);
    } else if (remaining > 0) {
      // Less than 2 minutes already — show warning now
      _showSessionExpiryWarning();
    }
  }

  setInterval(() => {
    if (!isLoggedIn()) {
      performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
    }
  }, intervalMs);
}

function _showSessionExpiryWarning() {
  if (document.getElementById('_sessionExpiryBanner')) return; // already shown
  const banner = document.createElement('div');
  banner.id = '_sessionExpiryBanner';
  banner.style.cssText = [
    'position:fixed', 'bottom:70px', 'left:50%', 'transform:translateX(-50%)',
    'background:#e65100', 'color:#fff', 'padding:12px 22px',
    'border-radius:10px', 'font-family:Cairo,sans-serif', 'font-size:14px',
    'font-weight:700', 'box-shadow:0 4px 20px rgba(0,0,0,.35)',
    'z-index:9997', 'display:flex', 'align-items:center', 'gap:12px',
    'animation:_fadeInUp .4s ease'
  ].join(';');
  banner.innerHTML = `
    <span style="font-size:20px;">⚠️</span>
    <span>ستنتهي جلستك خلال دقيقتين. احفظ عملك أو سيتم تسجيل خروجك تلقائياً.</span>
    <button onclick="this.parentElement.remove()" style="
      background:rgba(255,255,255,.2);border:none;color:#fff;
      border-radius:6px;padding:4px 10px;cursor:pointer;font-family:Cairo,sans-serif;
    ">✕</button>
  `;
  // Add keyframe if not already added
  if (!document.getElementById('_sessionExpiryStyle')) {
    const s = document.createElement('style');
    s.id = '_sessionExpiryStyle';
    s.textContent = '@keyframes _fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 60000); // auto-remove after 1 minute
}






function showSessionModal(title, message, redirectToLogin = true) {
    const modal = document.getElementById('sessionModal');
    const titleEl = document.getElementById('sessionTitle');
    const msgEl = document.getElementById('sessionMessage');
  
    if (!modal) {
      // fallback في حالة نسيان HTML
      //alert(message || title);
      if (redirectToLogin) window.location.replace('login.html');
      return;
    }
  
    titleEl.textContent = title || 'تنبيه';
    msgEl.textContent = message || '';
    modal.classList.remove('hidden');
  
    // خزّن الوجهة
    modal.dataset.redirect = redirectToLogin ? 'login' : 'home';
  }
  
  function closeSessionModal() {
    const modal = document.getElementById('sessionModal');
    if (!modal) return;
  
    const redirect = modal.dataset.redirect;
    modal.classList.add('hidden');
  
    if (redirect === 'login') {
      window.location.replace('login.html');
    } else {
      window.location.href = 'index.html';
    }
  }
  
// ===== Expose to window =====
window.getCurrentUser = getCurrentUser;
window.getCurrentSession = getCurrentSession;
window.isLoggedIn = isLoggedIn;

window.rawAuthRequest = rawAuthRequest;
window.authRequest = authRequest;

window.registerUserFromForm = registerUserFromForm;
window.loginUserFromForm = loginUserFromForm;
window.performLogout = performLogout;

window.startSessionEnforcer = startSessionEnforcer;








function setFormLoading(formId, isLoading, btnId) {
    const form = document.getElementById(formId);
    const btn = document.getElementById(btnId);
    if (!form || !btn) return;
  
    // disable/enable inputs
    const inputs = form.querySelectorAll('input, button');
    inputs.forEach(el => el.disabled = !!isLoading);
  
    // spinner class
    btn.classList.toggle('loading', !!isLoading);
  }
  
  function setFormStatus(statusId, type, message) {
    const el = document.getElementById(statusId);
    if (!el) return;
  
    if (!message) {
      el.className = 'form-status';
      el.textContent = '';
      el.classList.remove('show');
      return;
    }
  
    el.className = `form-status show ${type}`; // info | success | error
    el.textContent = message;
  }
  
  // Timeout wrapper for fetch-like promises
  function withTimeout(promise, ms = 12000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
  }
  

// ===== UI: Sidebar Toggle =====
function toggleSidebar(forceOpen) {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;

  const willOpen = (typeof forceOpen === 'boolean') ? forceOpen : !sidebar.classList.contains('open');

  sidebar.classList.toggle('open', willOpen);
  if (overlay) overlay.classList.toggle('show', willOpen);
}

// Close sidebar when clicking a link (mobile UX)
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('.sidebar-nav a') : null;
  if (a && window.innerWidth <= 980) {
    toggleSidebar(false);
  }
});


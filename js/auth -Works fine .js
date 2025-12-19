// ===== AUTH CONFIG =====
const AUTH_CONFIG = {
    baseURL: 'https://script.google.com/macros/s/AKfycbwJpiH3xUH2EjqR5V9UzjgqHppfxPu6Tr9GmU-IlFig28jyanGW4ATSQUy_THVcMByLtw/exec'
    // لا تكتب أي query string هنا (زي ?hl=ar) خليه /exec فقط
};

// ===== Helpers =====
function getCurrentUser() {
    const userStr = localStorage.getItem('linkedoff_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error('Invalid user in localStorage', e);
        return null;
    }
}

function setCurrentUser(user) {
    if (!user) {
        localStorage.removeItem('linkedoff_user');
    } else {
        localStorage.setItem('linkedoff_user', JSON.stringify(user));
    }
}






async function authRequest(action, payload) {
    const res = await fetch(AUTH_CONFIG.baseURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'   // علشان ما يعملش preflight
        },
        body: JSON.stringify({
            action,
            ...payload
        })
    });

    const text = await res.text();   // نقرأ النص الأول علشان لو فيه Error نقدر نطبعه
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('Raw response from Apps Script:', text);
        throw new Error('Invalid JSON from server');
    }

    if (data.status !== 'success') {
        throw new Error(data.message || 'Auth error');
    }

    return data;
}





// ===== Register =====
async function registerUserFromForm(event) {
    event.preventDefault();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!name || !email || !password) {
        alert('يرجى ملء جميع الحقول');
        return;
    }

    try {
        const data = await authRequest('register', { name, email, password });

        // نفترض أن الـ backend يعيد user في data.user
        setCurrentUser(data.user);

        alert('✅ تم التسجيل بنجاح! سيتم تحويلك للوحة التحكم');
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert('❌ فشل التسجيل: ' + err.message);
    }
}

// ===== Login =====
async function loginUserFromForm(event) {
    event.preventDefault();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        alert('يرجى إدخال البريد وكلمة المرور');
        return;
    }

    try {
        const data = await authRequest('login', { email, password });

        // نفترض أن الـ backend يعيد user في data.user
        setCurrentUser(data.user);

        alert('✅ تم تسجيل الدخول بنجاح');
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert('❌ فشل تسجيل الدخول: ' + err.message);
    }
}

// ===== Logout (عام) =====
function performLogout() {
    setCurrentUser(null);

    // لو حابب تمسح بعض الإحصائيات مع الخروج:
    // localStorage.removeItem('savedJobs');
    // localStorage.removeItem('jobsViewed');
    // ...

    alert('👋 تم تسجيل الخروج بنجاح');
    window.location.href = 'index.html';
}

// نعرّض الدوال للـ window عشان نقدر نستدعيها من الـ HTML
window.getCurrentUser       = getCurrentUser;
window.registerUserFromForm = registerUserFromForm;
window.loginUserFromForm    = loginUserFromForm;
window.performLogout        = performLogout;

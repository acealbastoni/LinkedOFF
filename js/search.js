
// // API Configuration
// const API_CONFIG = {
//     baseURL: 'https://script.google.com/macros/s/AKfycbyin6nA9tDwOkhDtl9h4WyTvdT6nvcY91yXfQmPzbXYcvUs1ASqLCnke93vNVHN_bVNTQ/exec',
//     apiKey: '447e152f-143f-4195-80fd-42b87d40af46-1764452322847'
// };



const API_CONFIG = {
    baseURL: 'https://script.google.com/macros/s/AKfycbw6ctohJP85I1Jeo6p5z2EWyiFBEdavgX_TcWvlZtho--6j1SPr-xxtwLDZsgiYErqsKQ/exec',
    apiKey: '447e152f-143f-4195-80fd-42b87d40af46-1764452322847' // أو خلي apiKey زي ما هو عندك
  };
  

/**
 * ✅ Session helper for JOBS API calls (loadJobs)
 * Requires auth.fixed.js to be loaded (getCurrentUser/getCurrentSession/isLoggedIn/performLogout)
 */
function getJobsSessionQuery_() {
    if (typeof window.getCurrentUser !== 'function' || typeof window.getCurrentSession !== 'function') return null;
    const u = window.getCurrentUser();
    const s = window.getCurrentSession();
    if (!u || !s || !s.token) return null;
    return `&email=${encodeURIComponent(u.email)}&sessionToken=${encodeURIComponent(s.token)}`;
}

function ensureSessionForActions_() {
    if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
        if (typeof window.performLogout === 'function') {
            window.performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
        } else {
            alert('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.');
            window.location.href = 'login.html';
        }
        return false;
    }
    return true;
}

// State Management
let currentPage = 1;
let totalPages = 1;
let totalJobs = 0;
let jobsData = [];
let isSubscribed = true//checkSubscription();

// ── Search results state (progressive search) ─────────────────────────
let _searchAllResults  = [];   // accumulated matched jobs across all pages
let _searchCurrentPage = 1;    // current page being viewed in search results
const SEARCH_PAGE_SIZE = 100;  // max jobs per search results page

// Check Subscription Status
function checkSubscription() {
    // يمكن تطويره لاحقاً للتحقق من الاشتراك الفعلي
    return localStorage.getItem('subscription') === 'active';
}

// // Load Jobs from API
// async function loadJobs(page = 1) {
//         if (!ensureSessionForActions_()) return;
// const container = document.getElementById('jobsContainer');
//     const resultsInfo = document.getElementById('resultsInfo');
    
//     // Show loading
//     container.innerHTML = `
//         <div class="loading">
//             <div class="spinner"></div>
//             <p>جاري تحميل الوظائف...</p>
//         </div>
//     `;

//     try {
//         const pageSize = isSubscribed ? 50 : 10; // المشتركون يحصلون على نتائج أكثر
//         const sessQ = getJobsSessionQuery_();
//         if (!sessQ) { ensureSessionForActions_(); throw new Error('Session missing'); }
//         const url = `${API_CONFIG.baseURL}?key=${API_CONFIG.apiKey}&page=${page}&pageSize=${pageSize}${sessQ}`;
        
//         const response = await fetch(url);
//         const data = await response.json();

//         // ✅ If backend says session invalid/expired -> logout immediately
//         if (!data.ok && (data.error === 'NO_SESSION' || data.error === 'INVALID_SESSION' || data.error === 'SESSION_EXPIRED')) {
//             if (typeof window.performLogout === 'function') {
//                 window.performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
//             }
//             throw new Error(data.message || 'Session expired');
//         }

//         if (data.ok) {
//             jobsData = data.data;
//             currentPage = data.page;
//             totalPages = data.totalPages;
//             totalJobs = data.totalRows;

//             displayJobs(jobsData);
//             updateResultsInfo();
//             renderPagination();
//         } else {
//             throw new Error(data.message || 'فشل تحميل البيانات');
//         }
//     } catch (error) {
//         console.error('Error loading jobs:', error);
//         container.innerHTML = `
//             <div class="no-results">
//                 <div class="no-results-icon">❌</div>
//                 <h3>حدث خطأ في تحميل الوظائف</h3>
//                 <p>${error.message}</p>
//                 <button class="btn-primary" onclick="loadJobs(${page})">إعادة المحاولة</button>
//             </div>
//         `;
//     }
// }




// async function loadJobs(page = 1) {
//     try {
//       const pageSize = API_CONFIG.pageSize || 10;
  
//       // ✅ session data from auth.js
//       const user = getCurrentUser?.();
//       const sess = getCurrentSession?.();
  
//       if (!user || !sess || !sess.token || isSessionExpired?.(sess)) {
//         performLogout?.('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
//         return;
//       }
  
//       const url =
//         `${API_CONFIG.baseURL}?key=${encodeURIComponent(API_CONFIG.apiKey)}` +
//         `&email=${encodeURIComponent(user.email)}` +
//         `&sessionToken=${encodeURIComponent(sess.token)}` +
//         `&page=${encodeURIComponent(page)}` +
//         `&pageSize=${encodeURIComponent(pageSize)}`;
  
//       const response = await fetch(url, {method: 'GET',redirect: 'follow'});
//       const text = await response.text();
  
//       let data;
//       try { data = JSON.parse(text); }
//       catch (e) {
//         console.error('Non-JSON response:', text.slice(0, 300));
//         throw new Error('Server returned non-JSON');
//       }
  
//       // ✅ لو الباك-إند بيرجع {ok:false, code:'session_expired'} أو status error
//       if (data.code === 'session_expired' || data.code === 'invalid_session' || data.code === 'no_session') {
//         performLogout?.('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
//         return;
//       }
  
//       if (data.ok === false || data.status === 'error') {
//         throw new Error(data.message || 'Load jobs failed');
//       }
  
//       // ✅ كمل باقي منطقك الحالي لعرض الوظائف باستخدام data.data / data.totalPages ...
//       // renderJobs(data.data); updatePagination(...); إلخ
  
//     } catch (err) {
//       console.error('Error loading jobs:', err);
//       alert('حدث خطأ أثناء تحميل الوظائف: ' + err.message);
//     }
//   }
  

async function loadJobs(page = 1) {
    const container = document.getElementById('jobsContainer');
  
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>جاري تحميل الوظائف...</p>
      </div>
    `;
  
    try {
      const pageSize = isSubscribed ? 50 : 10;
  
      // ✅ اجلب session من auth.js
      const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
      const sess = (typeof getCurrentSession === 'function') ? getCurrentSession() : null;
  
      if (!user || !sess || !sess.token || (typeof isSessionExpired === 'function' && isSessionExpired(sess))) {
        if (typeof performLogout === 'function') {
          performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
        } else {
          alert('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.');
          window.location.replace('login.html');
        }
        return;
      }
  
      // ✅ لازم يكون baseURL هو /exec الجديد الصحيح
      const url =
        `${API_CONFIG.baseURL}?key=${encodeURIComponent(API_CONFIG.apiKey)}` +
        `&email=${encodeURIComponent(user.email)}` +
        `&sessionToken=${encodeURIComponent(sess.token)}` +
        `&page=${encodeURIComponent(page)}` +
        `&pageSize=${encodeURIComponent(pageSize)}`;
  
      const response = await fetch(url, { method: 'GET', redirect: 'follow' });
  
      // اقرأ كنص أولاً (عشان لو HTML نكشفه)
      const text = await response.text();
  
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Non-JSON response (first 300 chars):', text.slice(0, 300));
        throw new Error('Server returned non-JSON (check deploy URL / permissions)');
      }
  
        // ✅ لو السيرفر قال السيشن بايظة
        if (data.code === 'session_expired' || data.code === 'invalid_session' || data.code === 'no_session') {
            if (typeof performLogout === 'function')
                performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
            return;
        }

      if (!data.ok) throw new Error(data.message || 'فشل تحميل البيانات');
  
      jobsData = data.data;
      currentPage = data.page;
      totalPages = data.totalPages;
      totalJobs = data.totalRows;
  
      displayJobs(jobsData);
      updateResultsInfo();
      renderPagination();
  
    } catch (error) {
      console.error('Error loading jobs:', error);
      container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">❌</div>
          <h3>حدث خطأ في تحميل الوظائف</h3>
          <p>${error.message}</p>
          <button class="btn-primary" onclick="loadJobs(${page})">إعادة المحاولة</button>
        </div>
      `;
    }
  }
  





// Display Jobs
function displayJobs(jobs) {
    const container = document.getElementById('jobsContainer');

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>لم يتم العثور على وظائف</h3>
                <p>جرب تعديل معايير البحث أو الفلتر</p>
                <button class="btn-primary" onclick="resetFilters()">إعادة تعيين الفلتر</button>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map((job, index) => {
        const isLocked = 
        !isSubscribed && index >= 3; // أول 3 وظائف مجانية فقط
        //false;
        
        return createJobCard(job, isLocked);
    }).join('');
}

// Detect Arabic
function isArabic(text) {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
}

// Return direction
function getDirection(text) {
    return isArabic(text) ? 'rtl' : 'ltr';
}


// function highlightHashtags(text) {
//     return text.replace(/(^|\s)(#[A-Za-z0-9_]+)/g, (match, space, tag) => {
//         return `${space}<span class="hashtag">${tag}</span>`;
//     });
// }
// Create Job Card
function createJobCard(job, isLocked = false) {
    let description = convert(job.plainTextJobDescription) || 'لا يوجد وصف متاح';
    description = normalizeDescription(description);
  
    const shortDescription =
      description.substring(0, 200) + (description.length > 200 ? '...' : '');
  
    const realEmail = job.attachedEmails || 'غير متوفر';
  
    const source = job.source || 'LinkedIn';
    const date = job.scrappedDate;
  
    // نحاول نجيب الإيميل من الـ attachedEmails أولاً، لو مش موجود ناخده من الوصف
    const extractedEmail = description.match(/[.\w-]+@([\w-]+\.)+[\w-]+/g);
    const displayedEmail =
      (realEmail && realEmail !== 'غير متوفر')
        ? realEmail
        : (extractedEmail ? extractedEmail[0] : null);
  
    let jobTitleHtml = "وظيفة";
  
    if (displayedEmail) {
      const atIndex = displayedEmail.indexOf("@");
      if (atIndex !== -1) {
        const local = displayedEmail.substring(0, atIndex);
        const domain = displayedEmail.substring(atIndex);
  
        jobTitleHtml = `
          <span class="email-blur">${local}</span><span>${domain}</span>
        `;
      } else {
        jobTitleHtml = escapeHtml(displayedEmail);
      }
    }
  
    const city = extractCity(description);
    const salary = extractSalary(description);
  
    const descriptionHtml = highlightHashtags(
      highlightEmails(escapeHtml(description))
    ).replace(/\n/g, '<br>');
  
    const shortDescriptionHtml = highlightHashtags(
      highlightEmails(escapeHtml(shortDescription))
    ).replace(/\n/g, '<br>');
  
    const usedDescriptionHtml = isLocked ? shortDescriptionHtml : descriptionHtml;
  
    const alreadyApplied = !isLocked && displayedEmail && displayedEmail !== 'غير متوفر' && isJobApplied(displayedEmail);
    const appliedInfo    = alreadyApplied ? getAppliedJobs()[displayedEmail] : null;

    return `
      <div class="job-card ${isLocked ? 'locked' : ''} ${alreadyApplied ? 'applied' : ''}" data-job-id="${job.dkey}">
        <div class="job-header">
          <div>
            <h3 class="job-title" style="direction:ltr; text-align:left;">
              ${isLocked        ? '<span class="premium-badge">🔒 Premium</span>' : ''}
              ${alreadyApplied  ? '<span class="applied-badge">✅ تم الإرسال</span>' : ''}
              ${jobTitleHtml}
            </h3>

            <div class="job-meta">
              ${city   ? `<span>📍 ${city}</span>`   : ''}
              ${salary ? `<span>💰 ${salary}</span>` : ''}
              <span>📅 ${date}</span>
              ${alreadyApplied && appliedInfo ? `<span class="applied-meta">📤 أُرسل ${appliedInfo.count > 1 ? appliedInfo.count + ' مرات' : 'مرة'} · آخرها ${appliedInfo.lastSent}</span>` : ''}
            </div>
          </div>

          <span class="job-source">${source}</span>
        </div>

        <div class="job-description ${isLocked ? 'locked' : ''}" dir="auto">
          <p>${usedDescriptionHtml}</p>
        </div>

        ${isLocked ? `
          <div class="unlock-overlay">
            <button onclick="showSubscriptionModal()">
              🔓 اشترك الآن لرؤية التفاصيل الكاملة
            </button>
          </div>
        ` : `
          <div class="job-actions">
            ${alreadyApplied ? `
              <button class="btn-applied" data-email="${escapeHtml(realEmail)}" onclick="applyNow(this)">
                ✅ تم الإرسال — أعد الإرسال؟
              </button>
            ` : `
              <button class="btn-primary"
                      data-email="${escapeHtml(realEmail)}"
                      onclick="applyNow(this)">
                📧 تقديم الآن
              </button>
            `}

            ${displayedEmail && displayedEmail !== 'غير متوفر' ? `
              <button class="btn-outline btn-copy-email"
                      onclick="copyEmail('${escapeHtml(displayedEmail)}')"
                      title="نسخ الإيميل">
                📋
              </button>
            ` : ''}

            <button class="btn-save" id="save-${job.dkey}"
                    onclick="saveJob('${job.dkey}',${JSON.stringify({
                      id: job.dkey,
                      email: escapeHtml(realEmail || ''),
                      source: escapeHtml(source || ''),
                      date: escapeHtml(date || ''),
                      city: escapeHtml(city || ''),
                      salary: escapeHtml(salary || ''),
                      savedAt: new Date().toISOString().slice(0,10)
                    }).replace(/'/g,'&#39;')})">
              ${(JSON.parse(localStorage.getItem('savedJobs')||'[]').includes(job.dkey)) ? '🔖 محفوظة' : '💾 حفظ'}
            </button>
            <button class="btn-outline" onclick="shareJob('${job.dkey}','${escapeHtml(source||'')}')">📤 مشاركة</button>

            <button class="btn-outline toggle-description-btn"
                    onclick="toggleDescription('${job.dkey}')">
              👀 عرض المزيد
            </button>
          </div>
        `}
      </div>
    `;
  }
  
  
// تأمين النص من أي HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// تلوين أي كلمة تبدأ بـ # (تدعم عربي وإنجليزي)
function highlightHashtags(text) {
    if (!text) return '';
    return text.replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu, (match, space, tag) => {
        return `${space}<span class="hashtag">${tag}</span>`;
    });
}

// Extract Job Details
function extractJobTitle(description) {
    const lines = description.split('\n');
    const firstLine = lines[0] || 'وظيفة متاحة';
    return firstLine.substring(0, 100);
}

// function extractCity(description) {
//     const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الخبر', 'الطائف', 'تبوك', 'أبها'];
//     const found = cities.find(city => description.includes(city));
//     return found || null;
// }

function extractSalary(description) {
    const salaryRegex = /(\d{1,3}[,،]?\d{0,3})\s*(ريال|SAR|SR)/i;
    const match = description.match(salaryRegex);
    return match ? `${match[1]} ريال` : null;
}

// ===== Progressive All-Pages Search =====

let _activeSearch = null; // cancellation token

/** Private: fetch a single page from the API without touching global state */
async function fetchJobsPageRaw_(page) {
    const user = (typeof getCurrentUser  === 'function') ? getCurrentUser()  : null;
    const sess = (typeof getCurrentSession === 'function') ? getCurrentSession() : null;
    if (!user || !sess || !sess.token) throw new Error('Session missing');

    const pageSize = isSubscribed ? 50 : 10;
    const url =
        `${API_CONFIG.baseURL}?key=${encodeURIComponent(API_CONFIG.apiKey)}` +
        `&email=${encodeURIComponent(user.email)}` +
        `&sessionToken=${encodeURIComponent(sess.token)}` +
        `&page=${encodeURIComponent(page)}` +
        `&pageSize=${encodeURIComponent(pageSize)}`;

    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text     = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('Server returned non-JSON'); }

    if (data.code === 'session_expired' || data.code === 'invalid_session' || data.code === 'no_session') {
        if (typeof performLogout === 'function')
            performLogout('⏳ انتهت مدة الجلسة. برجاء تسجيل الدخول مرة أخرى.', true);
        throw new Error('Session expired');
    }
    if (!data.ok) throw new Error(data.message || 'فشل تحميل البيانات');
    return data;
}

/**
 * Parse a comma-or-space-separated keyword string into a lowercase array.
 * e.g. "python, senior remote" → ["python", "senior", "remote"]
 */
function parseKeywords_(str) {
    if (!str) return [];
    return str
        .split(/[,\s]+/)
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);
}

/** Match a job against all active filters */
function matchesFilters_(job, kwLower, city, field, salary, contract, mustInclude, mustExclude, dateFrom, dateTo) {
    const raw  = (job.plainTextJobDescription || '');
    const desc = raw.toLowerCase();
    const src  = (job.source || '').toLowerCase();

    if (kwLower && !desc.includes(kwLower) && !src.includes(kwLower)) return false;
    if (city     && !desc.includes(city))     return false;
    if (field    && !desc.includes(field))    return false;
    if (contract && !desc.includes(contract)) return false;
    if (salary > 0) {
        const s = extractSalary(raw);
        const num = s ? parseInt(s.replace(/[^0-9]/g, '')) : 0;
        if (!num || num < salary) return false;
    }

    // Boolean AND: every must-include word must appear
    if (mustInclude && mustInclude.length > 0) {
        for (const word of mustInclude) {
            if (!desc.includes(word) && !src.includes(word)) return false;
        }
    }

    // Boolean NOT: none of the must-exclude words may appear
    if (mustExclude && mustExclude.length > 0) {
        for (const word of mustExclude) {
            if (desc.includes(word) || src.includes(word)) return false;
        }
    }

    // Date range: scrappedDate is YYYYMMDD (e.g. 20260223)
    if (dateFrom || dateTo) {
        const jd = String(job.scrappedDate || '').replace(/\D/g, '');
        const fd = (dateFrom || '').replace(/-/g, '');
        const td = (dateTo   || '').replace(/-/g, '');
        if (fd && jd && jd < fd) return false;
        if (td && jd && jd > td) return false;
    }

    return true;
}

/** Progressive search across ALL pages — paginated results, fixed progress widget */
async function searchAllPages(keyword, filters = {}) {
    if (_activeSearch) _activeSearch.cancelled = true;
    const token = { cancelled: false };
    _activeSearch = token;

    // Reset accumulated results
    _searchAllResults  = [];
    _searchCurrentPage = 1;

    const kwLower     = (keyword || '').trim().toLowerCase();
    const city        = filters.city        || '';
    const field       = filters.field       || '';
    const salary      = filters.salary      || 0;
    const contract    = filters.contract    || '';
    const mustInclude = filters.mustInclude || [];
    const mustExclude = filters.mustExclude || [];
    const dateFrom    = filters.dateFrom    || '';
    const dateTo      = filters.dateTo      || '';

    const container   = document.getElementById('jobsContainer');
    const resultsInfo = document.getElementById('resultsInfo');
    const pagination  = document.getElementById('pagination');

    container.innerHTML = '';
    if (pagination) pagination.innerHTML = '';
    document.getElementById('_searchProgressWrap')?.remove();

    // Show fixed floating progress widget
    showSearchProgressWidget_(keyword);
    resultsInfo.innerHTML = `<p style="color:#888;font-family:Cairo,sans-serif;">جاري البحث... 0 نتيجة حتى الآن</p>`;

    let pageNum         = 1;
    let totalPagesCount = totalPages || 1;

    while (pageNum <= totalPagesCount && !token.cancelled) {
        try {
            const data = await fetchJobsPageRaw_(pageNum);
            if (token.cancelled) break;

            totalPagesCount = data.totalPages;

            const matches = (data.data || []).filter(job =>
                matchesFilters_(job, kwLower, city, field, salary, contract, mustInclude, mustExclude, dateFrom, dateTo)
            );

            if (matches.length > 0) {
                const prevTotal = _searchAllResults.length;
                _searchAllResults.push(...matches);
                const newTotal  = _searchAllResults.length;

                // Re-render current page only if it was affected by new results
                const pageStart = (_searchCurrentPage - 1) * SEARCH_PAGE_SIZE;
                const pageEnd   = pageStart + SEARCH_PAGE_SIZE;
                if (newTotal > pageStart && prevTotal < pageEnd) {
                    renderSearchResultPage_(_searchCurrentPage);
                }
                renderSearchResultPagination_();
            }

            // Update floating widget + results info
            updateSearchProgressWidget_(_searchAllResults.length, pageNum, totalPagesCount);
            resultsInfo.innerHTML = `
                <p>🔍 <strong>${_searchAllResults.length}</strong> نتيجة حتى الآن
                &nbsp;·&nbsp; <span style="color:#888;font-size:13px;">صفحة ${pageNum} من ${totalPagesCount} جارٍ فحصها</span></p>`;

            pageNum++;
            if (pageNum <= totalPagesCount && !token.cancelled)
                await new Promise(r => setTimeout(r, 180));

        } catch (err) {
            if (token.cancelled || err.message === 'Session expired') break;
            console.warn('Search skip page', pageNum, err.message);
            pageNum++;
        }
    }

    if (token.cancelled) return;
    _activeSearch = null;

    // ── Done ──────────────────────────────────────────────────────────────
    hideSearchProgressWidget_();

    const totalFound = _searchAllResults.length;
    if (totalFound === 0) {
        container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>لم يتم العثور على وظائف</h3>
                <p>لا توجد نتائج لـ "<strong>${escapeHtml(keyword)}</strong>" في كل الصفحات</p>
                <button class="btn-primary" onclick="resetFilters()">إعادة تعيين</button>
            </div>`;
    } else {
        renderSearchResultPage_(_searchCurrentPage);
    }

    resultsInfo.innerHTML = `
        <p>✅ اكتمل البحث: <strong>${totalFound}</strong> نتيجة لـ "<strong>${escapeHtml(keyword)}</strong>"
        &nbsp;·&nbsp; <span style="color:#888;font-size:13px;">تم فحص ${totalPagesCount} صفحة</span></p>`;
    renderSearchResultPagination_();
}

// ── Search results page navigation ────────────────────────────────────

/** Render a page slice from _searchAllResults */
function renderSearchResultPage_(pg) {
    _searchCurrentPage = pg;
    const start     = (pg - 1) * SEARCH_PAGE_SIZE;
    const slice     = _searchAllResults.slice(start, start + SEARCH_PAGE_SIZE);
    const container = document.getElementById('jobsContainer');
    if (container) {
        container.innerHTML = slice.length
            ? slice.map(j => createJobCard(j, false)).join('')
            : '';
    }
}

/** Build pagination for search results */
function renderSearchResultPagination_() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    const total    = _searchAllResults.length;
    const totalPgs = Math.ceil(total / SEARCH_PAGE_SIZE);
    if (totalPgs <= 1) { pagination.innerHTML = ''; return; }

    const pg = _searchCurrentPage;
    let html = `<button onclick="changeSearchPage_(${pg - 1})" ${pg <= 1 ? 'disabled' : ''}>← السابق</button>`;

    const maxBtn = 5;
    let start = Math.max(1, pg - Math.floor(maxBtn / 2));
    let end   = Math.min(totalPgs, start + maxBtn - 1);
    if (end - start + 1 < maxBtn) start = Math.max(1, end - maxBtn + 1);

    for (let i = start; i <= end; i++) {
        html += `<button onclick="changeSearchPage_(${i})" class="${i === pg ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="changeSearchPage_(${pg + 1})" ${pg >= totalPgs ? 'disabled' : ''}>التالي →</button>`;
    html += `<span class="pagination-info" style="font-size:12px;color:#888;">صفحة ${pg} من ${totalPgs} (${total} نتيجة)</span>`;
    pagination.innerHTML = html;
}

/** Navigate to a specific search results page */
function changeSearchPage_(pg) {
    const maxPg = Math.max(1, Math.ceil(_searchAllResults.length / SEARCH_PAGE_SIZE));
    if (pg < 1 || pg > maxPg) return;
    renderSearchResultPage_(pg);
    renderSearchResultPagination_();
    const container = document.getElementById('jobsContainer');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Fixed floating progress widget ────────────────────────────────────

function showSearchProgressWidget_(keyword) {
    hideSearchProgressWidget_();
    const el = document.createElement('div');
    el.id        = '_spWidget';
    el.className = 'spw';
    el.innerHTML = `
        <div class="spw-ring"></div>
        <div class="spw-body">
            <div class="spw-title">جاري البحث عن <strong>"${escapeHtml(keyword)}"</strong></div>
            <div class="spw-sub" id="_spwSub">0 نتيجة · صفحة 1</div>
            <div class="spw-bar-wrap"><div class="spw-bar" id="_spwBar"></div></div>
        </div>
        <button class="spw-cancel" onclick="cancelAllPagesSearch()" title="إلغاء البحث">✕ إلغاء</button>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('spw--visible'));
}

function updateSearchProgressWidget_(count, page, totalPgs) {
    const sub = document.getElementById('_spwSub');
    const bar = document.getElementById('_spwBar');
    if (sub) sub.textContent = `${count} نتيجة · صفحة ${page} من ${totalPgs}`;
    if (bar) bar.style.width = (totalPgs > 0 ? Math.round((page / totalPgs) * 100) : 0) + '%';
}

function hideSearchProgressWidget_() {
    const el = document.getElementById('_spWidget');
    if (!el) return;
    el.classList.remove('spw--visible');
    el.classList.add('spw--hiding');
    setTimeout(() => el.remove(), 400);
}

/** Cancel ongoing progressive search */
function cancelAllPagesSearch() {
    if (_activeSearch) { _activeSearch.cancelled = true; _activeSearch = null; }
    hideSearchProgressWidget_();
    document.getElementById('_searchProgressWrap')?.remove();
    document.getElementById('resultsInfo').innerHTML =
        `<p>تم إلغاء البحث. <button onclick="resetFilters()" class="btn-outline" style="padding:4px 14px;margin-right:8px;">عودة لكل الوظائف</button></p>`;
}

// Search and Filter
function searchJobs() {
    saveLastSearch_(); // persist filter state

    const keyword      = document.getElementById('searchKeyword').value.trim();
    const city         = document.getElementById('cityFilter').value;
    const field        = document.getElementById('fieldFilter').value;
    const salary       = parseInt(document.getElementById('salaryFilter').value) || 0;
    const contract     = document.getElementById('contractFilter').value;
    const mustInclude  = parseKeywords_(document.getElementById('mustIncludeFilter').value);
    const mustExclude  = parseKeywords_(document.getElementById('mustExcludeFilter').value);
    const dateFrom     = document.getElementById('dateFromFilter')?.value  || '';
    const dateTo       = document.getElementById('dateToFilter')?.value    || '';

    // ── Keyword present → search across ALL pages progressively ──────────
    if (keyword) {
        searchAllPages(keyword, { city, field, salary, contract, mustInclude, mustExclude, dateFrom, dateTo });
        return;
    }

    // ── No keyword → filter current page locally (fast) ──────────────────
    if (_activeSearch) { _activeSearch.cancelled = true; _activeSearch = null; }
    document.getElementById('_searchProgressWrap')?.remove();
    hideSearchProgressWidget_();

    let filtered = jobsData.filter(job =>
        matchesFilters_(job, '', city, field, salary, contract, mustInclude, mustExclude, dateFrom, dateTo)
    );

    displayJobs(filtered);

    document.getElementById('resultsInfo').innerHTML = `
        <p>تم العثور على <strong>${filtered.length}</strong> وظيفة من أصل <strong>${jobsData.length}</strong></p>
    `;
}

// ── Save / Restore last search filters ──────────────────────────────
function saveLastSearch_() {
    try {
        const filters = {
            keyword:     document.getElementById('searchKeyword')?.value    || '',
            city:        document.getElementById('cityFilter')?.value       || '',
            field:       document.getElementById('fieldFilter')?.value      || '',
            salary:      document.getElementById('salaryFilter')?.value     || '0',
            contract:    document.getElementById('contractFilter')?.value   || '',
            mustInclude: document.getElementById('mustIncludeFilter')?.value || '',
            mustExclude: document.getElementById('mustExcludeFilter')?.value || '',
            dateFrom:    document.getElementById('dateFromFilter')?.value   || '',
            dateTo:      document.getElementById('dateToFilter')?.value     || '',
        };
        localStorage.setItem('linkedoff_lastSearch', JSON.stringify(filters));
    } catch (e) {}
}

function restoreLastSearch_() {
    try {
        const raw = localStorage.getItem('linkedoff_lastSearch');
        if (!raw) return;
        const f = JSON.parse(raw);
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
        set('searchKeyword',    f.keyword);
        set('cityFilter',       f.city);
        set('fieldFilter',      f.field);
        set('salaryFilter',     f.salary);
        set('contractFilter',   f.contract);
        set('mustIncludeFilter',f.mustInclude);
        set('mustExcludeFilter',f.mustExclude);
        set('dateFromFilter',   f.dateFrom);
        set('dateToFilter',     f.dateTo);

        /* Open advanced filters only for non-date values (dates have their own visible row) */
        if (f.city || f.field || (f.salary && f.salary !== '0') || f.contract || f.mustInclude || f.mustExclude) {
            const adv = document.getElementById('advancedFilters');
            if (adv) adv.classList.add('active');
        }

        /* Show restore toast */
        if (f.keyword || f.city || f.field) showRestoreToast_();
    } catch (e) {}
}

function showRestoreToast_() {
    const toast = document.createElement('div');
    toast.style.cssText = [
        'position:fixed','top:72px','left:50%','transform:translateX(-50%)',
        'background:rgba(29,191,115,.95)','color:#fff','padding:8px 20px',
        'border-radius:20px','font-size:0.82rem','font-weight:700',
        'font-family:Cairo,sans-serif','z-index:9999','box-shadow:0 4px 16px rgba(0,168,89,.4)',
        'animation:_toastIn .3s ease','pointer-events:none',
    ].join(';');
    toast.textContent = '🔁 تم استعادة آخر بحث';
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; }, 2200);
    setTimeout(function () { toast.remove(); }, 2700);
}

// Toggle Advanced Filters
function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    filters.classList.toggle('active');
}

// Reset Filters
function resetFilters() {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('cityFilter').value = '';
    document.getElementById('fieldFilter').value = '';
    document.getElementById('salaryFilter').value = '0';
    document.getElementById('contractFilter').value = '';
    document.getElementById('mustIncludeFilter').value = '';
    document.getElementById('mustExcludeFilter').value = '';
    // Reset date range to defaults (last 30 days → today)
    (function() {
        const today    = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const fmt = d => d.toISOString().slice(0, 10);
        const df = document.getElementById('dateFromFilter');
        const dt = document.getElementById('dateToFilter');
        if (df) df.value = fmt(monthAgo);
        if (dt) dt.value = fmt(today);
    })();
    localStorage.removeItem('linkedoff_lastSearch');
    if (typeof hideSearchProgressWidget_ === 'function') hideSearchProgressWidget_();
    _searchAllResults = []; _searchCurrentPage = 1;

    displayJobs(jobsData);
    updateResultsInfo();
}

// Update Results Info
function updateResultsInfo() {
    // Update hero stat
    const heroEl = document.getElementById('heroTotalJobs');
    if (heroEl && totalJobs > 0) heroEl.textContent = totalJobs.toLocaleString('ar-SA');

    const resultsInfo = document.getElementById('resultsInfo');
    const start = (currentPage - 1) * (isSubscribed ? 50 : 10) + 1;
    const end = Math.min(start + jobsData.length - 1, totalJobs);
    
    resultsInfo.innerHTML = `
        <p>
            عرض <strong>${start}-${end}</strong> من أصل <strong>${totalJobs.toLocaleString('ar-SA')}</strong> وظيفة
            ${!isSubscribed ? '<br><span style="color: #FF6B00;">💎 اشترك للوصول لجميع الوظائف</span>' : ''}
        </p>
    `;
}

// Pagination
function renderPagination() {
    const pagination = document.getElementById('pagination');
    
    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            ← السابق
        </button>
        
        <span class="pagination-info">
            صفحة ${currentPage} من ${totalPages}
        </span>
    `;

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button 
                onclick="changePage(${i})" 
                class="${i === currentPage ? 'active' : ''}"
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            التالي →
        </button>
    `;

    pagination.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    loadJobs(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Apply to Job
function applyJob(jobId, email) {
    if (!isSubscribed) {
        showSubscriptionModal();
        return;
    }

    if (email && email !== 'غير متوفر') {
        const subject = 'طلب توظيف';
        const body = 'مرحباً،\n\nأنا مهتم بالتقديم على هذه الوظيفة.\n\nشكراً';
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
        alert('⚠️ لا يوجد بريد إلكتروني متاح لهذه الوظيفة');
    }
}

// Save Job (Session-protected)
function saveJob(jobId, richData) {
    if (!ensureSessionForActions_()) return;

    let savedJobs     = JSON.parse(localStorage.getItem('savedJobs')     || '[]');
    let savedJobsData = JSON.parse(localStorage.getItem('savedJobsData') || '{}');

    const btn = document.getElementById('save-' + jobId);

    if (savedJobs.includes(jobId)) {
        savedJobs = savedJobs.filter(id => id !== jobId);
        delete savedJobsData[jobId];
        localStorage.setItem('savedJobs',     JSON.stringify(savedJobs));
        localStorage.setItem('savedJobsData', JSON.stringify(savedJobsData));
        if (btn) btn.innerHTML = '💾 حفظ';
    } else {
        savedJobs.push(jobId);
        if (richData) savedJobsData[jobId] = richData;
        localStorage.setItem('savedJobs',     JSON.stringify(savedJobs));
        localStorage.setItem('savedJobsData', JSON.stringify(savedJobsData));
        if (btn) btn.innerHTML = '🔖 محفوظة';
    }

    /* Refresh sidebar counters if ui.js is loaded */
    if (typeof window.refreshUICounters === 'function') window.refreshUICounters();
}


// Share Job
function shareJob(jobId, title) {
    const url = `${window.location.origin}/search.html?job=${jobId}`;
    const text = `شاهد هذه الوظيفة: ${title}`;
    
    if (navigator.share) {
        navigator.share({ title, text, url });
    } else {
        navigator.clipboard.writeText(url);
        alert('✅ تم نسخ رابط الوظيفة!');
    }
}

// Export Results
function exportResults() {
    if (!isSubscribed) {
        showSubscriptionModal();
        return;
    }

    // Create CSV content
    let csv = 'العنوان,المدينة,المصدر,التاريخ,الوصف\n';
    
    jobsData.forEach(job => {
        const title = extractJobTitle(job.plainTextJobDescription);
        const city = extractCity(job.plainTextJobDescription) || '';
        const source = job.source || '';
        const date = job.scrappedDate || '';
        const desc = (job.plainTextJobDescription || '').replace(/\n/g, ' ').substring(0, 200);
        
        csv += `"${title}","${city}","${source}","${date}","${desc}"\n`;
    });

    // Download CSV
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `jobhub_jobs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    alert('✅ تم تصدير النتائج بنجاح!');
}

// Subscription Modal
function showSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('subscriptionModal');
    modal.classList.remove('active');
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('subscriptionModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default date range: last 30 days → today
    (function setDefaultDates() {
        const today    = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const fmt = d => d.toISOString().slice(0, 10);
        const df = document.getElementById('dateFromFilter');
        const dt = document.getElementById('dateToFilter');
        if (df && !df.value) df.value = fmt(monthAgo);
        if (dt && !dt.value) dt.value = fmt(today);
    })();

    restoreLastSearch_(); // restore filters from previous session (overrides defaults if saved)
    loadJobs(1);

    // Auto-search on Enter key
    document.getElementById('searchKeyword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchJobs();
        }
    });
});

// Export functions to global scope
window.searchJobs = searchJobs;
window.toggleAdvancedFilters = toggleAdvancedFilters;
window.resetFilters = resetFilters;
window.changePage = changePage;
window.applyJob = applyJob;
window.saveJob = saveJob;
window.shareJob = shareJob;
window.exportResults = exportResults;
window.showSubscriptionModal = showSubscriptionModal;
window.closeModal = closeModal;






//Added By Mohamed Abdelhamid 20251205
function convert(text) {
   // text = document.getElementById('inputText').value;

    // Normalize line endings
    text = text.replace(/\r\n/g, "\n");

    const lines = text.split("\n");
    const paragraphs = [];
    let current = "";

    for (let raw of lines) {
        let line = raw.trim();

        // Skip "hashtag" filler lines
        if (line === "hashtag" || line === "") continue;

        // Convert “#something” lines (generated after "hashtag" lines)
        if (line.startsWith("#")) {
            // hashtag line → append to current paragraph
            current += " " + line;
        } else {
            // Normal descriptive line → new paragraph
            if (current.trim() !== "") {
                paragraphs.push(current.trim());
            }
            current = line; // start new paragraph
        }
    }

    // push last paragraph
    if (current.trim() !== "") paragraphs.push(current.trim());

    // Join paragraphs with blank line
    const final = paragraphs.join("\n\n");
return final;
    //document.getElementById("outputText").value = final;
}



//Added By Mohamed Abdelhamid 20251205
function toggleDescription(jobId) {
    const card = document.querySelector(`.job-card[data-job-id="${jobId}"]`);
    if (!card) return;

    const desc = card.querySelector('.job-description');
    const btn  = card.querySelector('.toggle-description-btn');

    if (!desc || !btn) return;

    desc.classList.toggle('expanded');

    if (desc.classList.contains('expanded')) {
        btn.textContent = '⬆️ إخفاء التفاصيل';
    } else {
        btn.textContent = '👀 عرض المزيد';
    }
}

//Added By Mohamed Abdelhamid 20251205
function normalizeDescription(text) {
    text= text
        .split('\n')                        // نجزّئ النص لأسطر
        .map(line => line.trim())           // نشيل المسافات من بداية ونهاية السطر
        .filter(line => line.length > 0)    // نحذف الأسطر الفارغة
        .join('\n');                        // نرجّعها بسطر واحد بين كل سطرين

        return text+`
        
        -------------
        `
}



//Added By Mohamed Abdelhamid 20251205
function blurEmail(email) {
    if (!email || email === "غير متوفر") return email;

    // split into [localPart, domain]
    const atIndex = email.indexOf("@");
    if (atIndex === -1) return email;

    const local = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    // Create blur effect same as description blur
    const blurredLocal = "█".repeat(local.length);

    return blurredLocal + domain;
}


function extractCity(description) {
    const cities = [
        // ──────────────── Saudi Arabia ────────────────
        'الرياض','Riyadh',
        'جدة','Jeddah','Jeddah',
        'مكة','مكة المكرمة','Makkah','Mecca',
        'المدينة','المدينة المنورة','Medina','Madinah',
        'الدمام','Dammam',
        'الخبر','Khobar','Al Khobar',
        'الظهران','Dhahran',
        'الجبيل','الجبيل الصناعية','Jubail',
        'الأحساء','الهفوف','Hofuf','Al Ahsa',
        'الطائف','Taif',
        'تبوك','Tabuk',
        'أبها','Abha',
        'خميس مشيط','Khamis Mushait',
        'ينبع','Yanbu',
        'القنفذة',
        'حائل','Hail',
        'جازان','جيزان','Jazan',
        'نجران','Najran',
        'القصيم','بريدة','Buraydah',
        'الباحة','Al Bahah',
        'عرعر','Arar',
        'سكاكا','Sakaka',
        'رفحاء','Rafha',
        'القريات',
        'حفر الباطن','Hafar Al Batin',
        'رابغ','Rabigh',
        'بيشة',
        'وادي الدواسر',
        'خليص','ثول','الدوادمي','المجمعة',

        // ──────────────── Gulf Countries ────────────────
        // UAE
        'دبي','Dubai',
        'أبوظبي','Abu Dhabi',
        'الشارقة','Sharjah',
        'عجمان','Ajman',
        'رأس الخيمة','Ras Al Khaimah',
        'الفجيرة','Fujairah',
        'أم القيوين','Umm Al Quwain',
        'العين','Al Ain',

        // Qatar
        'الدوحة','Doha',
        'الخور','Al Khor',
        'الوكرة','Al Wakrah',
        'الريان','Al Rayyan',

        // Bahrain
        'المنامة','Manama',
        'المحرق','Muharraq',

        // Kuwait
        'الكويت','Kuwait City',
        'الفروانية','Farwaniya',
        'حولي','Hawalli',
        'الأحمدي','Ahmadi',
        'الجهراء','Jahra',
        'السالمية','Salmiya',

        // Oman
        'مسقط','Muscat',
        'صلالة','Salalah',
        'صحار','Sohar',
        'نزوى','Nizwa',
        'مسندم','خصب',

        // ──────────────── Egypt ────────────────
        'القاهرة','Cairo',
        'الجيزة','Giza',
        'الإسكندرية','Alexandria',
        'طنطا','Tanta',
        'المنصورة','Mansoura',
        'الزقازيق','Zagazig',
        'بنها','Banha',
        'شبين الكوم','Shebin El Kom',
        'كفر الشيخ',
        'دمنهور',
        'مرسى مطروح','Matrouh',
        'بورسعيد','Port Said',
        'دمياط','Damietta',
        'الإسماعيلية','Ismailia',
        'السويس','Suez',
        'الغردقة','Hurghada',
        'شرم الشيخ','Sharm El Sheikh',
        'الفيوم','Fayoum',
        'بني سويف','Beni Suef',
        'المنيا','Minya',
        'أسيوط','Asyut',
        'سوهاج','Sohag',
        'قنا','Qena',
        'الأقصر','Luxor',
        'أسوان','Aswan',
        'الوادي الجديد',
        'حلايب','شلاتين',

        // ──────────────── Levant & Iraq & Palestine & Israel ────────────────
        // Jordan
        'عمان','Amman',
        'الزرقاء','Zarqa',
        'إربد','Irbid',
        'العقبة','Aqaba',
        'السلط','جرش','الكرك','مادبا',

        // Lebanon
        'بيروت','Beirut',
        'طرابلس','Tripoli',
        'صيدا','Sidon',
        'صور','Tyre',
        'جونية','Jounieh',

        // Syria
        'دمشق','Damascus',
        'حلب','Aleppo',
        'حمص','Homs',
        'حماة','Hama',
        'اللاذقية','Latakia',
        'طرطوس','Tartus',
        'دير الزور','الحسكة','درعا','السويداء',

        // Iraq
        'بغداد','Baghdad',
        'البصرة','Basra',
        'الموصل','Mosul',
        'النجف','Najaf',
        'كربلاء','Karbala',
        'أربيل','Erbil',
        'السليمانية','Sulaymaniyah',
        'كركوك','Kirkuk',
        'دهوك','Duhok',
        'الناصرية','Nasiriyah',
        'العمارة','Amarah',

        // Palestine / Israel
        'القدس','Jerusalem','Al Quds',
        'غزة','Gaza',
        'رام الله','Ramallah',
        'نابلس','Nablus',
        'الخليل','Hebron',
        'جنين','طولكرم','قلقيلية','بيت لحم',
        'تل أبيب','Tel Aviv',
        'حيفا','Haifa',
        'بئر السبع','Beersheba',
        'نتانيا','أشدود','عكا','صفد',

        // Yemen
        'صنعاء','Sana\'a','Sanaa',
        'عدن','Aden',
        'تعز','Taiz',
        'الحديدة',
        'إب','المكلا','حضرموت',

        // ──────────────── North Africa ────────────────
        // Morocco
        'الدار البيضاء','Casablanca',
        'الرباط','Rabat',
        'فاس','Fez',
        'مراكش','Marrakesh',
        'طنجة','Tangier',
        'أكادير','Agadir',
        'وجدة','Oujda',

        // Algeria
        'الجزائر','Algiers',
        'وهران','Oran',
        'قسنطينة','Constantine',
        'عنابة','Annaba',
        'باتنة',

        // Tunisia
        'تونس','Tunis',
        'صفاقس','Sfax',
        'سوسة','Sousse',

        // Libya
        'طرابلس','Tripoli',
        'بنغازي','Benghazi',
        'مصراتة',

        // Sudan
        'الخرطوم','Khartoum',
        'أم درمان',
        'بحري','مدني','بورتسودان',

        // Mauritania
        'نواكشوط','Nouakchott',

        // ──────────────── Turkey & Iran & Pakistan ────────────────
        // Turkey
        'إسطنبول','اسطنبول','Istanbul',
        'أنقرة','Ankara',
        'إزمير','Izmir',
        'بورصة','Bursa',
        'أنطاليا','Antalya',
        'قونية','Konya',
        'غازي عنتاب','Gaziantep',
        'Adana','Kayseri','Mersin',

        // Iran
        'طهران','Tehran',
        'مشهد','Mashhad',
        'أصفهان','Isfahan',
        'تبريز','Tabriz',
        'شيراز','Shiraz',
        'قم','Qom',
        'أهواز','Ahvaz',
        'كرج','Karaj',

        // Pakistan
        'Karachi','كاراتشي',
        'Lahore',
        'Islamabad',
        'Rawalpindi',
        'Faisalabad',
        'Multan',
        'Peshawar',
        'Quetta',

        // ──────────────── India & South Asia ────────────────
        'New Delhi','Delhi','دلهي',
        'Mumbai','Bombay',
        'Bangalore','Bengaluru',
        'Hyderabad','حيدر أباد',
        'Chennai','Madras',
        'Kolkata','Calcutta',
        'Pune',
        'Ahmedabad',
        'Surat',
        'Jaipur',
        'Lucknow',
        'Kanpur',
        'Nagpur',
        'Indore',
        'Bhopal',
        'Patna',
        'Vadodara',
        'Visakhapatnam',
        'Goa',
        'Noida',
        'Gurgaon','Gurugram',
        'Chandigarh',
        'Coimbatore',
        'Kochi','Cochin',
        'Thiruvananthapuram',
        // Bangladesh
        'Dhaka','Dacca',
        'Chittagong',
        'Sylhet',
        // Sri Lanka
        'Colombo',
        'Kandy',

        // ──────────────── East & South East Asia ────────────────
        'Tokyo','Osaka','Kyoto','Yokohama',
        'Nagoya','Sapporo','Fukuoka',
        'Seoul','Busan','Incheon',
        'Beijing','Shanghai','Shenzhen','Guangzhou','Wuhan','Chengdu','Chongqing','Nanjing','Tianjin','Hong Kong',
        'Singapore',
        'Jakarta','Surabaya','Bandung','Bali','Yogyakarta',
        'Bangkok',
        'Kuala Lumpur','Penang','Johor Bahru',
        'Manila','Cebu','Davao',

        // ──────────────── Europe ────────────────
        'London','Manchester','Liverpool','Birmingham','Leeds','Glasgow','Edinburgh','Bristol','Cardiff',
        'Paris','Lyon','Marseille','Nice','Toulouse','Bordeaux','Lille',
        'Berlin','Munich','Frankfurt','Hamburg','Cologne','Stuttgart','Dusseldorf','Leipzig',
        'Madrid','Barcelona','Valencia','Seville','Bilbao','Malaga',
        'Rome','Milan','Turin','Naples','Florence','Venice','Bologna',
        'Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven',
        'Brussels','Antwerp',
        'Copenhagen',
        'Stockholm','Gothenburg',
        'Oslo','Bergen',
        'Helsinki',
        'Zurich','Geneva','Basel',
        'Vienna',
        'Prague',
        'Warsaw','Krakow',
        'Budapest',
        'Athens','Thessaloniki',
        'Lisbon','Porto',
        'Dublin','Cork',
        'Moscow','Saint Petersburg',
        'Kyiv',
        'Bucharest',
        'Sofia',
        'Belgrade',
        'Zagreb',
        'Ljubljana',
        'Sarajevo',
        'Skopje',
        'Tirana',
        'Reykjavik',

        // ──────────────── USA ────────────────
        'New York','NYC',
        'Los Angeles',
        'Chicago',
        'Houston',
        'Phoenix',
        'Philadelphia',
        'San Antonio',
        'San Diego',
        'Dallas',
        'San Jose',
        'Austin',
        'Jacksonville',
        'San Francisco',
        'Columbus',
        'Fort Worth',
        'Indianapolis',
        'Charlotte',
        'Seattle',
        'Denver',
        'Boston',
        'Detroit',
        'Nashville',
        'Portland',
        'Las Vegas',
        'Miami',
        'Orlando',
        'Tampa',
        'Atlanta',
        'Baltimore',
        'Sacramento',
        'Minneapolis',
        'St. Louis',
        'Pittsburgh',
        'Cleveland',
        'Kansas City',
        'Cincinnati',
        'Salt Lake City',
        'San Juan',

        // ──────────────── Canada ────────────────
        'Toronto',
        'Vancouver',
        'Montreal',
        'Calgary',
        'Ottawa',
        'Quebec',
        'Edmonton',
        'Winnipeg',
        'Halifax',

        // ──────────────── Latin America ────────────────
        'Mexico City','Ciudad de Mexico',
        'Guadalajara',
        'Monterrey',
        'Buenos Aires',
        'Sao Paulo','São Paulo',
        'Rio de Janeiro',
        'Brasilia',
        'Santiago',
        'Lima',
        'Bogota','Bogotá',
        'Caracas',
        'Quito',
        'La Paz',
        'Montevideo',
        'Asuncion',
        'Havana','La Habana',
        'Kingston',
        'Panama City',
        'San Jose','San José',
        'Guatemala City',
        'San Salvador',
        'Tegucigalpa',
        'Managua',

        // ──────────────── Sub-Saharan Africa ────────────────
        'Nairobi',
        'Lagos',
        'Abuja',
        'Accra',
        'Abidjan',
        'Dakar',
        'Kigali',
        'Addis Ababa',
        'Dar es Salaam',
        'Kampala',
        'Harare',
        'Lusaka',
        'Gaborone',
        'Windhoek',
        'Maputo',
        'Douala',
        'Yaounde',

        // ──────────────── Australia & New Zealand ────────────────
        'Sydney',
        'Melbourne',
        'Brisbane',
        'Perth',
        'Adelaide',
        'Canberra',
        'Auckland',
        'Wellington',
        'Christchurch',

        // ──────────────── Worldwide Tech / Business Hubs ────────────────
        'Silicon Valley',
        'Palo Alto',
        'San Mateo',
        'Santa Clara',
        'Dublin',
        'Luxembourg',
        'Zurich',
        'Hong Kong',
        'Shenzhen',
        'Bangalore','Bengaluru',




        // ──────────────── Manually Added bu mohamed Abdelhamid ────────────────
        'Jersey ','KSA', 'Johor Anchorage'
    ];

    const text = (description || '').toLowerCase();
    const found = cities.find(city => text.includes(city.toLowerCase()));
    return found || null;
}


// ===== Applied Jobs Tracking =====
function getAppliedJobs() {
    try { return JSON.parse(localStorage.getItem('appliedJobs') || '{}'); } catch { return {}; }
}

function markJobAsApplied(email) {
    if (!email || email === 'غير متوفر') return;
    const applied = getAppliedJobs();
    const today = new Date().toISOString().slice(0, 10);
    if (!applied[email]) applied[email] = { firstSent: today, count: 0 };
    applied[email].lastSent = today;
    applied[email].count++;
    localStorage.setItem('appliedJobs', JSON.stringify(applied));
}

function isJobApplied(email) {
    if (!email || email === 'غير متوفر') return false;
    return !!getAppliedJobs()[email];
}

// ===== Daily Sent Counter =====
function getTodaySentCount() {
    const today = new Date().toISOString().slice(0, 10);
    try {
        const data = JSON.parse(localStorage.getItem('dailySends') || '{}');
        return data[today] || 0;
    } catch { return 0; }
}

function incrementDailySent() {
    const today = new Date().toISOString().slice(0, 10);
    try {
        const data = JSON.parse(localStorage.getItem('dailySends') || '{}');
        data[today] = (data[today] || 0) + 1;
        localStorage.setItem('dailySends', JSON.stringify(data));
    } catch {}
    updateDailyCounterUI();
}

function updateDailyCounterUI() {
    const el = document.getElementById('dailySentCount');
    if (!el) return;
    const count = getTodaySentCount();
    el.textContent = count;
    const widget = document.getElementById('dailySentWidget');
    if (widget) widget.style.opacity = count > 0 ? '1' : '0.5';
}

// ===== Copy Email =====
function copyEmail(email) {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
        if (typeof showToast === 'function') showToast('تم نسخ الإيميل: ' + email, 'info');
    }).catch(() => {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = email;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        if (typeof showToast === 'function') showToast('تم نسخ الإيميل', 'info');
    });
}

// ===== Dark Mode =====
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function initDarkMode() {
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('darkModeBtn');
        if (btn) btn.textContent = '☀️';
    }
}

// Highlight emails inside text (works on escaped HTML text)
function highlightEmails(text) {
    if (!text) return '';
    // Basic email regex (good enough for job posts)
    return text.replace(
        /([A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g,
        '<span class="email-inline">$1</span>'
    );
}


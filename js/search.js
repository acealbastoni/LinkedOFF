
// API Configuration
const API_CONFIG = {
    baseURL: 'https://script.google.com/macros/s/AKfycbyin6nA9tDwOkhDtl9h4WyTvdT6nvcY91yXfQmPzbXYcvUs1ASqLCnke93vNVHN_bVNTQ/exec',
    apiKey: '447e152f-143f-4195-80fd-42b87d40af46-1764452322847'
};


// State Management
let currentPage = 1;
let totalPages = 1;
let totalJobs = 0;
let jobsData = [];
let isSubscribed = true//checkSubscription();

// Check Subscription Status
function checkSubscription() {
    // يمكن تطويره لاحقاً للتحقق من الاشتراك الفعلي
    return localStorage.getItem('subscription') === 'active';
}

// Load Jobs from API
async function loadJobs(page = 1) {
    const container = document.getElementById('jobsContainer');
    const resultsInfo = document.getElementById('resultsInfo');
    
    // Show loading
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>جاري تحميل الوظائف...</p>
        </div>
    `;

    try {
        const pageSize = isSubscribed ? 50 : 10; // المشتركون يحصلون على نتائج أكثر
        const url = `${API_CONFIG.baseURL}?key=${API_CONFIG.apiKey}&page=${page}&pageSize=${pageSize}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok) {
            jobsData = data.data;
            currentPage = data.page;
            totalPages = data.totalPages;
            totalJobs = data.totalRows;

            displayJobs(jobsData);
            updateResultsInfo();
            renderPagination();
        } else {
            throw new Error(data.message || 'فشل تحميل البيانات');
        }
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

    const shortDescription = description.substring(0, 200) + (description.length > 200 ? '...' : '');
    const realEmail = job.attachedEmails || 'غير متوفر';
    const email = blurEmail(realEmail);

    const source =  job.source || 'LinkedIn';
    const date = job.scrappedDate //? new Date(job.scrappedDate).toLocaleDateString('ar-SA') : 'غير محدد';

    // نحاول نجيب الإيميل من الـ attachedEmails أولاً، لو مش موجود ناخده من الوصف
    const extractedEmail = description.match(/[.\w-]+@([\w-]+\.)+[\w-]+/g);
    const displayedEmail = (realEmail && realEmail !== 'غير متوفر')
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

    // 🔹 تجهيز الوصف لعرضه في الـ HTML مع الهاشتاجات
    const descriptionHtml = highlightHashtags(
        highlightEmails(escapeHtml(description))
    ).replace(/\n/g, '<br>');
    
    const shortDescriptionHtml = highlightHashtags(
        highlightEmails(escapeHtml(shortDescription))
    ).replace(/\n/g, '<br>');
    
    // لو حابب في النسخة المجانية نظهر وصف مختصر
    const usedDescriptionHtml = isLocked ? shortDescriptionHtml : descriptionHtml;

    return `
    <div class="job-card ${isLocked ? 'locked' : ''}" data-job-id="${job.dkey}">
        <div class="job-header">
            <div>
                <h3 class="job-title" style="direction:ltr; text-align:left;">
                    ${isLocked ? '<span class="premium-badge">🔒 Premium</span>' : ''}
                    ${jobTitleHtml}
                </h3>

                <div class="job-meta">
                    ${city ? `<span>📍 ${city}</span>` : ''}
                    ${salary ? `<span>💰 ${salary}</span>` : ''}
                    <span>📅 ${date}</span>
                </div>
            </div>

            <span class="job-source">${source}</span>
        </div>

        <div class="job-description ${isLocked ? 'locked' : ''}"
             style="direction:${getDirection(description)}; text-align:${isArabic(description) ? 'right' : 'left'};">
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
                <button class="btn-primary" onclick="applyJob('${job.dkey}', '${realEmail}')">
                    📧 تقديم الآن
                </button>
                <button class="btn-save" onclick="saveJob('${job.dkey}')">
                    💾 حفظ الوظيفة
                </button>
                <button class="btn-outline" onclick="shareJob('${job.dkey}', '${realEmail}')">
                    📤 مشاركة
                </button>

                ${true? `
                    <button class="btn-outline toggle-description-btn"
                            onclick="toggleDescription('${job.dkey}')">
                        👀 عرض المزيد
                    </button>
                ` : ''}
            </div>
        `}
    </div>
    `;
}
// تأمين النص من أي HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
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

// Search and Filter
function searchJobs() {
    const keyword = document.getElementById('searchKeyword').value.trim().toLowerCase();
    const city = document.getElementById('cityFilter').value;
    const field = document.getElementById('fieldFilter').value;
    const salary = parseInt(document.getElementById('salaryFilter').value) || 0;
    const contract = document.getElementById('contractFilter').value;

    let filtered = jobsData;

    if (keyword) {
        filtered = filtered.filter(job => 
            (job.plainTextJobDescription || '').toLowerCase().includes(keyword) ||
            (job.source || '').toLowerCase().includes(keyword)
        );
    }

    if (city) {
        filtered = filtered.filter(job => 
            (job.plainTextJobDescription || '').includes(city)
        );
    }

    if (field) {
        filtered = filtered.filter(job => 
            (job.plainTextJobDescription || '').includes(field)
        );
    }

    if (contract) {
        filtered = filtered.filter(job => 
            (job.plainTextJobDescription || '').includes(contract)
        );
    }

    displayJobs(filtered);
    
    document.getElementById('resultsInfo').innerHTML = `
        <p>تم العثور على <strong>${filtered.length}</strong> وظيفة من أصل <strong>${jobsData.length}</strong></p>
    `;
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
    
    displayJobs(jobsData);
    updateResultsInfo();
}

// Update Results Info
function updateResultsInfo() {
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

// Save Job
function saveJob(jobId) {
    let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    
    if (savedJobs.includes(jobId)) {
        savedJobs = savedJobs.filter(id => id !== jobId);
        localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
        alert('✅ تم إلغاء حفظ الوظيفة');
    } else {
        savedJobs.push(jobId);
        localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
        alert('💾 تم حفظ الوظيفة بنجاح!');
    }
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


// Highlight emails inside text (works on escaped HTML text)
function highlightEmails(text) {
    if (!text) return '';
    // Basic email regex (good enough for job posts)
    return text.replace(
        /([A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g,
        '<span class="email-inline">$1</span>'
    );
}


// Dashboard JavaScript
// Require auth on dashboard
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user) {
        // لم يسجل الدخول
        window.location.href = 'login.html';
        return;
    }

    // لو وصلنا هنا يبقى المستخدم مسجل دخول
    loadUserStats();
    loadSubscriptionInfo();
    loadSavedJobs();
});






// Load User Statistics
function loadUserStats() {
    // في الإنتاج، هذه البيانات تأتي من الـ Backend
    const stats = {
        jobsViewed: parseInt(localStorage.getItem('jobsViewed') || '0'),
        savedJobs: JSON.parse(localStorage.getItem('savedJobs') || '[]').length,
        appliedJobs: parseInt(localStorage.getItem('appliedJobs') || '0'),
        alerts: parseInt(localStorage.getItem('alertsCount') || '1')
    };

    document.getElementById('jobsViewedCount').textContent = stats.jobsViewed;
    document.getElementById('savedJobsCount').textContent = stats.savedJobs;
    document.getElementById('appliedJobsCount').textContent = stats.appliedJobs;
    document.getElementById('alertsCount').textContent = stats.alerts;
}

// Load Subscription Information
function loadSubscriptionInfo() {
    // في الإنتاج، هذه البيانات تأتي من الـ Backend
    const subscription = {
        plan: localStorage.getItem('subscriptionPlan') || 'غير مفعل',
        startDate: localStorage.getItem('subscriptionStart') || '-',
        renewalDate: localStorage.getItem('subscriptionRenewal') || '-',
        status: localStorage.getItem('subscriptionStatus') || 'غير نشط'
    };

    document.getElementById('currentPlan').textContent = subscription.plan;
    document.getElementById('planName').textContent = subscription.plan;
    document.getElementById('subscriptionDate').textContent = subscription.startDate;
    document.getElementById('renewalDate').textContent = subscription.renewalDate;
    
    const statusElement = document.getElementById('subscriptionStatus');
    statusElement.textContent = subscription.status;
    statusElement.className = subscription.status === 'نشط' ? 'status-active' : 'status-inactive';
}

// Load Saved Jobs
function loadSavedJobs() {
    const savedJobIds = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    const container = document.getElementById('savedJobsList');

    if (savedJobIds.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد وظائف محفوظة حالياً</p>';
        return;
    }

    // في الإنتاج، نجلب تفاصيل الوظائف من الـ API
    container.innerHTML = savedJobIds.map((jobId, index) => `
        <div class="job-item">
            <h4>وظيفة محفوظة #${index + 1}</h4>
            <div class="job-item-meta">
                <span>📍 المدينة</span>
                <span>📅 تاريخ الحفظ: ${new Date().toLocaleDateString('ar-SA')}</span>
            </div>
            <div class="job-item-actions">
                <button class="btn-primary btn-sm" onclick="viewJob('${jobId}')">عرض التفاصيل</button>
                <button class="btn-outline btn-sm" onclick="unsaveJob('${jobId}')">إزالة</button>
            </div>
        </div>
    `).join('');
}

// View Job Details
function viewJob(jobId) {
    window.location.href = `search.html?job=${jobId}`;
}

// Unsave Job
function unsaveJob(jobId) {
    if (!confirm('هل أنت متأكد من إزالة هذه الوظيفة؟')) return;

    let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
    savedJobs = savedJobs.filter(id => id !== jobId);
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));

    loadSavedJobs();
    loadUserStats();
    showNotification('✅ تم إزالة الوظيفة من المحفوظات', 'success');
}

// Create Alert
function createAlert() {
    const modal = document.getElementById('createAlertModal');
    modal.classList.add('active');
}

// Close Alert Modal
function closeAlertModal() {
    const modal = document.getElementById('createAlertModal');
    modal.classList.remove('active');
}

// Save Alert
function saveAlert(event) {
    event.preventDefault();

    const keywords = document.getElementById('alertKeywords').value;
    const city = document.getElementById('alertCity').value;

    // في الإنتاج، نرسل البيانات للـ Backend
    const alert = {
        id: Date.now(),
        keywords,
        city,
        createdAt: new Date().toISOString()
    };

    // حفظ مؤقت في localStorage
    let alerts = JSON.parse(localStorage.getItem('jobAlerts') || '[]');
    alerts.push(alert);
    localStorage.setItem('jobAlerts', JSON.stringify(alerts));

    showNotification('✅ تم إنشاء التنبيه بنجاح!', 'success');
    closeAlertModal();

    // Update alerts count
    const alertsCount = parseInt(localStorage.getItem('alertsCount') || '1');
    localStorage.setItem('alertsCount', (alertsCount + 1).toString());
    loadUserStats();
}

// Edit Alert
function editAlert(alertId) {
    showNotification('⚙️ قريباً: سيتم إضافة ميزة تعديل التنبيهات', 'info');
}

// Delete Alert
function deleteAlert(alertId) {
    if (!confirm('هل أنت متأكد من حذف هذا التنبيه؟')) return;

    showNotification('✅ تم حذف التنبيه بنجاح', 'success');

    // Update count
    const alertsCount = Math.max(0, parseInt(localStorage.getItem('alertsCount') || '1') - 1);
    localStorage.setItem('alertsCount', alertsCount.toString());
    loadUserStats();
}

// Upgrade Subscription
function upgradeSubscription() {
    window.location.href = 'index.html#pricing';
}

// Logout
// function logout() {
//     if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
//         // يمكن إضافة logout logic هنا
//         showNotification('👋 تم تسجيل الخروج بنجاح', 'success');
//         setTimeout(() => {
//             window.location.href = 'index.html';
//         }, 1500);
//     }
// }
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        performLogout(); // من auth.js
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#00A859' : type === 'info' ? '#0066CC' : '#FF6B00'};
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 700;
        animation: slideInRight 0.5s;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('createAlertModal');
    if (event.target === modal) {
        closeAlertModal();
    }
};

// Export functions to global scope
window.loadSavedJobs = loadSavedJobs;
window.viewJob = viewJob;
window.unsaveJob = unsaveJob;
window.createAlert = createAlert;
window.closeAlertModal = closeAlertModal;
window.saveAlert = saveAlert;
window.editAlert = editAlert;
window.deleteAlert = deleteAlert;
window.upgradeSubscription = upgradeSubscription;
window.logout = logout;

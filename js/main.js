// Configuration
const WHATSAPP_NUMBER = '966566114725';
const STC_PAY_NUMBER = '0566114725';

// Payment Plans
const PLANS = {
    basic: {
        name: 'Basic',
        price: 99,
        features: ['50 وظيفة يومياً', 'بحث وفلترة متقدمة', 'حفظ حتى 20 وظيفة']
    },
    pro: {
        name: 'Pro',
        price: 199,
        features: ['200 وظيفة يومياً', 'تنبيهات WhatsApp فورية', 'حفظ غير محدود']
    },
    premium: {
        name: 'Premium',
        price: 399,
        features: ['وظائف غير محدودة', 'AI Resume Builder', 'دعم VIP']
    }
};

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Payment Initiation
function initiatePayment(planType) {
    const plan = PLANS[planType];
    
    if (!plan) {
        alert('خطأ في اختيار الباقة');
        return;
    }

    const message = `
🎉 مرحباً! أرغب في الاشتراك في باقة ${plan.name}

📦 تفاصيل الباقة:
• السعر: ${plan.price} ريال/شهر
• المميزات:
${plan.features.map(f => `  ✅ ${f}`).join('\n')}

💳 طريقة الدفع المفضلة:
[ ] STC Pay - ${STC_PAY_NUMBER}
[ ] تحويل بنكي

الرجاء تأكيد الاشتراك وإرسال تفاصيل الدفع.
    `.trim();

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    // Track conversion (يمكن إضافة Google Analytics هنا)
    console.log('Payment initiated:', planType);
    
    // Open WhatsApp
    window.open(whatsappURL, '_blank');
    
    // Show confirmation
    showNotification('✅ سيتم فتح WhatsApp للتواصل معنا وإتمام الاشتراك', 'success');
}

// Notification System
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${type === 'success' ? '#00A859' : '#0066CC'};
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
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Add animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Track scroll for animations
window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
    
    elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 100;
        
        if (isVisible && !el.classList.contains('animated')) {
            el.classList.add('animated');
            el.style.animation = 'fadeIn 0.6s ease-out';
        }
    });
});

// Track page views (يمكن إضافة Google Analytics)
window.addEventListener('load', () => {
    console.log('Page loaded:', window.location.pathname);
    
    // Show welcome message on first visit
    if (!localStorage.getItem('visited')) {
        setTimeout(() => {
            showNotification('🎉 مرحباً بك في LinkedOFF 𝓐𝓬𝓮𝓐𝓵𝓑𝓪𝓼𝓽𝓸𝓷𝓲! اكتشف أكثر من مليون وظيفة', 'success');
            localStorage.setItem('visited', 'true');
        }, 2000);
    }
});

// Mobile menu toggle (if needed)
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Contact form (if added later)
function handleContactForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const message = `
📧 رسالة جديدة من موقع LinkedOFF 𝓐𝓬𝓮𝓐𝓵𝓑𝓪𝓼𝓽𝓸𝓷𝓲

👤 الاسم: ${formData.get('name')}
📱 الجوال: ${formData.get('phone')}
✉️ الإيميل: ${formData.get('email')}

📝 الرسالة:
${formData.get('message')}
    `.trim();
    
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, '_blank');
}

// Export functions to global scope
window.initiatePayment = initiatePayment;
window.showNotification = showNotification;
window.toggleMobileMenu = toggleMobileMenu;
window.handleContactForm = handleContactForm;

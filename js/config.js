/**
 * JobHub KSA - Configuration
 * Version Management System
 * 
 * This file contains the version info displayed across the website
 */

const APP_CONFIG = {
    // Version Info
    version: '1.3.5',
    releaseDate: '2026-02-23',
    buildNumber: '20260223',
    
    // App Info
    appName: 'LinkedOFF KSA',
    appNameShort: 'LinkedOFF',
    developer: 'AceAlBastoni',
    
    // Display Settings
    showVersionBadge: true,  // Show version badge in navbar
    showBuildNumber: true ,   // Show build number in footer
    
    // Format: "v1.2.0 - 25 ديسمبر 2024"
    getVersionString: function() {
        const dateObj = new Date(this.releaseDate);
        const months = [
            'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        const day = dateObj.getDate();
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        return `v${this.version} - ${day} ${month} ${year}`;
    },
    
    // Format: "v1.2.0"
    getVersionShort: function() {
        return `V ${this.version}` ;
    },
    
    // Format: "الإصدار 1.2.0"
    getVersionArabic: function() {
        return `الإصدار ${this.version}`;
    },
    
    // Get footer text
    getFooterText: function() {
        const year = new Date().getFullYear();
        let text = `© ${year} ${this.appName} by ${this.developer}. جميع الحقوق محفوظة.`;
        
        if (this.showBuildNumber) {
            text += ` | Build ${this.buildNumber}`;
        }
        
        return text;
    }
};

// Initialize version display on page load
document.addEventListener('DOMContentLoaded', () => {

    // ── Version Badge: always inject as direct child of <body> ──────────
    // Removes any misplaced badge (inside scroll containers) and re-injects
    // it at body level so position:fixed works correctly on ALL pages.
    if (APP_CONFIG.showVersionBadge) {
        // Remove every existing badge (there may be hardcoded ones inside containers)
        document.querySelectorAll('#versionBadge, .version-badge').forEach(el => el.remove());

        const badge = document.createElement('div');
        badge.id        = 'versionBadge';
        badge.className = 'version-badge';
        badge.textContent = APP_CONFIG.getVersionShort();
        // Inline styles guarantee correct behaviour even if styles.css isn't loaded
        badge.style.cssText = [
            'position:fixed',
            'bottom:20px',
            'left:20px',
            'background:linear-gradient(135deg,#0A66C2,#004182)',
            'color:#fff',
            'padding:8px 16px',
            'border-radius:20px',
            'font-size:13px',
            'font-weight:700',
            'z-index:9990',
            'box-shadow:0 4px 12px rgba(10,102,194,.3)',
            'cursor:pointer',
            'font-family:Cairo,sans-serif',
            'direction:ltr',
            'text-align:center',
            'transition:transform .3s,box-shadow .3s',
            'user-select:none',
        ].join(';');
        badge.addEventListener('mouseenter', () => {
            badge.style.transform   = 'translateY(-4px)';
            badge.style.boxShadow   = '0 6px 20px rgba(10,102,194,.45)';
            badge.style.background  = 'linear-gradient(135deg,#004182,#0A66C2)';
        });
        badge.addEventListener('mouseleave', () => {
            badge.style.transform   = '';
            badge.style.boxShadow   = '0 4px 12px rgba(10,102,194,.3)';
            badge.style.background  = 'linear-gradient(135deg,#0A66C2,#004182)';
        });
        document.body.appendChild(badge);
    }
    // ────────────────────────────────────────────────────────────────────

    // Update version in navbar if exists
    const navVersion = document.getElementById('navVersion');
    if (navVersion) {
        navVersion.textContent = APP_CONFIG.getVersionShort();
    }

    // Update footer if exists
    const footerVersion = document.getElementById('footerVersion');
    if (footerVersion) {
        footerVersion.textContent = APP_CONFIG.getVersionString();
    }

    // Update copyright year
    const copyrightText = document.getElementById('copyrightText');
    if (copyrightText) {
        copyrightText.textContent = APP_CONFIG.getFooterText();
    }

    // Console log
    console.log(`${APP_CONFIG.appName} ${APP_CONFIG.getVersionString()}`);
});

// Export for use in other scripts
window.APP_CONFIG = APP_CONFIG;

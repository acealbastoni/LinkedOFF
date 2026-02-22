/**
 * JobHub KSA - Configuration
 * Version Management System
 * 
 * This file contains the version info displayed across the website
 */

const APP_CONFIG = {
    // Version Info
    version: '1.3.0',
    releaseDate: '2026-02-22',
    buildNumber: '20260222',
    
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
    // Update version badge if exists
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) {
        versionBadge.textContent = APP_CONFIG.getVersionShort();
    }
    
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

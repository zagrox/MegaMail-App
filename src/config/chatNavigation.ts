
export interface NavigationKeyword {
    keywords: string[];
    view: string;
    buttonTextKey: string; // For i18n
    data?: any;
}

export const navigationKeywords: NavigationKeyword[] = [
    { 
        keywords: ['buy credits', 'purchase credits', 'add credits', 'balance', 'خرید اعتبار', 'شارژ اعتبار', 'افزودن اعتبار', 'موجودی'], 
        view: 'Buy Credits', 
        buttonTextKey: 'goToBuyCredits' 
    },
    { 
        keywords: ['dashboard', 'home page', 'overview', 'داشبورد', 'صفحه اصلی', 'نمای کلی'], 
        view: 'Dashboard', 
        buttonTextKey: 'goToDashboard' 
    },
    { 
        keywords: ['contacts', 'subscribers', 'audience', 'my contacts', 'مخاطبین', 'مشترکین', 'مخاطبان'], 
        view: 'Contacts', 
        buttonTextKey: 'goToContacts' 
    },
    { 
        keywords: ['campaigns', 'my campaigns', 'sent emails', 'کمپین‌ها', 'کمپین های من', 'ایمیل‌های ارسال شده'], 
        view: 'Campaigns', 
        buttonTextKey: 'goToCampaigns' 
    },
    { 
        keywords: ['templates', 'my templates', 'email designs', 'قالب‌ها', 'قالب های من', 'طراحی ایمیل'], 
        view: 'Templates', 
        buttonTextKey: 'goToTemplates' 
    },
    { 
        keywords: ['domain', 'domains', 'verify domain', 'sending domain', 'دامنه', 'دامنه‌ها', 'تأیید دامنه', 'دامنه ارسال'], 
        view: 'Settings', 
        buttonTextKey: 'goToDomainSettings', 
        data: { tab: 'domains' } 
    },
    { 
        keywords: ['api key', 'api access', 'my api key', 'کلید api', 'دسترسی api'], 
        view: 'Settings', 
        buttonTextKey: 'goToApiSettings', 
        data: { tab: 'api' } 
    },
    { 
        keywords: ['smtp settings', 'credentials', 'تنظیمات smtp', 'اطلاعات smtp'], 
        view: 'Settings', 
        buttonTextKey: 'goToSmtpSettings', 
        data: { tab: 'smtp' } 
    },
    { 
        keywords: ['profile', 'my profile', 'personal info', 'پروفایل', 'پروفایل من', 'اطلاعات شخصی'], 
        view: 'Account', 
        buttonTextKey: 'goToProfile', 
        data: { tab: 'profile' } 
    },
    { 
        keywords: ['orders', 'purchase history', 'billing', 'سفارش‌ها', 'تاریخچه خرید', 'صورتحساب'], 
        view: 'Account', 
        buttonTextKey: 'goToOrders', 
        data: { tab: 'orders' } 
    },
    // External Links - Triggers based on URLs found in the text
    { 
        keywords: ['t.me/megamailrobot', 'telegram.me/megamailrobot', '#contact_human'], 
        view: 'External', 
        buttonTextKey: 'chatWithHuman', 
        data: { url: 'https://t.me/megamailrobot' } 
    },
];

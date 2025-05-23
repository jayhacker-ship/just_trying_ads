// Main script.js for Watch Ads Earn Money website

// ===== GLOBAL VARIABLES =====
// Random Users with Referral Codes (MUST be at top)
const randomUsers = [
    { name: "User_Alpha", referralCode: "FT45KL9P", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=ruby" },
    { name: "User_Beta", referralCode: "MN67QR8S", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=sapphire" },
    { name: "User_Gamma", referralCode: "AB12CD3E", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=emerald" },
    { name: "User_Delta", referralCode: "XY34ZW5V", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=opal" },
    { name: "User_Epsilon", referralCode: "GH78IJ9K", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=amber" },
    { name: "User_Zeta", referralCode: "OP90QR1S", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=topaz" },
    { name: "User_Eta", referralCode: "TU23VW4X", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=amethyst" },
    { name: "User_Theta", referralCode: "YZ56AB7C", avatar: "https://api.dicebear.com/6.x/shapes/svg?seed=pearl" }
];

// Storage Access Check (add before init)
function checkStorageAccess() {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.error('Storage access blocked:', e);
        showNotification('Please enable storage access in your browser settings', 'error');
        return false;
    }
}

// Global variables
let currentUser = null;
let allUsers = [];

// Load initial users
function loadInitialUsers() {
    // Check if we have any existing users
    const storedUsers = localStorage.getItem('allUsers');
    if (storedUsers) {
        try {
            allUsers = JSON.parse(storedUsers);
        } catch (e) {
            console.error('Error parsing stored users', e);
            allUsers = [];
        }
    }
    
    // If no users, add a default test account
    if (allUsers.length === 0) {
        // Add admin account
        const adminUser = {
            name: 'Admin',
            mobile: 'admin',
            email: 'admin@example.com',
            password: 'admin123',
            isAdmin: true,
            joinDate: new Date().toISOString()
        };
        
        // Add test user account
        const testUser = {
            name: 'Test User',
            mobile: '9876543210',
            email: 'test@example.com',
            password: '123456',
            balance: 1000,
            points: 5000,
            referralCode: generateReferralCode(),
            referredBy: '',
            adsWatched: 15,
            totalAdsWatched: 15,
            adsWatchedToday: 3,
            lastAdWatched: null,
            joinDate: new Date().toISOString(),
            streak: 5,
            badge: 'silver',
            avatar: 'https://api.dicebear.com/6.x/shapes/svg?seed=ruby',
            wallet: {
                pending: 200,
                approved: 800,
                withdrawn: 500
            },
            withdrawals: [
                {
                    id: 'w1',
                    amount: 200,
                    method: 'upi',
                    status: 'Approved',
                    date: new Date().toLocaleDateString()
                }
            ],
            notifications: []
        };
        
        allUsers.push(adminUser);
        allUsers.push(testUser);
        localStorage.setItem('allUsers', JSON.stringify(allUsers));
    }
}

// User Data
let user = {
    name: 'Guest',
    points: 0,
    adsWatchedToday: 0,
    totalAdsWatched: 0,
    streak: 0,
    referralCode: generateReferralCode(),
    lastAdTime: null,
    withdrawals: [],
    avatar: 'https://api.dicebear.com/6.x/shapes/svg?seed=diamond',
    lastGiftDate: null,
    appliedReferrals: []
};

// Site Settings (defaults)
let siteSettings = {
    POINTS_PER_RS: 500,
    MAX_ADS_PER_DAY: 100,
    COOLDOWN_TIME: 15,
    MIN_WITHDRAWAL: 100,
    REFERRAL_BONUS: 100
};

// Constants
const BONUS_AFTER_SPINS = 20;
const BONUS_POINTS = 50;

// Badge Tier System
const badgeTiers = {
    1000: { name: "Bronze", color: "#cd7f32", icon: "🥉" },
    5000: { name: "Silver", color: "#c0c0c0", icon: "🥈" },
    10000: { name: "Gold", color: "#ffd700", icon: "🥇" }
};

// DOM Elements
const contentDiv = document.getElementById('content');

// Currency conversion rates (1 INR to other currencies)
const currencyRates = {
    INR: 1,       // Indian Rupee (base)
    USD: 0.012,   // US Dollar
    EUR: 0.011,   // Euro
    GBP: 0.0095,  // British Pound
    AUD: 0.018,   // Australian Dollar
    CAD: 0.016,   // Canadian Dollar
    SGD: 0.016,   // Singapore Dollar
    JPY: 1.77,    // Japanese Yen
    AED: 0.044    // UAE Dirham
};

// Currency symbols
const currencySymbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    JPY: '¥',
    AED: 'د.إ'
};

// Default currency
let selectedCurrency = 'INR';

// Function to convert points to selected currency
function convertPointsToCurrency(points, currency = selectedCurrency) {
    // First convert points to INR
    const inrValue = points / siteSettings.POINTS_PER_RS;
    
    // Then convert INR to selected currency
    const convertedValue = inrValue * currencyRates[currency];
    
    // Return formatted value with correct symbol
    return {
        value: convertedValue.toFixed(2),
        symbol: currencySymbols[currency],
        formatted: `${currencySymbols[currency]}${convertedValue.toFixed(2)}`
    };
}

// Function to change the selected currency
function changeCurrency(currency) {
    if (currencyRates[currency]) {
        selectedCurrency = currency;
        
        // Update all displayed currency values
        updateCurrencyDisplay();
        
        // Save currency preference
        localStorage.setItem('preferredCurrency', currency);
        
        showNotification('Currency Changed', `Currency changed to ${currency}`, 'success');
    }
}

// Function to update all currency displays
function updateCurrencyDisplay() {
    // Update points display on home screen
    const pointsDisplay = document.querySelector('.points-value');
    if (pointsDisplay) {
        const converted = convertPointsToCurrency(user.points);
        pointsDisplay.innerHTML = `${user.points} <span class="currency-value">(${converted.formatted})</span>`;
    }
    
    // Update currency selector if it exists
    const currencySelector = document.getElementById('currencySelector');
    if (currencySelector) {
        currencySelector.value = selectedCurrency;
    }
    
    // Update withdrawal amounts if on withdrawal page
    const withdrawalAmounts = document.querySelectorAll('.withdrawal-amount');
    if (withdrawalAmounts.length > 0) {
        withdrawalAmounts.forEach(el => {
            const points = parseInt(el.dataset.points || 0);
            if (points) {
                const converted = convertPointsToCurrency(points);
                el.textContent = converted.formatted;
            }
        });
    }
}

// Function to add currency selector to profile page
function addCurrencySelector() {
    return `
        <div class="currency-preference">
            <label for="currencySelector">Preferred Currency:</label>
            <select id="currencySelector" class="currency-selector">
                ${Object.keys(currencyRates).map(currency => 
                    `<option value="${currency}" ${currency === selectedCurrency ? 'selected' : ''}>
                        ${currency} (${currencySymbols[currency]})
                    </option>`
                ).join('')}
            </select>
        </div>
    `;
}

// Load preferred currency on init
function loadPreferredCurrency() {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && currencyRates[savedCurrency]) {
        selectedCurrency = savedCurrency;
    }
}

// Initialize the app
function init() {
    console.log("Initializing app...");
    
    // Check if storage is accessible
    if (!checkStorageAccess()) {
        showNotification('Storage access is required for this app to function', 'error');
        document.getElementById('content').innerHTML = '<div class="error-message">Storage access is required for this app to function. Please enable cookies and storage in your browser settings.</div>';
        return;
    }
    
    // Add storage event listener to detect changes made by admin panel
    window.addEventListener('storage', function(event) {
        console.log('Storage event detected:', event.key);
        if (event.key === 'appUsers') {
            console.log('appUsers changed, syncing data...');
            syncWithAppUsers();
            
            // Update UI
            if (typeof updatePointsDisplay === 'function') {
                updatePointsDisplay();
            }
            
            // Reload current section if needed
            const currentSection = localStorage.getItem('currentSection') || 'home';
            if (typeof navigateTo === 'function' && window[`load${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}`]) {
                navigateTo(window[`load${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}`]);
            }
        }
    });
    
    // Check if localStorage is accessible
    if (!checkStorageAccess()) {
        showNotification('Storage Error', 'Cannot access localStorage. Please check your browser settings.', 'error');
        return;
    }
    
    console.log("Initializing app and checking for saved user session...");
    
    // Load initial users if none exist
    loadInitialUsers();
    
    // Load site settings
    loadSiteSettings();
    
    // Load preferred currency
    loadPreferredCurrency();
    
    // Detect device type (mobile or desktop)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    document.body.classList.add(isMobile ? 'mobile-device' : 'desktop-device');
    
    // Setup device specific UI
    setupDeviceSpecificUI(isMobile);
    
    // Ensure the auth overlay is initialized
    initAuthOverlay();
    
    // IMPORTANT: Check if user is logged in
    let currentUserData;
    try {
        currentUserData = localStorage.getItem('currentUser');
        console.log("Found currentUser data:", currentUserData ? "Yes" : "No");
    } catch (error) {
        console.error("Error reading currentUser from localStorage:", error);
        currentUserData = null;
    }
    
    if (currentUserData) {
        // User session found, load the user data
        try {
            // Load user data directly from 'currentUser' storage
            const parsedUser = JSON.parse(currentUserData);
            console.log("Successfully parsed currentUser data", parsedUser.userId);
            
            // Set the user object with the loaded data
            user = parsedUser;
            
            // Make sure critical properties are initialized
            if (!user.userId) user.userId = generateUniqueId();
            if (!user.name) user.name = 'User';
            if (typeof user.points !== 'number') user.points = 0;
            if (typeof user.adsWatchedToday !== 'number') user.adsWatchedToday = 0;
            if (typeof user.totalAdsWatched !== 'number') user.totalAdsWatched = 0;
            if (!user.streak) user.streak = 0;
            if (!user.avatar) user.avatar = 'https://api.dicebear.com/6.x/identicon/svg?seed=default';
            if (!user.referralCode) user.referralCode = generateReferralCode();
            if (!Array.isArray(user.appliedReferrals)) user.appliedReferrals = [];
            if (!Array.isArray(user.withdrawals)) user.withdrawals = [];
            
            // User is logged in, hide auth overlay
            const authOverlay = document.querySelector('.auth-overlay');
            if (authOverlay) {
                authOverlay.style.display = 'none';
                authOverlay.classList.remove('show');
                console.log("Auth overlay hidden - user session restored");
            }
            
            // Load home section
            loadHome();
            
            // Update streak if needed
            updateStreak();
            
            // Show banner ad
            if (typeof showBannerAd === 'function') {
                showBannerAd();
            }
            
            // Setup logout functionality
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    logout();
                });
            }
            
        } catch (error) {
            console.error('Error restoring user session:', error);
            showNotification('Session Error', 'Error loading your session. Please try logging in again.', 'error');
            resetUserData();
            showAuthOverlay();
        }
    } else {
        // User is not logged in, show auth overlay
        console.log("No user session found, showing login screen");
        resetUserData();
        showAuthOverlay();
    }
    
    setupAdButtons();
}

// Set up device-specific UI elements
function setupDeviceSpecificUI(isMobile) {
    // Set CSS variables for device-specific styling
    document.documentElement.style.setProperty('--nav-button-size', isMobile ? '48px' : '56px');
    document.documentElement.style.setProperty('--content-max-width', isMobile ? '100%' : '1000px');
    document.documentElement.style.setProperty('--content-padding', isMobile ? '12px' : '24px');
    
    // Make buttons more tappable on mobile
    if (isMobile) {
        const allButtons = document.querySelectorAll('button, .btn, .tab-btn');
        allButtons.forEach(button => {
            button.style.minHeight = '44px';
        });
    }
    
    // Update navigation button layout based on device
    updateNavButtonLayout(isMobile);
}

// Update navigation button layout
function updateNavButtonLayout(isMobile) {
    const navButtons = document.querySelectorAll('.footer-nav-btn');
    navButtons.forEach(button => {
        // Clear existing classes
        button.classList.remove('nav-desktop', 'nav-mobile');
        
        if (isMobile) {
            button.classList.add('nav-mobile');
            // On mobile, show only icons
            const textSpan = button.querySelector('.nav-text');
            if (textSpan) {
                textSpan.style.display = 'none';
            }
        } else {
            button.classList.add('nav-desktop');
            // On desktop, show icons and text
            const textSpan = button.querySelector('.nav-text');
            if (textSpan) {
                textSpan.style.display = 'inline';
            }
        }
    });
}

// Load Site Settings
function loadSiteSettings() {
    const savedSettings = localStorage.getItem('siteSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            siteSettings = { ...siteSettings, ...parsedSettings };
            console.log('Site settings loaded:', siteSettings);
        } catch (e) {
            console.error('Error parsing site settings:', e);
        }
    }
}

// Load Home Section
function loadHome() {
    updateActiveButton('home');
    
    const pointsValue = convertPointsToCurrency(user.points);
    const adsWatchedToday = user.adsWatchedToday || 0;
    const adsRemaining = siteSettings.MAX_ADS_PER_DAY - adsWatchedToday;
    const adLimitReached = adsRemaining <= 0;
    
    contentDiv.innerHTML = `
        <div class="card home-card">
            <h2 class="section-title animated-gradient-text">Dashboard</h2>
            
            <div class="points-display">
                <div>
                    <i class="fas fa-coins"></i> 
                    <span class="points-value">${user.points.toLocaleString()}</span> Points
                </div>
                <div class="currency-value">≈ ${pointsValue.formatted}</div>
            </div>
            
            <div class="home-stats">
                <div class="stat-row">
                    <div class="home-stat">
                        <i class="fas fa-user-clock"></i>
                        <div class="stat-info">
                            <span class="stat-value">${user.streak || 0}</span>
                            <span class="stat-label">Day Streak</span>
                        </div>
                    </div>
                    <div class="home-stat">
                        <i class="fas fa-tv"></i>
                        <div class="stat-info">
                            <span class="stat-value">${adsWatchedToday}/${siteSettings.MAX_ADS_PER_DAY}</span>
                            <span class="stat-label">Today's Ads (${adsRemaining} left)</span>
                        </div>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="home-stat">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <span class="stat-value">${user.appliedReferrals ? user.appliedReferrals.length : 0}</span>
                            <span class="stat-label">Applied Referrals</span>
                        </div>
                    </div>
                    <div class="home-stat">
                        <i class="fas fa-money-bill-transfer"></i>
                        <div class="stat-info">
                            <span class="stat-value">${(user.withdrawals ? user.withdrawals.length : 0)}</span>
                            <span class="stat-label">Withdrawals</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="ad-section">
                <h3 class="subsection-title">Watch & Earn</h3>
                <p class="ad-description">Watch a short ad and earn points instantly!</p>
                <div id="cooldownTimer" class="cooldown-timer" ${adLimitReached ? 'style="display: none;"' : ''}></div>
                <button id="watchAdBtn" class="watch-ad-btn" ${adLimitReached ? 'disabled' : ''}>
                    ${adLimitReached ? 'Daily Limit Reached' : '<i class="fas fa-play-circle"></i> Watch Ad Now'}
            </button>
                ${adLimitReached ? '<p class="limit-message">You have watched all ads for today. Come back tomorrow!</p>' : ''}
            </div>
            
            <div class="user-summary">
                <div class="avatar-section">
                    <div class="avatar-container" onclick="changeAvatar()">
                        <img src="${user.avatar}" alt="User Avatar">
                        <div class="avatar-overlay">
                            <span>Change</span>
            </div>
                    </div>
                    <h3>${user.name || 'Guest User'}</h3>
                    <div class="user-code">Code: ${user.referralCode}</div>
                </div>
            
                <div class="badge-display">
                    <h4>Your Status</h4>
                ${renderBadges()}
                </div>
            </div>
            
            <div class="quick-actions">
                <button class="action-btn" onclick="loadReferral()">
                    <i class="fas fa-share-alt"></i> Refer & Earn
                    </button>
                <button class="action-btn" onclick="loadWithdrawal()">
                    <i class="fas fa-wallet"></i> Withdraw
                </button>
            </div>
        </div>
    `;
    
    // Update cooldown timer only if limit not reached
    if (!adLimitReached) {
    updateCooldownTimer();
    }
    
    // Add event listener to the watch ad button if it's not disabled
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn && !adLimitReached) {
        watchAdBtn.addEventListener('click', watchAd);
    }
    
    // Make sure currency selector is up to date
    addCurrencySelector();
    
    // Update gift button status
    updateGiftButton();
}

// Load Profile Section
function loadProfile() {
    updateActiveButton('Profile');
    contentDiv.innerHTML = `
        <div class="card profile-card">
            <h2 class="profile-title">Your Profile</h2>
            
            <div class="profile-header">
                <div class="avatar-container" onclick="changeAvatar()">
                    <img id="user-avatar" src="${user.avatar}" alt="User Avatar" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="avatar-overlay">
                        <span>Change Avatar</span>
                    </div>
                </div>
            </div>
            
            <div class="input-group">
                <label class="glow-text">Your Name</label>
                <input type="text" id="username" value="${user.name}" placeholder="Enter your name" class="fancy-input">
            </div>
            
            ${addCurrencySelector()}
            
            <div class="stats-container">
                <h3 class="stats-title">Your Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-icon">💰</div>
                        <div class="stat-value">${user.points}</div>
                        <div class="stat-label">Total Points</div>
                        <div class="stat-currency">${convertPointsToCurrency(user.points).formatted}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">🔥</div>
                        <div class="stat-value">${user.streak}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon">📺</div>
                        <div class="stat-value">${user.totalAdsWatched}</div>
                        <div class="stat-label">Ads Watched</div>
                    </div>
                    <div class="stat-item" onclick="copyReferralCode('${user.referralCode}')">
                        <div class="stat-icon">🔗</div>
                        <div class="stat-value">${user.referralCode}</div>
                        <div class="stat-label">Your Referral Code (Tap to Copy)</div>
                    </div>
                </div>
            </div>
            
            <div class="badges-container">
                ${renderBadges()}
            </div>
            
            <button class="save-profile-btn primary-btn" onclick="saveProfile()">
                <span>Save Profile</span>
            </button>
            
            <button id="profileLogoutBtn" class="logout-btn secondary-btn" style="margin-top: 15px; color: var(--accent-color);">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </button>
        </div>
    `;
    
    // Add event listener to the profile logout button
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', function() {
            showConfirmDialog('Logout', 'Are you sure you want to logout?', logout);
        });
    }
    
    // Add event listener to currency selector
    const currencySelector = document.getElementById('currencySelector');
    if (currencySelector) {
        currencySelector.addEventListener('change', function() {
            changeCurrency(this.value);
        });
    }
}

// Load Referral Section
function loadReferral() {
    updateActiveButton('referral');
    
    contentDiv.innerHTML = `
        <div class="card referral-card">
            <h2 class="section-title animated-gradient-text">Referral Program</h2>
            
            <div class="referral-info">
                <div class="referral-code-display">
                    <h3 class="subsection-title">Your Referral Code</h3>
                    <div class="code-box gradient-animated">
                        ${user.referralCode}
                        <button onclick="copyReferralCode('${user.referralCode}')" class="copy-btn">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <p class="referral-hint">Share your code with friends to earn points when they use it!</p>
                </div>
            </div>
            
            <div class="referral-input-container">
                <h3 class="subsection-title">Apply a Referral Code</h3>
                <div class="referral-input-group">
                    <input type="text" id="referralCode" placeholder="Enter referral code" class="fancy-input">
                    <button onclick="applyReferralCode()" class="apply-code-btn button-hover-effect">
                        <i class="fas fa-check"></i> Apply
                    </button>
                </div>
            </div>
            
            <div class="suggested-section">
                <h3 class="subsection-title">Suggested Codes <span class="bonus-tag">20 points</span></h3>
                <p class="suggestion-description">Try these suggested codes to receive 20 points each!</p>
                
                <div class="referral-suggestions">
                    ${getRandomUsers(4).map((u, index) => `
                    <div class="suggestion-item animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
                        <div class="suggestion-icon float-animation" style="animation-delay: ${index * 0.5}s">
                            <img src="${u.avatar}" alt="${u.name}">
                            </div>
                        <div class="suggestion-details">
                            <div class="suggestion-name">${u.name}</div>
                            <div class="suggestion-code">${u.referralCode}</div>
                            </div>
                        <button onclick="fillReferralCode('${u.referralCode}')" class="fill-code-btn">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="user-codes-section">
                <h3 class="subsection-title">Friend Codes <span class="bonus-tag highlight-pulse">50 points</span></h3>
                <p class="suggestion-description">Apply another user's referral code to earn 50 points!</p>
            </div>
            
            <div class="applied-section">
                <h3 class="subsection-title">Applied Referrals</h3>
                <div class="applied-referrals-list">
                    ${user.appliedReferrals && user.appliedReferrals.length > 0 ? 
                    user.appliedReferrals.map(code => {
                        const isSuggested = randomUsers.some(u => u.referralCode === code);
                        return `
                            <div class="applied-code ${isSuggested ? 'suggested-code' : 'user-code'}">
                                <i class="fas ${isSuggested ? 'fa-robot' : 'fa-user'}"></i>
                                <span>${code}</span>
                                <div class="points-earned">+${isSuggested ? '20' : '50'} pts</div>
                            </div>
                        `;
                    }).join('') : 
                    '<div class="no-referrals">You haven\'t applied any referral codes yet.</div>'
                    }
                </div>
            </div>
        </div>
    `;
    
    // Initialize the suggestion icons animation
    initSuggestionIcons();
}

// Get random users for recommendations
function getRandomUsers(count) {
    // Shuffle and get a subset of randomUsers
    return [...randomUsers].sort(() => 0.5 - Math.random()).slice(0, count);
}

// Fill referral code input from suggestion
function fillReferralCode(code) {
    const input = document.getElementById('referralCode');
    if (input) {
        input.value = code;
        input.classList.add('highlight-pulse');
        setTimeout(() => {
            input.classList.remove('highlight-pulse');
        }, 1000);
    }
}

// Copy referral code to clipboard
function copyReferralCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Referral code copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy referral code', 'error');
    });
}

// Change avatar function
function changeAvatar() {
    // Generate a random avatar using DiceBear abstract art
    const avatarTypes = ['shapes', 'pixels', 'identicon', 'initials'];
    const randomType = avatarTypes[Math.floor(Math.random() * avatarTypes.length)];
    const seeds = ['ruby', 'diamond', 'sapphire', 'emerald', 'amethyst', 'topaz', 'amber', 'opal', 'pearl', 'onyx'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    
    user.avatar = `https://api.dicebear.com/6.x/${randomType}/svg?seed=${randomSeed}`;
    saveUserData();
    
    // Update avatar display
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
        avatarImg.src = user.avatar;
        avatarImg.classList.add('avatar-change');
        setTimeout(() => avatarImg.classList.remove('avatar-change'), 1000);
    }
}

// Ad watching functionality
function watchAd() {
    const adOverlay = document.getElementById('adOverlay');
    const progressBar = document.querySelector('.ad-progress-bar');
    const rewardMessage = document.querySelector('.ad-reward-message');
    const closeBtn = document.getElementById('closeAdBtn');
    
    // Check daily ad limit
    if ((user.adsWatchedToday || 0) >= siteSettings.MAX_ADS_PER_DAY) {
        showNotification("Daily Limit Reached", `You have watched the maximum ${siteSettings.MAX_ADS_PER_DAY} ads for today.`);
        // Optionally disable the button here
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (watchAdBtn) {
            watchAdBtn.disabled = true;
            watchAdBtn.textContent = 'Limit Reached';
        }
        return;
    }
    
    // Check if in cooldown
    if (user.lastAdTime) {
    const now = new Date();
        const elapsed = Math.floor((now - new Date(user.lastAdTime)) / 1000);
        const cooldownTime = 15; // 15 seconds cooldown
        
        if (elapsed < cooldownTime) {
            const remaining = cooldownTime - elapsed;
            showNotification("Cooldown Active", `Please wait ${remaining} seconds before watching another ad`);
        return;
        }
    }
    
    // Show ad overlay
    adOverlay.style.display = 'flex';
    
    // Reset UI
    progressBar.style.width = '0%';
    rewardMessage.textContent = '';
    closeBtn.style.display = 'none';
    
    // Simulate ad progress
    let progress = 0;
    const adDuration = 5000; // 5 seconds for testing, can be adjusted
    const interval = 50; // Update every 50ms
    const increment = (interval / adDuration) * 100;
    
    const progressInterval = setInterval(() => {
        progress += increment;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            adCompleted();
        }
    }, interval);
    
    // Function to handle ad completion
    function adCompleted() {
        // Calculate random points between 10-30
        const pointsEarned = Math.floor(Math.random() * 21) + 10;
        
        // Update user points
        user.points += pointsEarned;
        // Record the time for cooldown
        user.lastAdTime = new Date().toISOString();
        user.adsWatchedToday = (user.adsWatchedToday || 0) + 1;
        user.totalAdsWatched = (user.totalAdsWatched || 0) + 1;
        saveUserData();
        
        // Update UI
        rewardMessage.textContent = `You earned ${pointsEarned} points!`;
        closeBtn.style.display = 'block';
        
        // Show points animation
        showPointsAnimation(pointsEarned);
        
        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        // Update points display in the app
        updatePointsDisplay();
        
        // Show notification
        showNotification(`Earned ${pointsEarned} points from ad!`, false);
        
        // Update home screen stats if visible
        if (document.querySelector('.home-card')) {
            loadHome();
        }
    }
    
    // Close button event
    closeBtn.addEventListener('click', () => {
        adOverlay.style.display = 'none';
        // Start cooldown timer
        updateCooldownTimer();
    });
}

// Function to show points animation
function showPointsAnimation(points) {
    const pointsDisplayElement = document.querySelector('.points-display'); // Or button/ad area
    if (!pointsDisplayElement) return;

    const rect = pointsDisplayElement.getBoundingClientRect();
    const animationElement = document.createElement('span');
    animationElement.className = 'points-animation';
    animationElement.textContent = `+${points} pts`;

    // Position near the points display or button
    animationElement.style.position = 'fixed'; // Use fixed to position relative to viewport
    animationElement.style.left = `${rect.left + rect.width / 2 - 30}px`;
    animationElement.style.top = `${rect.top - 30}px`;

    document.body.appendChild(animationElement);

    // Remove the element after animation finishes
    setTimeout(() => {
        if (animationElement.parentNode) {
            animationElement.parentNode.removeChild(animationElement);
        }
    }, 1500); // Match animation duration
}

// Function to update points display throughout the app
function updatePointsDisplay() {
    const pointsDisplays = document.querySelectorAll('.points-value');
    pointsDisplays.forEach(display => {
        display.textContent = user.points;
    });
    
    // Add pulse effect to points display
    const pointsDisplayElement = document.querySelector('.points-display');
    if (pointsDisplayElement) {
        pointsDisplayElement.classList.add('updated');
        setTimeout(() => {
            pointsDisplayElement.classList.remove('updated');
        }, 500); // Duration matches CSS animation
    }
}

// Update the existing watch ad buttons to use the new function
function setupAdButtons() {
    const adButtons = document.querySelectorAll('.watch-ad-btn');
    adButtons.forEach(button => {
        button.addEventListener('click', watchAd);
    });
}

// Complete ad and give rewards
function completeAd() {
    // Calculate random points (50-120)
    const pointsEarned = Math.floor(Math.random() * 71) + 50;
    user.points += pointsEarned;
    user.adsWatchedToday++;
    user.totalAdsWatched++;
    user.lastAdTime = new Date().toISOString();
    
    // Check for bonus
    let bonusPoints = 0;
    if (user.totalAdsWatched % BONUS_AFTER_SPINS === 0) {
        bonusPoints = BONUS_POINTS;
        user.points += bonusPoints;
    }
    
    // Update streak
    updateStreak();
    
    // Save user data
    saveUserData();
    
    // Show reward animation
    showReward(pointsEarned, bonusPoints);
}

// Open daily gift (the gift box FAB)
function openDailyGift() {
    // Check if the gift has already been opened today
    const today = new Date().toDateString();
    if (user.lastGiftDate === today) {
        showNotification('Gift Already Claimed', 'You have already claimed your daily gift. Come back tomorrow!');
        return;
    }
    
    // Award random bonus (100-500 points)
    const bonusPoints = Math.floor(Math.random() * 401) + 100;
    user.points += bonusPoints;
    user.lastGiftDate = today;
    
    // Save user data
    saveUserData();
    
    // Show reward animation with confetti
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
    });
    
    contentDiv.innerHTML = `
        <div class="card gift-card">
            <h2 class="gradient-text">Daily Gift!</h2>
            <lottie-player 
                src="https://assets10.lottiefiles.com/packages/lf20_fnjH1K.json" 
                background="transparent" 
                speed="1" 
                style="width: 300px; height: 300px; margin: 0 auto;" 
                autoplay>
            </lottie-player>
            <h3 class="gift-points">+${bonusPoints} Bonus Points!</h3>
            <p class="gift-message">Come back tomorrow for another gift!</p>
            <button onclick="loadHome()" class="continue-btn">Continue</button>
        </div>
    `;
    
    // Update gift button appearance
    updateGiftButton();
}

// Save profile changes
function saveProfile() {
    const nameInput = document.getElementById('username');
    if (nameInput && nameInput.value.trim() !== '') {
        user.name = nameInput.value.trim();
        saveUserData();
        showNotification('Profile updated successfully!', 'success');
        
        // Add a save animation
        const button = document.querySelector('.save-profile-btn');
        if (button) {
            button.classList.add('saved');
            setTimeout(() => {
                button.classList.remove('saved');
            }, 1000);
        }
    } else {
        showNotification('Please enter a valid name', 'error');
    }
}

// Show reward animation
function showReward(points, bonusPoints) {
    // Trigger confetti
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    contentDiv.innerHTML = `
        <div class="card reward-card">
            <h2 class="gradient-text">Congratulations!</h2>
            <lottie-player 
                src="https://assets10.lottiefiles.com/packages/lf20_s2lryxtj.json" 
                background="transparent" 
                speed="1" 
                style="width: 300px; height: 300px; margin: 0 auto;" 
                autoplay>
            </lottie-player>
            <h3 class="reward-points">+${points} Points!</h3>
            ${bonusPoints > 0 ? `<h3 class="bonus-points">BONUS: +${bonusPoints} Points!</h3>` : ''}
            <button onclick="loadHome()" class="continue-btn">Continue</button>
        </div>
    `;
    
    // Show notification
    showNotification('Points Earned', `You earned ${points} points!`);
}

// Update Cooldown Timer
function updateCooldownTimer() {
    const cooldownDiv = document.getElementById('cooldownTimer');
    if (!cooldownDiv) return;
    
    if (!user.lastAdTime) {
        cooldownDiv.style.display = 'none';
        return;
    }
    
    const now = new Date();
    const elapsed = Math.floor((now - new Date(user.lastAdTime)) / 1000);
    const cooldownTime = 15; // 15 seconds cooldown
    
    if (elapsed < cooldownTime) {
        const remaining = cooldownTime - elapsed;
        cooldownDiv.innerHTML = `<span class="cooldown-icon">⏱️</span> Next ad in: ${remaining}s`;
        cooldownDiv.style.display = 'block';
        setTimeout(updateCooldownTimer, 1000);
    } else {
        cooldownDiv.style.display = 'none';
    }
}

// Update generateReferralCode with safety checks
function generateReferralCode(attempts = 0) {
    // Safety check
    if (!Array.isArray(randomUsers) || !Array.isArray(allUsers)) {
        console.warn('User arrays not initialized, using fallback ID');
        return 'REF' + Date.now().toString(36).toUpperCase();
    }
    
    // Rest of original function...
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check for duplicates
    const exists = [...randomUsers, ...allUsers].some(
        user => user?.referralCode === code
    );
    
    return exists && attempts < 10 
        ? generateReferralCode(attempts + 1) 
        : code;
}

// Update user streak
function updateStreak() {
    // This function is now handled in loadUserData
    // Keep this function to avoid breaking existing code
}

// Save user data to localStorage
function saveUserData() {
    try {
        // Make sure user object is valid (the currently logged-in user)
        if (!user || typeof user !== 'object' || !user.userId) {
            console.error('Invalid or incomplete user object for saveUserData:', user);
            return false;
        }
        
        // Validate required fields (optional, as they should be set by now)
        if (!user.name) user.name = 'Guest';
        if (typeof user.points !== 'number') user.points = 0;
        if (typeof user.adsWatchedToday !== 'number') user.adsWatchedToday = 0;
        if (typeof user.totalAdsWatched !== 'number') user.totalAdsWatched = 0;
        if (typeof user.streak !== 'number') user.streak = 0;
        if (!user.referralCode) user.referralCode = generateReferralCode();
        if (!Array.isArray(user.withdrawals)) user.withdrawals = [];
        if (!user.avatar) user.avatar = 'https://api.dicebear.com/6.x/shapes/svg?seed=diamond';
        if (!Array.isArray(user.appliedReferrals)) user.appliedReferrals = [];
        
        // Create string representation of current user
        const userDataString = JSON.stringify(user);
        
        // Save current user data - MOST IMPORTANT
        localStorage.setItem('currentUser', userDataString);
        console.log("Saved current user data to localStorage:", user.userId);

        return true;
    } catch (error) {
        console.error('Critical error saving user data:', error);
        
        // Try with a smaller dataset if quota exceeded
        if (error.name === 'QuotaExceededError') {
            try {
                // Create minimal user data
                const minimalUser = {
                    userId: user.userId,
                    name: user.name,
                    points: user.points,
                    referralCode: user.referralCode
                };
                
                localStorage.setItem('currentUser', JSON.stringify(minimalUser));
                console.log('Saved minimal user data due to quota limitation');
                return true;
            } catch (retryError) {
                console.error('Failed to save even minimal user data:', retryError);
                return false;
            }
        }
        
        return false;
    }
}

// NEW: Sync with appUsers data during app initialization
function syncWithAppUsers() {
    console.log("Syncing with appUsers data...");
    try {
        // Get current user ID
        const currentUserId = user?.userId;
        if (!currentUserId) {
            console.log("No current user to sync");
            return false;
        }
        
        // Get appUsers data from localStorage
        const appUsersData = localStorage.getItem('appUsers');
        if (!appUsersData) {
            console.log("No appUsers data found");
            return false;
        }
        
        // Parse appUsers data
        const appUsers = JSON.parse(appUsersData);
        if (!Array.isArray(appUsers) || appUsers.length === 0) {
            console.log("appUsers is empty or not an array");
            return false;
        }
        
        // Find current user in appUsers
        const updatedUserData = appUsers.find(u => (u.id || u.userId) === currentUserId);
        if (!updatedUserData) {
            console.log(`Current user (${currentUserId}) not found in appUsers`);
            return false;
        }
        
        console.log("Found updated user data in appUsers:", updatedUserData);
        
        // Update current user with data from appUsers (normalize fields)
        user = {
            ...user,
            points: updatedUserData.points || user.points,
            name: updatedUserData.name || user.name,
            avatar: updatedUserData.avatar || user.avatar,
            // Add other fields you want to sync here
        };
        
        console.log("Updated current user data from appUsers:", user);
        
        // Save the updated user data
        saveUserData();
        
        // Update UI if needed
        if (typeof updatePointsDisplay === 'function') {
            updatePointsDisplay();
        }
        
        return true;
    } catch (error) {
        console.error("Error syncing with appUsers:", error);
        return false;
    }
}

// Load user data from localStorage
function loadUserData() {
    try {
        const savedUser = localStorage.getItem('currentUser'); // Use the correct key
        if (savedUser) {
            try {
                user = JSON.parse(savedUser);
                
                // Check if we need to reset daily ad count
                const today = new Date().toDateString();
                const lastLogin = localStorage.getItem('lastLoginDate');
                
                // Initialize the userId if it doesn't exist
                if (!user.userId) {
                    user.userId = generateUniqueId();
                }
                
                // Initialize the streak if it doesn't exist
                if (!user.streak) {
                    user.streak = 0;
                }
                
                // Reset daily ads if it's a new day
                if (lastLogin !== today) {
                    user.adsWatchedToday = 0;
                    
                    // Update streak logic - only increment if consecutive days
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayString = yesterday.toDateString();
                    
                    if (lastLogin === yesterdayString) {
                        // User logged in yesterday, increment streak
                        user.streak += 1;
                    } else if (lastLogin && lastLogin !== today) {
                        // User missed a day, reset streak
                        user.streak = 1;
                    }
                    
                    localStorage.setItem('lastLoginDate', today);
                }
                
                // Ensure required properties exist
                if (!user.appliedReferrals) {
                    user.appliedReferrals = [];
                }
                
                if (!user.referrals) {
                    user.referrals = [];
                }
                
                if (!user.withdrawals) {
                    user.withdrawals = [];
                }
                
                // NEW: Sync with appUsers to get latest data from admin panel
                syncWithAppUsers();
                
                // Save the updated user data
                saveUserData();
                
                // Hide auth overlay if user is logged in
                const authOverlay = document.getElementById('authOverlay');
                if (authOverlay) {
                    authOverlay.style.display = 'none';
                } else {
                    console.warn('Auth overlay element not found in loadUserData');
                }
                
            } catch (e) {
                console.error('Error parsing user data:', e);
                // Reset user data if corrupted
                resetUserData();
                // Show auth overlay if there was an error
                const authOverlay = document.getElementById('authOverlay');
                if (authOverlay) {
                    authOverlay.style.display = 'flex';
                }
            }
        } else {
            // First time user, initialize streak and set today's date
            user.streak = 1;
            localStorage.setItem('lastLoginDate', new Date().toDateString());
            
            // Generate a unique ID for new user
            user.userId = generateUniqueId();
            saveUserData();
            
            // Show auth overlay for first time users
            const authOverlay = document.getElementById('authOverlay');
            if (authOverlay) {
                authOverlay.style.display = 'flex';
            } else {
                console.warn('Auth overlay element not found for first time user');
            }
        }
    } catch (error) {
        console.error('Critical error in loadUserData:', error);
        // Reset to a safe state
        resetUserData();
    }
}

// Reset user data to defaults
function resetUserData() {
    user = {
        name: 'Guest',
        points: 0,
        adsWatchedToday: 0,
        totalAdsWatched: 0,
        streak: 1,
        referralCode: generateReferralCode(),
        lastAdTime: null,
        withdrawals: [],
        avatar: 'https://api.dicebear.com/6.x/shapes/svg?seed=diamond',
        lastGiftDate: null,
        appliedReferrals: [],
        userId: generateUniqueId(),
        referrals: []
    };
    saveUserData();
}

// Update the active button in the footer
function updateActiveButton(section) {
    const buttons = document.querySelectorAll('.footer button');
    buttons.forEach(button => {
        if (button.textContent === section) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Render user badges based on points
function renderBadges() {
    let highestBadge = null;
    
    for (const threshold in badgeTiers) {
        if (user.points >= threshold) {
            highestBadge = badgeTiers[threshold];
        }
    }
    
    return highestBadge 
        ? `<div class="badge" style="background-color: ${highestBadge.color}20; color: ${highestBadge.color};">${highestBadge.icon} ${highestBadge.name}</div>` 
        : '';
}

// Get color for withdrawal status
function getStatusColor(status) {
    switch(status) {
        case 'Approved': return '#27ae60';
        case 'Pending': return '#f39c12';
        case 'Rejected': return '#e74c3c';
        default: return '#bbb';
    }
}

// Show notification
function showNotification(title, message) {
    // If only one parameter is provided, assume it's the message
    if (!message) {
        message = title;
        title = message.toLowerCase().includes('error') ? 'Error' : 
                message.toLowerCase().includes('success') ? 'Success' : 'Notification';
    }

    // Check if there's a notification container
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // If message is an error
    if (message.toLowerCase().includes('error') || title.toLowerCase().includes('error')) {
        notification.className = 'notification error';
    }
    
    // If message indicates success
    if (message.toLowerCase().includes('success') || title.toLowerCase().includes('success')) {
        notification.className = 'notification success';
    }
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${title}</strong>
                <div>${message}</div>
            </div>
            <span style="cursor: pointer; font-size: 20px; margin-left: 15px;">&times;</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Close notification when X is clicked
    notification.querySelector('span').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, 5000);
}

// Add ripple effect to buttons
function addRippleEffect() {
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            const button = e.target;
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });
}

// Initialize the auth overlay with animations
function initAuthOverlay() {
    // Animate benefit items with a staggered delay
    const benefitItems = document.querySelectorAll('.benefit-item');
    benefitItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('animated', 'fadeInUp');
        }, 300 + (index * 150)); // Staggered delay
    });
    
    // Add hover effect for benefit items
    benefitItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const icon = item.querySelector('i');
            icon.classList.add('animated', 'rubberBand');
            setTimeout(() => {
                icon.classList.remove('animated', 'rubberBand');
            }, 1000);
        });
    });
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', init);

// Update FAB button to open daily gift
document.querySelector('.fab').onclick = openDailyGift;

// Load Withdrawal Section
function loadWithdrawal() {
    updateActiveButton('Withdraw');
    contentDiv.innerHTML = `
        <div class="card withdrawal-card">
            <h2 class="section-title animated-gradient-text">Withdraw Money</h2>
            <div class="balance-container">
                <div class="balance-circle">
                    <div class="balance-inner">
                        <span class="balance-value">₹${(user.points/siteSettings.POINTS_PER_RS).toFixed(2)}</span>
                        <span class="balance-label">Available</span>
                    </div>
                </div>
            </div>
            
            <div class="withdrawal-info">
                <div class="min-withdrawal">
                    <i class="fa-solid fa-circle-info"></i>
                    Minimum Withdrawal: ₹${siteSettings.MIN_WITHDRAWAL}
                </div>
                
                <div class="payment-method-selector">
                    <p class="selector-label">Select Payment Method:</p>
                    <div class="payment-options">
                        <button class="payment-option active" data-method="upi" onclick="selectPaymentMethod('upi')">
                            <i class="fa-solid fa-mobile-screen"></i>
                            <span>UPI</span>
                        </button>
                        <button class="payment-option" data-method="paypal" onclick="selectPaymentMethod('paypal')">
                            <i class="fa-brands fa-paypal"></i>
                            <span>PayPal</span>
                        </button>
                        <button class="payment-option" data-method="bank" onclick="selectPaymentMethod('bank')">
                            <i class="fa-solid fa-building-columns"></i>
                            <span>Bank</span>
                        </button>
                    </div>
                </div>
                
                <div class="payment-details" id="payment-details">
                    <!-- UPI Form (default) -->
                    <div id="upi-form" class="payment-form active animated-form">
                        <div class="input-group">
                            <label for="upiId">UPI ID</label>
                            <input type="text" id="upiId" placeholder="Enter UPI ID (e.g. name@upi)" class="fancy-input">
                        </div>
                    </div>
                    
                    <!-- PayPal Form -->
                    <div id="paypal-form" class="payment-form animated-form">
                        <div class="input-group">
                            <label for="paypalEmail">PayPal Email</label>
                            <input type="email" id="paypalEmail" placeholder="Enter PayPal Email" class="fancy-input">
                        </div>
                    </div>
                    
                    <!-- Bank Transfer Form -->
                    <div id="bank-form" class="payment-form animated-form">
                        <div class="input-group">
                            <label for="accountName">Account Holder Name</label>
                            <input type="text" id="accountName" placeholder="Account Holder Name" class="fancy-input">
                        </div>
                        <div class="input-group">
                            <label for="accountNumber">Account Number</label>
                            <input type="text" id="accountNumber" placeholder="Account Number" class="fancy-input">
                        </div>
                        <div class="input-group">
                            <label for="ifscCode">IFSC Code</label>
                            <input type="text" id="ifscCode" placeholder="IFSC Code" class="fancy-input">
                        </div>
                    </div>
                </div>
                
                <div class="withdrawal-amount-container">
                    <div class="amount-input-group">
                        <span class="currency-symbol">₹</span>
                        <input type="number" id="withdrawAmount" placeholder="Amount" min="${siteSettings.MIN_WITHDRAWAL}" step="1" class="fancy-input amount-input">
                    </div>
                    <button onclick="requestWithdrawal()" class="request-withdrawal-btn primary-btn">
                        <i class="fa-solid fa-paper-plane"></i>
                        <span>Request Withdrawal</span>
                    </button>
                </div>
            </div>
            
            <div class="withdrawal-history">
                <h3 class="subsection-title">Withdrawal History</h3>
                <div class="history-list">
                ${user.withdrawals && user.withdrawals.length > 0 ? 
                    user.withdrawals.map(w => `
                        <div class="history-item status-${w.status.toLowerCase()}">
                            <div class="withdrawal-amount">₹${w.amount}</div>
                            <div class="withdrawal-method">${w.method.toUpperCase()}</div>
                            <div class="withdrawal-status">${w.status}</div>
                            <div class="withdrawal-date">${w.date}</div>
                        </div>
                    `).join('') :
                    '<p class="no-history">No withdrawals yet</p>'
                }
                </div>
            </div>
        </div>
    `;
    
    // Make sure payment methods work properly
    const paymentOptions = document.querySelectorAll('.payment-option');
    paymentOptions.forEach(option => {
        option.addEventListener('click', () => {
            const method = option.getAttribute('data-method');
            selectPaymentMethod(method);
        });
    });
}

// Switch between payment methods
function selectPaymentMethod(method) {
    // Hide all payment forms
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Show selected payment form
    const selectedForm = document.getElementById(`${method}-form`);
    if (selectedForm) {
        selectedForm.classList.add('active');
        
        // Add animation class then remove it
        selectedForm.classList.add('form-animate-in');
        setTimeout(() => {
            selectedForm.classList.remove('form-animate-in');
        }, 500);
    }
    
    // Update button states
    document.querySelectorAll('.payment-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedBtn = document.querySelector(`.payment-option[data-method="${method}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Request Withdrawal
function requestWithdrawal() {
    const amountInput = document.getElementById('withdrawAmount');
    if (!amountInput || !amountInput.value) {
        showNotification('Please enter a withdrawal amount', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    const pointsRequired = amount * siteSettings.POINTS_PER_RS;
    
    // Validation checks
    if (amount < siteSettings.MIN_WITHDRAWAL) {
        showNotification(`Minimum withdrawal amount is ₹${siteSettings.MIN_WITHDRAWAL}`, 'error');
        return;
    }
    
    if (user.points < pointsRequired) {
        showNotification('You don\'t have enough points for this withdrawal', 'error');
        return;
    }
    
    // Get payment details based on selected method
    let paymentDetails = {};
    const activeMethod = document.querySelector('.payment-option.active').getAttribute('data-method');
    
    switch (activeMethod) {
        case 'upi':
            const upiId = document.getElementById('upiId').value;
            if (!upiId) {
                showNotification('Please enter your UPI ID', 'error');
                return;
            }
            paymentDetails = { upiId };
            break;
            
        case 'paypal':
            const paypalEmail = document.getElementById('paypalEmail').value;
            if (!paypalEmail) {
                showNotification('Please enter your PayPal email', 'error');
                return;
            }
            paymentDetails = { paypalEmail };
            break;
            
        case 'bank':
            const accountName = document.getElementById('accountName').value;
            const accountNumber = document.getElementById('accountNumber').value;
            const ifscCode = document.getElementById('ifscCode').value;
            
            if (!accountName || !accountNumber || !ifscCode) {
                showNotification('Please fill all bank details', 'error');
                return;
            }
            paymentDetails = { accountName, accountNumber, ifscCode };
            break;
    }
    
    // Create withdrawal record
    const withdrawal = {
        id: generateUniqueId(),
        amount: amount,
        points: pointsRequired,
        method: activeMethod,
        details: paymentDetails,
        status: 'Pending',
        date: new Date().toLocaleDateString()
    };
    
    // Update user data
    user.points -= pointsRequired;
    if (!user.withdrawals) {
        user.withdrawals = [];
    }
    user.withdrawals.unshift(withdrawal); // Add to beginning of array
    
    // Save user data
    saveUserData();
    
    // Show success animation and notification
    showWithdrawalSuccess(amount);
    
    // Update UI
    setTimeout(() => {
        loadWithdrawal();
    }, 2500);
}

// Show withdrawal success animation
function showWithdrawalSuccess(amount) {
    // Create overlay for animation
    const overlay = document.createElement('div');
    overlay.className = 'animation-overlay';
    
    overlay.innerHTML = `
        <div class="success-animation">
            <div class="success-icon-container">
                <i class="fa-solid fa-check-circle success-icon"></i>
            </div>
            <h3 class="success-title">Withdrawal Request Submitted</h3>
            <p class="success-message">Your request for ₹${amount} has been submitted and is pending approval.</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add animation classes
    setTimeout(() => {
        const successIcon = overlay.querySelector('.success-icon');
        if (successIcon) {
            successIcon.classList.add('animate-success');
        }
    }, 100);
    
    // Remove overlay after animation
    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 500);
    }, 2000);
}

// Apply Referral Code
function applyReferralCode() {
    const codeInput = document.getElementById('referralCode');
    if (!codeInput || !codeInput.value) {
        showNotification('Please enter a referral code', 'error');
        return;
    }
    
    const code = codeInput.value.trim();
    
    // Check if code is already applied
    if (user.appliedReferrals && user.appliedReferrals.includes(code)) {
        showNotification('You have already applied this referral code', 'error');
        return;
    }
    
    // Check if it's the user's own code
    if (code === user.referralCode) {
        showNotification('You cannot apply your own referral code', 'error');
        return;
    }
    
    // Initialize appliedReferrals array if it doesn't exist
    if (!user.appliedReferrals) {
        user.appliedReferrals = [];
    }
    
    // Check if the code is from the suggested list
    const isSuggestedCode = randomUsers.some(u => u.referralCode === code);
    
    // Determine points to award based on code type
    const pointsToAward = isSuggestedCode ? 20 : 50;
    
    // Add the code to applied referrals
    user.appliedReferrals.push(code);
    
    // Award points
    user.points += pointsToAward;
    
    // Show appropriate notification
    if (isSuggestedCode) {
        showNotification(`Suggested referral code applied! You earned 20 points!`, 'success');
    } else {
        showNotification(`User referral code applied! You earned 50 points!`, 'success');
    }
    
    // Save user data
    saveUserData();
    
    // Show success animation
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    // Clear the input field
    codeInput.value = '';
    
    // Update UI
    loadReferral();
}

// Add animation functionality for suggestion icons
function initSuggestionIcons() {
    try {
        const suggestionIcons = document.querySelectorAll('.suggestion-icon');
        if (!suggestionIcons || suggestionIcons.length === 0) {
            console.log('No suggestion icons found to initialize');
            return;
        }
        
        console.log(`Initializing ${suggestionIcons.length} suggestion icons`);
        
        suggestionIcons.forEach(icon => {
            // Random animation delay for staggered effect
            const randomDelay = Math.random() * 2;
            icon.style.animationDelay = `${randomDelay}s`;
            
            // Add hover interaction
            icon.addEventListener('mouseenter', () => {
                icon.classList.add('suggestion-icon-hover');
            });
            
            icon.addEventListener('mouseleave', () => {
                icon.classList.remove('suggestion-icon-hover');
            });
        });
    } catch (error) {
        console.error('Error initializing suggestion icons:', error);
    }
}

// Enhanced withdrawal animations
function initWithdrawalAnimations() {
    try {
        const withdrawalSection = document.querySelector('.withdrawal-section');
        if (!withdrawalSection) {
            console.log('No withdrawal section found to initialize');
            return;
        }
        
        const withdrawButton = document.querySelector('.withdraw-button');
        const balanceContainer = document.querySelector('.balance-container');
        
        if (!withdrawButton && !balanceContainer) {
            console.log('Neither withdraw button nor balance container found');
            return;
        }
        
        console.log('Initializing withdrawal animations');
        
        // Add entrance animation when section comes into view
        if (withdrawalSection) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        withdrawalSection.classList.add('withdrawal-section-visible');
                        
                        if (balanceContainer) {
                            balanceContainer.classList.add('balance-pulse');
                        }
                        
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            
            observer.observe(withdrawalSection);
        }
        
        // Withdraw button click animation
        if (withdrawButton) {
            withdrawButton.addEventListener('click', () => {
                if (!withdrawButton.classList.contains('processing')) {
                    withdrawButton.classList.add('processing');
                    
                    // Simulate processing
                    setTimeout(() => {
                        withdrawButton.classList.remove('processing');
                        if (typeof showWithdrawalSuccess === 'function') {
                            showWithdrawalSuccess();
                        }
                    }, 2000);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing withdrawal animations:', error);
    }
}

// Show withdrawal success notification with animation
function showWithdrawalSuccess() {
    try {
        const successNotification = document.createElement('div');
        successNotification.className = 'withdrawal-success-notification';
        
        successNotification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Withdrawal Request Submitted!</span>
        `;
        
        document.body.appendChild(successNotification);
        
        // Trigger animation
        setTimeout(() => {
            successNotification.classList.add('show');
        }, 10);
        
        // Remove notification after animation completes
        setTimeout(() => {
            successNotification.classList.remove('show');
            setTimeout(() => {
                if (successNotification.parentNode) {
                    document.body.removeChild(successNotification);
                }
            }, 500);
        }, 3000);
    } catch (error) {
        console.error('Error showing withdrawal success:', error);
    }
}

// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabIndicator = document.querySelector('.tab-indicator');

    // Switch tabs
    if (loginTab && signupTab) {
        loginTab.addEventListener('click', function() {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            if (loginForm) loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
            if (tabIndicator) tabIndicator.style.left = '0';
        });

        signupTab.addEventListener('click', function() {
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
            if (tabIndicator) tabIndicator.style.left = '50%';
        });
    }

    // Password visibility toggle
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Login and signup form submission handlers are now in the HTML file

    // Check for remembered user
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        const loginUsernameField = document.getElementById('loginUsername');
        const rememberMeCheckbox = document.getElementById('rememberMe');
        
        if (loginUsernameField) loginUsernameField.value = rememberedUser;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }
});

// Check if user with given mobile/username exists
function userExists(identifier) {
    // Check if identifier is valid
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
        console.log('Invalid identifier provided to userExists:', identifier);
        return false;
    }
    
    // Check if allUsers is valid
    if (!allUsers || !Array.isArray(allUsers) || allUsers.length === 0) {
        console.log('No users available to check against');
        return false;
    }
    
    // Normalize identifier by trimming
    const normalizedIdentifier = identifier.trim();
    
    // Check if user exists
    return allUsers.some(user => 
        (user.mobile && user.mobile.trim() === normalizedIdentifier) || 
        (user.email && user.email.trim() === normalizedIdentifier)
    );
}

// Get user data by mobile number or username
function getUserData(identifier) {
    // Check if identifier is valid
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
        console.log('Invalid identifier provided to getUserData:', identifier);
        return null;
    }
    
    // Check if allUsers is valid
    if (!allUsers || !Array.isArray(allUsers) || allUsers.length === 0) {
        console.log('No users available to retrieve data from');
        return null;
    }
    
    // Normalize identifier by trimming
    const normalizedIdentifier = identifier.trim();
    
    // Find and return user data
    return allUsers.find(user => 
        (user.mobile && user.mobile.trim() === normalizedIdentifier) || 
        (user.email && user.email.trim() === normalizedIdentifier)
    );
}

// Initialize app with user data
function initializeWithUserData(userData) {
    try {
        console.log('Initializing with user data');
        
        if (!userData) {
            console.error('Cannot initialize with null user data');
            return false;
        }
        
        // Update global user data
        user = {
            ...user, // Keep default values
            name: userData.name || 'Guest',
            points: userData.points || 0,
            adsWatchedToday: userData.adsWatchedToday || 0,
            totalAdsWatched: userData.totalAdsWatched || 0,
            streak: userData.streak || 0,
            lastLoginDate: userData.lastLoginDate || new Date().toISOString().split('T')[0],
            lastAdTime: userData.lastAdTime || null,
            avatar: userData.avatar || 'https://api.dicebear.com/6.x/identicon/svg?seed=default',
            referralCode: userData.referralCode || generateReferralCode(),
            appliedReferrals: userData.appliedReferrals || [],
            withdrawals: userData.withdrawals || [],
            ...userData
        };
        
        console.log('User data initialized successfully');
        
        // Load home page with updated user data
        loadHome();
        return true;
    } catch (error) {
        console.error('Error initializing user data:', error);
        return false;
    }
}

// Handle login
function handleLogin(e) {
    if (e) e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;

    console.log("[Login] Attempting login with username:", username);

    // Validate input
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Handle admin login
    if (username === 'admin' && password === 'admin123') {
        window.location.href = 'admin.html';
        return;
    }

    // Get users from appUsers (admin panel) first, then fallback to allUsers
    try {
        // Try to get users from appUsers first (admin panel data)
        let appUsersData = localStorage.getItem('appUsers');
        let userData = null;
        let appUsers = [];
        
        if (appUsersData) {
            appUsers = JSON.parse(appUsersData);
            console.log("[Login] Loaded users from appUsers:", appUsers.length);
            
            // Find user in appUsers
            userData = appUsers.find(user => 
                (user.mobile && user.mobile.trim() === username.trim()) || 
                (user.email && user.email.trim() === username.trim())
            );
        }
        
        // If user not found in appUsers, check allUsers as fallback
        if (!userData) {
            console.log("[Login] User not found in appUsers, checking allUsers...");
            
            const allUsersData = localStorage.getItem('allUsers');
            if (allUsersData) {
                allUsers = JSON.parse(allUsersData);
                userData = allUsers.find(user => 
                    (user.mobile && user.mobile.trim() === username.trim()) || 
                    (user.email && user.email.trim() === username.trim())
                );
            }
        }
        
        // Check if user exists
        if (userData) {
            console.log("[Login] User found:", userData.name);
            
            // Check password
            if (userData.password === password) {
                // Login successful - set current user to the logged in user
                user = { ...userData };
                
                // Ensure user has userId if coming from admin panel data
                if (!user.userId && user.id) {
                    user.userId = user.id;
                }
                
                console.log("[Login] Login successful, saving user session for:", user.userId || user.id);
                
                // CRITICAL: Save user data to localStorage to ensure persistence
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                // Close auth overlay and initialize app with user data
                document.getElementById('authOverlay').style.display = 'none';
                initializeWithUserData(userData);
                showNotification('Login successful! Welcome back ' + userData.name, 'success');
            } else {
                showNotification('Incorrect password', 'error');
            }
        } else {
            showNotification('User not found. Please sign up.', 'error');
        }
    } catch (error) {
        console.error("[Login] Error during login process:", error);
        showNotification('An error occurred during login. Please try again.', 'error');
    }
}

// Handle signup with better error handling
function handleSignup(e) {
    if (e) e.preventDefault();
    console.log('[Signup] Process started');

    // Safe element retrieval with debug logging
    const getInput = (id) => {
        const el = document.getElementById(id);
        if (!el) {
            console.error(`[Signup] Missing form element: ${id}`);
            showNotification(`Error: Form element ${id} not found. Please refresh the page.`, 'error');
        }
        return el;
    };

    const inputs = {
        name: getInput('signupName'),
        mobile: getInput('signupMobile'),
        email: getInput('signupEmail'),
        password: getInput('signupPassword'),
        confirmPassword: getInput('signupConfirmPassword'),
        terms: getInput('termsAgreed')
    };

    // Validate all inputs exist
    if (Object.values(inputs).some(input => !input)) {
        showNotification('Form elements missing. Please refresh the page.', 'error');
        return false;
    }

    // Get and trim values
    const values = {
        name: inputs.name.value.trim(),
        mobile: inputs.mobile.value.trim(),
        email: inputs.email.value.trim(),
        password: inputs.password.value,
        confirmPassword: inputs.confirmPassword.value,
        terms: inputs.terms.checked
    };

    console.log('[Signup] Form values collected:', 
        JSON.stringify({
            name: values.name,
            mobile: values.mobile,
            email: values.email,
            password: values.password ? '***' : '', 
            confirmPassword: values.confirmPassword ? '***' : '',
            terms: values.terms
        })
    );

    // Reset error states
    Object.values(inputs).forEach(input => {
        if (input && input.classList) input.classList.remove('error');
    });

    // Simpler validation checks
    if (!values.name) {
        showNotification('Please enter your name', 'error');
        inputs.name.classList.add('error');
        return false;
    }
    
    if (!values.mobile) {
        showNotification('Please enter your mobile number', 'error');
        inputs.mobile.classList.add('error');
        return false;
    }

    if (!values.email) {
        showNotification('Please enter your email address', 'error');
        inputs.email.classList.add('error');
        return false;
    }

    if (!values.password) {
        showNotification('Please enter a password', 'error');
        inputs.password.classList.add('error');
        return false;
    }
    
    if (values.password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        inputs.password.classList.add('error');
        return false;
    }
    
    if (values.password !== values.confirmPassword) {
        showNotification('Passwords do not match', 'error');
        inputs.confirmPassword.classList.add('error');
        return false;
    }
    
    if (!values.terms) {
        showNotification('Please agree to the Terms & Conditions', 'error');
        inputs.terms.classList.add('error');
        return false;
    }

    // Get users from appUsers (admin panel) and allUsers for combined check
    try {
        // First try to get users from appUsers
        let appUsers = [];
        const appUsersData = localStorage.getItem('appUsers');
        if (appUsersData) {
            try {
                appUsers = JSON.parse(appUsersData);
                console.log('[Signup] Loaded existing users from appUsers:', appUsers.length);
            } catch (e) {
                console.error('[Signup] Error parsing appUsers:', e);
            }
        }
        
        // Then try to get users from allUsers as backup
        let allUsers = [];
        const allUsersData = localStorage.getItem('allUsers');
        if (allUsersData) {
            try {
                allUsers = JSON.parse(allUsersData);
                console.log('[Signup] Loaded existing users from allUsers:', allUsers.length);
            } catch (e) {
                console.error('[Signup] Error parsing allUsers:', e);
            }
        }
        
        // Combine both arrays for duplicate checking (prioritize appUsers)
        const combinedUsers = [...appUsers];
        
        // Add users from allUsers only if they don't exist in appUsers
        allUsers.forEach(user => {
            const exists = combinedUsers.some(u => 
                (u.email && user.email && u.email.trim() === user.email.trim()) || 
                (u.mobile && user.mobile && u.mobile.trim() === user.mobile.trim()) ||
                (u.id && user.userId && u.id === user.userId) ||
                (u.userId && user.userId && u.userId === user.userId)
            );
            
            if (!exists) {
                combinedUsers.push(user);
            }
        });
        
        console.log('[Signup] Combined unique users for checking:', combinedUsers.length);

        // Check for existing user in the combined array
        const userAlreadyExists = combinedUsers.some(u => 
            (u.email && u.email.trim() === values.email.trim()) || 
            (u.mobile && u.mobile.trim() === values.mobile.trim())
        );
        
        if (userAlreadyExists) {
            showNotification('User with this email or mobile already exists', 'error');
            return false;
        }

        try {
            console.log('[Signup] Creating user account');

            // Create new user object with consistent field names
            const userId = generateUniqueId();
            const newUser = {
                ...values,
                balance: 0,
                points: 100,
                referralCode: generateReferralCode(),
                id: userId,            // For admin panel compatibility
                userId: userId,        // For main app compatibility
                adsWatchedToday: 0,
                totalAdsWatched: 0,
                streak: 1,
                referredBy: '',
                lastAdTime: null,
                joinDate: new Date().toISOString(),
                status: 'active',      // For admin panel
                badge: 'bronze',
                avatar: 'https://api.dicebear.com/6.x/shapes/svg?seed=diamond',
                wallet: { pending: 0, approved: 0, withdrawn: 0 },
                withdrawals: [],
                notifications: [],
                lastGiftDate: null,
                appliedReferrals: []
            };

            console.log('[Signup] New user object created with ID:', newUser.userId);

            // Storage check with fallback
            try {
                // Add new user to appUsers array (used by admin panel)
                appUsers.push(newUser);
                localStorage.setItem('appUsers', JSON.stringify(appUsers));
                console.log('[Signup] User data saved to appUsers successfully:', appUsers.length, 'total users');

                // Also update allUsers for backward compatibility
                allUsers.push(newUser);
                localStorage.setItem('allUsers', JSON.stringify(allUsers));
                console.log('[Signup] User data also saved to allUsers for compatibility');

                // Save the new user as the currently logged-in user
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                console.log("[Signup] New user saved as currentUser");

                // Update global user state
                user = { ...newUser };
                
                // Close auth overlay
                const authOverlay = document.querySelector('.auth-overlay');
                if (authOverlay) {
                    authOverlay.style.display = 'none';
                    authOverlay.classList.remove('show');
                    console.log('[Signup] Auth overlay hidden');
                } else {
                    console.error('[Signup] Auth overlay not found');
                }
                
                // Initialize app with new user
                console.log('[Signup] Initializing app with new user data');
                initializeWithUserData(newUser);
                
                showNotification(`Welcome ${values.name}! Account created successfully`, 'success');
                
                // Clear form fields
                Object.values(inputs).forEach(input => {
                    if (input && input.value !== undefined) input.value = '';
                });
                
                return true;
            } catch (storageError) {
                console.error('[Signup] Storage error:', storageError);
                
                // Fallback: At least try to save the current user
                try {
                    localStorage.setItem('currentUser', JSON.stringify(newUser));
                    console.log('[Signup] Saved user as currentUser in fallback mode');
                    
                    // Update global user state
                    user = { ...newUser };
                    
                    // Close auth overlay
                    const authOverlay = document.querySelector('.auth-overlay');
                    if (authOverlay) {
                        authOverlay.style.display = 'none';
                        authOverlay.classList.remove('show');
                    }
                    
                    // Initialize app with new user
                    initializeWithUserData(newUser);
                    
                    showNotification(`Welcome ${values.name}! Account created with limited storage.`, 'success');
                    return true;
                } catch (criticalError) {
                    console.error('[Signup] Critical storage error:', criticalError);
                    showNotification('Unable to create account due to storage issues. Please clear browser data and try again.', 'error');
                    return false;
                }
            }
        } catch (error) {
            console.error('[Signup] Critical error:', error);
            showNotification('A system error occurred. Please try again later.', 'error');
            return false;
        }
    } catch (error) {
        console.error('[Signup] Fatal error in user validation:', error);
        showNotification('Error checking existing users. Please try again.', 'error');
        return false;
    }
}

// Generate unique ID
function generateUniqueId() {
    return 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update Gift Button appearance based on availability
function updateGiftButton() {
    const giftButton = document.getElementById('giftButton');
    if (!giftButton) return;
    
    const today = new Date().toDateString();
    if (user.lastGiftDate === today) {
        // User already claimed gift today
        giftButton.classList.add('claimed');
        giftButton.title = 'Already claimed today! Come back tomorrow';
    } else {
        // Gift is available
        giftButton.classList.remove('claimed');
        giftButton.title = 'Claim your daily gift!';
    }
}

// Enhanced mobile number validation (add this helper function)
function isValidMobileNumber(mobile) {
    return /^[0-9]{10,15}$/.test(mobile);
}

// Enhanced password validation (add this helper function)
function isStrongPassword(password) {
    // Make this less strict so users can sign up more easily
    return password.length >= 6; // Only require minimum length
}

// Add a proper logout function to handle user logout
function logout() {
    console.log("Logging out user:", user.userId);
    
    // Remove user data from localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberedUser');
    
    // Reset user object to default state
    resetUserData();
    
    // Show authentication overlay - ensure it's displayed and visible
    const authOverlay = document.querySelector('.auth-overlay');
    if (authOverlay) {
        console.log("Found auth overlay, making it visible");
        authOverlay.style.display = 'flex';
        authOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Force reflow to ensure animations work
        void authOverlay.offsetWidth;
        
        // Initialize auth tabs
        setupAuthTabs();
        
        // Force focus on first input field
        setTimeout(() => {
            const firstInput = document.getElementById('loginUsername');
            if (firstInput) firstInput.focus();
        }, 100);
    } else {
        console.error("Auth overlay not found! Reloading page...");
        // If overlay not found, reload the page as fallback
        window.location.reload();
    }
    
    // Notify user
    showNotification('Logged Out', 'You have been logged out successfully.', 'info');
}

function showAuthOverlay() {
    const authOverlay = document.querySelector('.auth-overlay');
    if (!authOverlay) {
        console.error("Auth overlay element not found!");
        return;
    }
    
    // Ensure the overlay is visible
    authOverlay.style.display = 'flex';
    authOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    console.log("Auth overlay shown");
    
    // Add animations to benefit items with delay
    const benefitItems = document.querySelectorAll('.benefit-item');
    benefitItems.forEach((item, index) => {
        item.classList.add('fade-in-up');
        item.style.animationDelay = `${0.1 * (index + 1)}s`;
        
        // Add hover effect to animate icons
        item.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.add('rubberBand');
                setTimeout(() => {
                    icon.classList.remove('rubberBand');
                }, 800);
            }
        });
    });
    
    // Remember user if checkbox is checked
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        try {
            const userData = JSON.parse(rememberedUser);
            const loginUsername = document.querySelector('#loginUsername');
            const loginPassword = document.querySelector('#loginPassword');
            const rememberMe = document.querySelector('#rememberMe');
            
            if (loginUsername) loginUsername.value = userData.username || userData.email || userData.mobile || '';
            if (loginPassword) loginPassword.value = userData.password || '';
            if (rememberMe) rememberMe.checked = true;
        } catch (e) {
            console.error('Error parsing remembered user data', e);
        }
    }
    
    setupAuthTabs();
}

// Setup auth tabs functionality
function setupAuthTabs() {
    const loginTab = document.getElementById('loginTabBtn');
    const signupTab = document.getElementById('signupTabBtn');
    const loginContent = document.getElementById('loginTabContent');
    const signupContent = document.getElementById('signupTabContent');
    
    if (!loginTab || !signupTab || !loginContent || !signupContent) {
        console.error('Auth tabs elements not found');
        return;
    }
    
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginContent.classList.add('active');
        signupContent.classList.remove('active');
    });
    
    signupTab.addEventListener('click', function() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupContent.classList.add('active');
        loginContent.classList.remove('active');
    });
    
    // Make sure one tab is active
    if (!loginTab.classList.contains('active') && !signupTab.classList.contains('active')) {
        loginTab.classList.add('active');
        loginContent.classList.add('active');
    }
}

// Show confirmation dialog
function showConfirmDialog(title, message, confirmAction) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    
    overlay.innerHTML = `
        <div class="confirmation-dialog">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="dialog-buttons">
                <button class="cancel-btn">Cancel</button>
                <button class="confirm-btn">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const cancelBtn = overlay.querySelector('.cancel-btn');
    const confirmBtn = overlay.querySelector('.confirm-btn');
    
    cancelBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    confirmBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
        if (typeof confirmAction === 'function') {
            confirmAction();
        }
    });
}

// Function to show ad overlay and handle ad viewing experience
function showAdOverlay() {
    const adOverlay = document.getElementById('adOverlay');
    const progressBar = document.querySelector('.ad-progress-bar');
    const rewardMessage = document.querySelector('.ad-reward-message');
    const closeAdBtn = document.getElementById('closeAdBtn');
    
    // Show overlay
    adOverlay.style.display = 'flex';
    
    // Reset progress bar and reward message
    progressBar.style.width = '0%';
    rewardMessage.textContent = '';
    closeAdBtn.style.display = 'none';
    
    // Generate random ad duration between 5-10 seconds
    const adDuration = Math.floor(Math.random() * 6) + 5;
    const totalSteps = adDuration * 20; // Update 20 times per second
    const stepIncrement = 100 / totalSteps;
    let currentStep = 0;
    
    // Generate random reward between 10-25 points
    const reward = Math.floor(Math.random() * 16) + 10;
    
    // Start progress animation
    const adInterval = setInterval(() => {
        currentStep++;
        const progress = stepIncrement * currentStep;
        progressBar.style.width = `${progress}%`;
        
        // When ad is complete
        if (currentStep >= totalSteps) {
            clearInterval(adInterval);
            
            // Update user points
            currentUser.points += reward;
            saveUserData(currentUser);
            
            // Show reward message and close button
            rewardMessage.textContent = `You earned ${reward} points!`;
            closeAdBtn.style.display = 'inline-block';
            
            // Update UI elements
            updatePointsDisplay();
            
            // Show notification
            showNotification(`Congratulations! You earned ${reward} points from watching an ad!`, 'success');
        }
    }, 50);
    
    // Set up close button
    closeAdBtn.addEventListener('click', () => {
        adOverlay.style.display = 'none';
    });
}

// Navigation Functions with Transitions
function navigateTo(sectionLoader) {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;

    // Add exit animation class
    contentDiv.classList.add('section-exit');

    // Wait for animation to roughly finish, then load new content
    setTimeout(() => {
        sectionLoader(); // Call the function like loadHome(), loadProfile()
        
        // Remove exit class, add enter class for new content
        contentDiv.classList.remove('section-exit');
        contentDiv.classList.add('section-enter');
        
        // Clean up entrance animation class
        setTimeout(() => {
            contentDiv.classList.remove('section-enter');
        }, 400); // Match CSS transition duration

    }, 200); // Slightly less than CSS transition duration
}

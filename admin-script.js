/**
 * Admin Dashboard Script - Compact Version
 * For "Watch Ads Earn Money" Website
 */

// --- Global Error Catcher ---
window.onerror = function(message, source, lineno, colno, error) {
  console.error("GLOBAL ERROR CATCHER:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
  alert(`A script error occurred! Check the console. Error: ${message}`);
  return true; // Prevents the default browser error handling
};

// Global data stores
let currentUser = null;
let users = [];
let withdrawalRequests = [];
let notifications = [];
let supportTickets = [];
const adminCredentials = { username: 'admin', password: 'admin123' };
let charts = { userActivity: null, pointsDistribution: null, withdrawalStatus: null };

// Initialize the dashboard when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    
    // Initialize admin variables
    window.users = [];
    window.withdrawalRequests = [];
    window.supportTickets = [];
    window.adminNotifications = [];
    
    // Get DOM elements
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    
    // Add storage event listener for real-time data updates
    window.addEventListener('storage', handleStorageChange);
    
    // Setup login form event listener
    if (loginForm) {
        console.log("Setting up login form event listener");
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Login form submitted");
            
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            // Hardcoded credentials for immediate login
            if ((username === "JAYHACKER" && password === "JAYHACKER") || 
                (username === "admin" && password === "admin")) {
                console.log("Login successful - credentials match");
                
                // Store login state
                localStorage.setItem('adminLoggedIn', 'true');
                
                // Show dashboard
                loginContainer.style.display = 'none';
                adminDashboard.style.display = 'grid';
                
                // Initialize dashboard
    loadAllUsersData();
        initAdminDashboard();
                
                // Show success message
                showNotification("Login successful!", "success");
    } else {
                console.log("Login failed - credentials do not match");
                showNotification("Login failed. Use username: JAYHACKER, password: JAYHACKER", "error");
            }
        });
    } else {
        console.error("Login form not found!");
    }
    
    // Check if already logged in
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        console.log("Admin already logged in, showing dashboard");
        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'grid';
        
        // Initialize dashboard
            loadAllUsersData();
        initAdminDashboard();
    } else {
        console.log("Admin not logged in, showing login form");
        loginContainer.style.display = 'flex';
        adminDashboard.style.display = 'none';
    }
});

// Enhanced Handle Storage Change for Real-Time Updates
function handleStorageChange(event) {
    console.log("[RealTime] Storage change detected:", event.key);

    try {
        // --- User Data Updates ---
        const userKeys = new Set(['appUsers', 'users', 'allUsers']); // Standard key is now appUsers
        if (userKeys.has(event.key)) {
            console.log(`[RealTime] User data change detected via key: ${event.key}.`);
            const oldUsers = JSON.parse(event.oldValue || '[]') || [];
            const newUsersData = localStorage.getItem(event.key);
            const newUsers = JSON.parse(newUsersData || '[]') || [];

            // Update global users array consistently
            window.users = newUsers.map(user => {
                // Basic enrichment for admin panel needs
                if (!user.id && user.userId) user.id = user.userId; // Normalize ID
                if (!user.status) user.status = 'active';
                if (!user.referralCode) user.referralCode = generateRandomReferralCode();
                if (!user.avatar && user.name) user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
                return user;
            });

            // --- CRITICAL CHANGE: Only save back if the *source* key was NOT 'appUsers' ---
            // This prevents an infinite loop where reading 'appUsers' triggers writing to 'appUsers'
            if (event.key !== 'appUsers') {
                 console.log(`[RealTime] Data came from alternate key '${event.key}'. Syncing to standard key 'appUsers'.`);
                 localStorage.setItem('appUsers', JSON.stringify(window.users)); // Save to standard key
            } else {
                 console.log(`[RealTime] Data came from standard key 'appUsers'. No need to resave.`);
            }

            // Check for genuinely new users (compare IDs)
            const addedUsers = newUsers.filter(newUser =>
                !oldUsers.some(oldUser => (oldUser.id || oldUser.userId) === (newUser.id || newUser.userId))
            );

            if (addedUsers.length > 0) {
                console.log(`[RealTime] Detected ${addedUsers.length} new user(s).`);
                addedUsers.forEach(user => {
                    createNotification({
                        type: 'user',
                        title: 'New User Joined',
                        message: `${user.name || 'A new user'} (${user.email || user.mobile || user.id}) has registered.`,
                    });
                });
                playNotificationSound('user');
            }

            // Refresh relevant UI parts
            updateStatistics(); // Always update stats
            const activeSection = document.querySelector('.nav-btn.active')?.dataset?.section;
            if (activeSection === 'user-management') {
                loadUserManagement(true); // Pass true to highlight new users
            } else if (activeSection === 'dashboard-overview') {
                initializeCharts(); // Update charts potentially affected by user count
            }
        }

        // --- Withdrawal Requests Updates ---
        else if (event.key === 'withdrawalRequests') {
            console.log("[RealTime] Withdrawal request change detected.");
            const oldRequests = JSON.parse(event.oldValue || '[]') || [];
            const newRequestsData = localStorage.getItem(event.key);
            window.withdrawalRequests = JSON.parse(newRequestsData || '[]') || [];

            const addedRequests = window.withdrawalRequests.filter(newReq =>
                !oldRequests.some(oldReq => oldReq.id === newReq.id) && newReq.status === 'pending' // Only notify for new *pending* requests
            );

            if (addedRequests.length > 0) {
                console.log(`[RealTime] Detected ${addedRequests.length} new *pending* withdrawal request(s).`);
                addedRequests.forEach(request => {
                    const user = window.users.find(u => u.id === request.userId);
                    createNotification({
                        type: 'withdrawal',
                        title: 'New Withdrawal Request',
                        message: `${user ? user.name : 'User ' + request.userId.slice(-4)} requested ${request.currency || '₹'}${request.amount.toFixed(2)}.`, // Use slice for unknown user ID
                    });
                });
                playNotificationSound('withdrawal');
            }

            // Refresh relevant UI parts
            updateStatistics(); // Update pending withdrawal count
            const activeSection = document.querySelector('.nav-btn.active')?.dataset?.section;
            if (activeSection === 'withdrawal-management') {
                loadWithdrawalRequests(true); // Pass true to highlight new requests
            } else if (activeSection === 'dashboard-overview') {
                initializeCharts(); // Update withdrawal charts
                updateWithdrawalSummary(); // Update summary cards
            }
        }

        // --- Support Tickets Updates ---
        else if (event.key === 'supportTickets') {
            console.log("[RealTime] Support ticket change detected.");
            const oldTickets = JSON.parse(event.oldValue || '[]') || [];
            const newTicketsData = localStorage.getItem(event.key);
            window.supportTickets = JSON.parse(newTicketsData || '[]') || [];

            const addedTickets = window.supportTickets.filter(newTicket =>
                !oldTickets.some(oldTicket => oldTicket.id === newTicket.id) && newTicket.status === 'open' // Only notify for new *open* tickets
            );

            if (addedTickets.length > 0) {
                console.log(`[RealTime] Detected ${addedTickets.length} new *open* support ticket(s).`);
                addedTickets.forEach(ticket => {
                    const user = window.users.find(u => u.id === ticket.userId);
                    createNotification({
                        type: 'ticket',
                        title: 'New Support Ticket',
                        message: `From ${user ? user.name : 'User ' + ticket.userId.slice(-4)}: "${ticket.subject || ticket.title || 'New Inquiry'}"`,
                    });
                });
                playNotificationSound('ticket');
            }

            // Refresh relevant UI parts
            const activeSection = document.querySelector('.nav-btn.active')?.dataset?.section;
            if (activeSection === 'tickets-management') {
                loadTicketsManagement(true); // Pass true to highlight new tickets
            }
        }

        // --- Admin Notifications Update ---
        else if (event.key === 'adminNotifications') {
            console.log("[RealTime] Admin notifications change detected.");
            loadNotificationsData(); // Reload admin notifications
            updateNotificationCount(); // Update the bell badge
            const activeSection = document.querySelector('.nav-btn.active')?.dataset?.section;
             if (activeSection === 'notifications-management') {
                 loadNotificationsManagement(); // Refresh the notification center if active
             }
        }

    } catch (error) {
        console.error("[RealTime] Error processing storage change for key:", event.key, error);
        // Avoid spamming notifications for parsing errors
    }
}

// Load dashboard overview
function loadDashboardOverview() {
    console.log("Loading dashboard overview...");
    
    // Update statistics
    updateStatistics();
    
    // Initialize charts if they don't exist
    if (!charts.userActivity || !charts.pointsDistribution || !charts.withdrawalStatus) {
        initializeCharts();
    }
    
    console.log("Dashboard overview loaded successfully");
}

// Initialize the admin dashboard
function initAdminDashboard() {
    console.log("Initializing admin dashboard...");
    
    // Load all data
    loadAllUsersData();
    loadWithdrawalData();
    loadSupportTicketsData();
    loadNotificationsData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup navigation
    setupNavigation();
    
    // Show dashboard overview section by default
    showSection('dashboard-overview');
    
    // Initialize charts
    initializeCharts();
    
    // Start real-time data synchronization
    startRealTimeSync();
    
    // Check if we need to sync with main site
    syncWithMainSite();
    
    console.log("Admin dashboard initialized successfully!");
}

// Setup navigation for the admin dashboard
function setupNavigation() {
    console.log("Setting up navigation");
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get section to load
            const section = this.getAttribute('data-section');
            console.log("Navigation button clicked:", section);
            
            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update section title
            const sectionTitle = this.querySelector('span').textContent;
            const titleElement = document.getElementById('section-title');
            if (titleElement) {
                titleElement.textContent = sectionTitle;
            }
            
            // Show selected section
            showSection(section);
        });
    });
}

// Show a specific section of the dashboard
function showSection(sectionId) {
    console.log("Showing section:", sectionId);
    
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        
        // Load section specific content
        switch(sectionId) {
            case 'dashboard-overview': 
                loadDashboardOverview(); 
                break;
            case 'user-management': 
                loadUserManagement();
                break;
            case 'withdrawal-management': 
                loadWithdrawalRequests(); 
                break;
            case 'notifications-management':
                loadNotificationsManagement();
                break;
            case 'tickets-management': 
                loadTicketsManagement();
                break;
        }
    } else {
        console.error(`Section with ID "${sectionId}" not found`);
    }
}

// Update statistics on dashboard
function updateStatistics() {
    console.log("Updating dashboard statistics...");
    
    try {
        // Make sure we have fresh data
        loadAllUsersData();
        loadWithdrawalData();
        
        // Calculate statistics
        const totalUsers = window.users.length;
        const activeUsers = window.users.filter(user => user.status === 'active').length;
        const totalPoints = window.users.reduce((sum, user) => sum + (user.points || 0), 0);
        const totalAdsWatched = window.users.reduce((sum, user) => sum + (user.adsWatched || 0), 0);
        const pendingWithdrawals = window.withdrawalRequests.filter(req => req.status === 'pending').length;
        const completedWithdrawals = window.withdrawalRequests.filter(req => req.status === 'approved').length;
        
        // Today's and weekly stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        
        const todayWithdrawals = window.withdrawalRequests
            .filter(req => new Date(req.date) >= todayStart)
            .reduce((sum, req) => sum + req.amount, 0);
            
        const weekWithdrawals = window.withdrawalRequests
            .filter(req => new Date(req.date) >= weekStart)
            .reduce((sum, req) => sum + req.amount, 0);
        
        // Update UI elements
        updateElement('total-users', totalUsers);
        updateElement('active-users', activeUsers);
        updateElement('total-points', totalPoints);
        updateElement('total-ads', totalAdsWatched);
        updateElement('pending-withdrawals', pendingWithdrawals);
        updateElement('completed-withdrawals', completedWithdrawals);
        
        // Update trends (just placeholders for now)
        updateElement('users-trend', '+5%');
        updateElement('active-users-trend', '+3%');
        updateElement('points-trend', '+12%');
        updateElement('ads-trend', '+8%');
        
        // Update withdrawal summary if it exists
        updateElement('today-withdrawal', `₹${todayWithdrawals.toFixed(2)}`);
        updateElement('week-withdrawal', `₹${weekWithdrawals.toFixed(2)}`);
        
        // Calculate success rate
        const totalProcessed = window.withdrawalRequests.filter(req => req.status === 'approved' || req.status === 'rejected').length;
        const successRate = totalProcessed > 0 ? 
            ((window.withdrawalRequests.filter(req => req.status === 'approved').length / totalProcessed) * 100).toFixed(0) : 
            '0';
        updateElement('success-rate', `${successRate}%`);
        
        console.log("Statistics updated successfully");
    } catch (error) {
        console.error("Error updating statistics:", error);
    }
}

// Helper function to update an element's text content
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Initialize charts for dashboard
function initializeCharts() {
    console.log("Initializing dashboard charts...");
    
    try {
        // User Activity Chart
        const userActivityCtx = document.getElementById('user-activity-chart');
        if (userActivityCtx) {
            if (charts.userActivity) {
                charts.userActivity.destroy();
            }
            
            charts.userActivity = new Chart(userActivityCtx, {
                type: 'line',
                data: {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                    datasets: [
                        {
                            label: 'Active Users',
                            data: [65, 72, 68, 84, 93, 87, 95],
                            borderColor: '#6c5ce7',
                            backgroundColor: 'rgba(108, 92, 231, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Ads Watched',
                            data: [42, 38, 51, 47, 62, 69, 81],
                            borderColor: '#00b894',
                            backgroundColor: 'rgba(0, 184, 148, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                    }
                });
            }
        
        // Points Distribution Chart
        const pointsDistributionCtx = document.getElementById('points-distribution-chart');
        if (pointsDistributionCtx) {
            if (charts.pointsDistribution) {
                charts.pointsDistribution.destroy();
            }
            
            charts.pointsDistribution = new Chart(pointsDistributionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Ad Watching', 'Referrals', 'Daily Bonus', 'Tasks'],
                    datasets: [{
                        data: [45, 25, 20, 10],
                        backgroundColor: [
                            '#6c5ce7',
                            '#00b894',
                            '#fdcb6e',
                            '#e17055'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                }
            });
        }
        
        // Withdrawal Status Chart
        const withdrawalStatusCtx = document.getElementById('withdrawal-status-chart');
        if (withdrawalStatusCtx) {
            if (charts.withdrawalStatus) {
                charts.withdrawalStatus.destroy();
            }
            
            const pendingCount = window.withdrawalRequests.filter(req => req.status === 'pending').length;
            const approvedCount = window.withdrawalRequests.filter(req => req.status === 'approved').length;
            const rejectedCount = window.withdrawalRequests.filter(req => req.status === 'rejected').length;
            
            charts.withdrawalStatus = new Chart(withdrawalStatusCtx, {
                type: 'pie',
                data: {
                    labels: ['Pending', 'Approved', 'Rejected'],
                    datasets: [{
                        data: [pendingCount, approvedCount, rejectedCount],
                        backgroundColor: [
                            '#fdcb6e',  // Yellow for pending
                            '#00b894',  // Green for approved
                            '#e17055'   // Red for rejected
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }
                    }
                }
            });
        }
        
        console.log("Charts initialized successfully");
    } catch (error) {
        console.error("Error initializing charts:", error);
    }
}

// Sync data with main site
function syncWithMainSite() {
    console.log("Attempting to sync with main site data...");

    // Check for data from main site
    const mainSiteDataKeys = [
        { adminKey: 'appUsers', mainSiteKeys: ['appUsers', 'users', 'allUsers'] },
        { adminKey: 'withdrawalRequests', mainSiteKeys: ['withdrawalRequests', 'pendingWithdrawals'] },
        { adminKey: 'supportTickets', mainSiteKeys: ['supportTickets', 'userTickets'] }
    ];

    let syncedData = false;

    // Try to sync each data type
    mainSiteDataKeys.forEach(dataMapping => {
        const { adminKey, mainSiteKeys } = dataMapping;

        for (const mainSiteKey of mainSiteKeys) {
            const mainSiteData = localStorage.getItem(mainSiteKey);

            if (mainSiteData) {
                try {
                    const parsedData = JSON.parse(mainSiteData);

                    if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                        console.log(`Found data in main site key "${mainSiteKey}", syncing to admin key "${adminKey}"`);

                        if (adminKey === 'appUsers') {
                            const enrichedUsers = parsedData.map(user => {
                                // ... existing enrichment logic ...
                                return user;
                            });

                            localStorage.setItem(adminKey, JSON.stringify(enrichedUsers));
                            window.users = enrichedUsers;
                        } else {
                            localStorage.setItem(adminKey, mainSiteData);
                            window[adminKey] = parsedData;
                        }

                        syncedData = true;
                        break;
                    }
                } catch (error) {
                    console.error(`Error parsing data from main site key "${mainSiteKey}":`, error);
                }
            }
        }
    });

    if (syncedData) {
        console.log("Successfully synced data with main site");
        showNotification("Successfully synced with main site data", "success");
        
        // Refresh UI with synced data
        refreshAdminUI();
    } else {
        console.log("No main site data found to sync with");
    }
}

// Refresh the admin UI with the latest data
function refreshAdminUI() {
    console.log("Refreshing admin UI...");
    
    // Update statistics
    updateStatistics();
    
    // Refresh the current section
    const activeSection = document.querySelector('.nav-btn.active');
    if (activeSection) {
        const sectionId = activeSection.getAttribute('data-section');
        showSection(sectionId);
    } else {
        // If no active section, show dashboard overview
        showSection('dashboard-overview');
    }
    
    // Initialize charts with updated data
    initializeCharts();
}

// Start real-time data synchronization
function startRealTimeSync() {
    console.log("Starting real-time data synchronization...");
    
    // Clear any existing interval
    if (window.syncInterval) {
        clearInterval(window.syncInterval);
    }
    
    // Set up a sync interval (every 5 seconds)
    window.syncInterval = setInterval(() => {
        refreshAdminData();
    }, 5000);
    
    // Add a message indicating real-time sync is active
    const header = document.querySelector('.header');
    if (header) {
        const syncIndicator = document.createElement('div');
        syncIndicator.className = 'sync-indicator';
        syncIndicator.innerHTML = '<span class="sync-dot"></span> Real-time sync active';
        syncIndicator.style.fontSize = '12px';
        syncIndicator.style.color = '#4CAF50';
        syncIndicator.style.marginLeft = '10px';
        
        const headerTitle = header.querySelector('#section-title');
        if (headerTitle) {
            headerTitle.appendChild(syncIndicator);
        }
    }
    
    console.log("Real-time data synchronization started");
}

// Refresh all admin data from localStorage
function refreshAdminData() {
    console.log("Refreshing admin data from localStorage...");
    loadAllUsersData();
    loadWithdrawalData();
    loadSupportTicketsData();
    loadNotificationsData();
    updateStatistics();
    
    // Set up interval for real-time data refresh
    if (!window.dataRefreshInterval) {
        window.dataRefreshInterval = setInterval(() => {
            console.log("Auto-refreshing admin data...");
            loadAllUsersData();
            loadWithdrawalData();
            loadSupportTicketsData();
            loadNotificationsData();
            
            // Update the current view based on which section is active
            const activeSection = document.querySelector('.nav-btn.active');
            if (activeSection) {
                const section = activeSection.getAttribute('data-section');
                if (section === 'user-management') {
                    loadUserManagement();
                } else if (section === 'withdrawal-management') {
                    loadWithdrawalRequests();
                } else if (section === 'dashboard-overview') {
                    updateStatistics();
                    if (charts.userActivity) charts.userActivity.update();
                    if (charts.pointsDistribution) charts.pointsDistribution.update();
                    if (charts.withdrawalStatus) charts.withdrawalStatus.update();
                }
            }
        }, 10000); // Refresh every 10 seconds
    }
}

// Load all users data from localStorage
function loadAllUsersData() {
    console.log("Loading all users data from localStorage...");
    try {
        let userData = localStorage.getItem('appUsers');

        if (!userData || JSON.parse(userData).length === 0) {
            const alternateKeys = ['users', 'allUsers', 'currentUsers'];
            for (const key of alternateKeys) {
                userData = localStorage.getItem(key);
                if (userData && JSON.parse(userData).length > 0) {
                    console.log(`Found users in fallback key '${key}', saving to standard key 'appUsers'.`);
                    localStorage.setItem('appUsers', userData);
                    break;
                }
            }
        }

        if (userData) {
            window.users = JSON.parse(userData);
            console.log(`Loaded ${window.users.length} users from localStorage (key 'appUsers')`);

            let enrichmentNeeded = false;
            window.users = window.users.map(user => {
                let changed = false;
                // ... existing enrichment logic ...
                 if (!user.id && user.userId) { user.id = user.userId; changed = true; }
                 if (!user.status) { user.status = 'active'; changed = true; }
                 if (!user.referralCode) { user.referralCode = generateRandomReferralCode(); changed = true; }
                 if (!user.avatar) { user.avatar = `https://api.dicebear.com/6.x/identicon/svg?seed=${user.name || user.id || 'unknown'}`; changed = true; }
                 if (user.points === undefined || user.points === null) { user.points = 0; changed = true; }
                 if (!user.adsWatched) { user.adsWatched = 0; changed = true; }
                 if (changed) enrichmentNeeded = true;
                return user;
            });

            if (enrichmentNeeded) {
                 console.log("Enriched user data, saving back to 'appUsers' key.");
                 localStorage.setItem('appUsers', JSON.stringify(window.users));
            }
        } else {
            console.log("No users found in localStorage (tried 'appUsers' and fallbacks), loading mock data");
            window.users = [];
            loadMockData();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        window.users = [];
        loadMockData();
    }
}

// Load mock data for demonstration purposes
function loadMockData() {
    console.log("Loading mock data...");
    
    // Only load mock data if there are no real users
    if (window.users.length === 0) {
        generateMockUsers(5);
    }
    
    // Add mock withdrawals if none exist
    if (window.withdrawalRequests.length === 0) {
        generateMockWithdrawals();
    }
    
    // Add mock support tickets if none exist
    if (window.supportTickets.length === 0) {
        generateMockSupportTickets();
    }
    
    console.log("Mock data loaded successfully");
}

// Generate mock users for testing
function generateMockUsers(count) {
    console.log(`Generating ${count} mock users...`);
    
    const names = ["John Smith", "Alice Johnson", "Bob Williams", "Emma Brown", "David Miller", "Sarah Davis", "Michael Wilson", "Olivia Jones", "James Taylor", "Sophia Anderson"];
    const statuses = ["active", "active", "active", "suspended", "pending"];
    
    for (let i = 0; i < count; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        const email = name.toLowerCase().replace(' ', '.') + '@example.com';
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const randomDays = Math.floor(Math.random() * 30);
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - randomDays);
        
        const user = {
            id: 'user_' + Date.now() + '_' + i,
            name: name,
            email: email,
            mobile: '123456789' + i,
            points: Math.floor(Math.random() * 1000),
            adsWatched: Math.floor(Math.random() * 50),
            totalAdsWatched: Math.floor(Math.random() * 50),
            dailyStreakCount: Math.floor(Math.random() * 10),
            streak: Math.floor(Math.random() * 10),
            status: status,
            referralCode: generateRandomReferralCode(),
            createdAt: joinDate.toISOString(),
            joinDate: joinDate.toISOString(),
            lastActive: new Date().toISOString(),
            avatar: 'https://api.dicebear.com/6.x/identicon/svg?seed=' + name,
            appliedReferrals: [],
            activityLog: [
                {
                    action: 'Account created',
                    timestamp: joinDate.toISOString()
                }
            ]
        };
        
        // Add to users array
        window.users.push(user);
    }
    
    // Save to localStorage using 'appUsers' key
    localStorage.setItem('appUsers', JSON.stringify(window.users));
    console.log(`Generated ${count} mock users successfully (saved to 'appUsers')`);
}

// Generate a random referral code
function generateRandomReferralCode() {
    console.log("[Admin] Generating unique referral code");
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 6;
    
    // Load existing users to check for code uniqueness
    let existingUsers = [];
    try {
        const userData = localStorage.getItem('appUsers');
        if (userData) {
            existingUsers = JSON.parse(userData);
        }
    } catch (error) {
        console.error("[Admin] Error loading users for referral code check:", error);
    }
    
    // Extract existing referral codes
    const existingCodes = new Set(existingUsers.map(user => 
        user.referralCode || '').filter(code => code.length > 0));
    
    console.log(`[Admin] Found ${existingCodes.size} existing referral codes`);
    
    // Generate a unique code (max 10 attempts to avoid infinite loop in case of issues)
    let attempts = 0;
    let code;
    
    do {
        attempts++;
        code = '';
        // Generate a random code
        for (let i = 0; i < codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            code += characters.charAt(randomIndex);
        }
        
        // If we've tried 10 times and can't find a unique code, add timestamp to ensure uniqueness
        if (attempts > 10) {
            const timestamp = Date.now().toString().slice(-4);
            code = code.substring(0, codeLength - 4) + timestamp;
            console.warn("[Admin] Had to use timestamp to ensure unique code:", code);
            break;
        }
    } while (existingCodes.has(code));
    
    console.log(`[Admin] Generated unique referral code: ${code} (attempts: ${attempts})`);
    return code;
}

// Generate mock withdrawal requests for testing
function generateMockWithdrawals() {
    console.log("Generating mock withdrawal requests...");
    
    const methods = ["PayPal", "Bank Transfer", "UPI"];
    const statuses = ["pending", "pending", "pending"]; // Make all pending for testing
    
    // Generate only 3 mock withdrawal requests instead of 10
    for (let i = 0; i < 3; i++) {
        const userId = window.users.length > 0 ? 
            window.users[Math.floor(Math.random() * window.users.length)].id : 
            'user_unknown';
            
        const amount = Math.floor(Math.random() * 100) + 20;
        const requestDate = new Date();
        requestDate.setDate(requestDate.getDate() - i); // Recent dates for better testing
        
        const withdrawal = {
            id: 'withdrawal_' + Date.now() + '_' + i,
            userId: userId,
            amount: amount,
            method: methods[i % methods.length], // Cycle through methods
            account: 'account_' + Math.floor(Math.random() * 1000),
            date: requestDate.toISOString(),
            status: statuses[i % statuses.length],
            currency: '₹', // Use Indian Rupee symbol
            notes: i === 0 ? 'Test withdrawal request for approval/rejection testing' : ''
        };
        
        // Add to withdrawal requests array
        window.withdrawalRequests.push(withdrawal);
    }
    
    // Save to localStorage
    localStorage.setItem('withdrawalRequests', JSON.stringify(window.withdrawalRequests));
    console.log("Generated mock withdrawal requests successfully");
}

// Generate mock support tickets for testing
function generateMockSupportTickets() {
    console.log("Generating mock support tickets...");
    
    const subjects = [
        "Payment not received", 
        "Can't watch ads", 
        "Login issues", 
        "Points not credited", 
        "Referral code not working",
        "Need help with withdrawal",
        "Account suspended issue",
        "App crashing on my device",
        "How to earn more points?",
        "Forgot my password"
    ];
    
    const statuses = ["open", "answered", "closed"];
    
    // Generate 8 mock support tickets
    for (let i = 0; i < 8; i++) {
        const userId = window.users.length > 0 ? 
            window.users[Math.floor(Math.random() * window.users.length)].id : 
            'user_unknown';
            
        const randomDays = Math.floor(Math.random() * 30);
        const ticketDate = new Date();
        ticketDate.setDate(ticketDate.getDate() - randomDays);
        
        const ticket = {
            id: 'ticket_' + Date.now() + '_' + i,
            userId: userId,
            title: subjects[Math.floor(Math.random() * subjects.length)],
            date: ticketDate.toISOString(),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            messages: [
                {
                    from: 'user',
                    text: 'I am having an issue with ' + subjects[Math.floor(Math.random() * subjects.length)].toLowerCase() + '. Please help me resolve this as soon as possible.',
                    timestamp: ticketDate.toISOString()
                }
            ]
        };
        
        // Add admin response to some tickets
        if (ticket.status === 'answered' || ticket.status === 'closed') {
            const responseDate = new Date(ticketDate);
            responseDate.setHours(responseDate.getHours() + Math.floor(Math.random() * 24) + 1);
            
            ticket.messages.push({
                from: 'admin',
                text: 'Thank you for contacting support. We are looking into this issue and will get back to you shortly.',
                timestamp: responseDate.toISOString()
            });
            
            // Add a follow-up for closed tickets
            if (ticket.status === 'closed') {
                const closeDate = new Date(responseDate);
                closeDate.setHours(closeDate.getHours() + Math.floor(Math.random() * 24) + 1);
                
                ticket.messages.push({
                from: 'admin',
                    text: 'This issue has been resolved. Thank you for your patience.',
                    timestamp: closeDate.toISOString()
                });
            }
        }
        
        // Add to support tickets array
        window.supportTickets.push(ticket);
    }
    
    // Save to localStorage
    localStorage.setItem('supportTickets', JSON.stringify(window.supportTickets));
    console.log("Generated mock support tickets successfully");
}

// Setup event listeners
function setupEventListeners() {
    console.log("Setting up admin dashboard event listeners");
    
    // Handle document-level delegated events for withdrawal buttons
    document.addEventListener('click', function(event) {
        // Approve withdrawal button handling
        if (event.target.closest('.approve-btn')) {
            const requestId = event.target.closest('[data-request-id]')?.getAttribute('data-request-id');
            if (requestId) {
                console.log("Approve button clicked for request:", requestId);
                approveWithdrawal(requestId);
            } else {
                console.error("Could not find request ID for approval");
                showNotification("Error: Could not process approval", "error");
            }
        }
        
        // Reject withdrawal button handling
        else if (event.target.closest('.reject-btn')) {
            const requestId = event.target.closest('[data-request-id]')?.getAttribute('data-request-id');
            if (requestId) {
                console.log("Reject button clicked for request:", requestId);
                rejectWithdrawal(requestId);
            } else {
                console.error("Could not find request ID for rejection");
                showNotification("Error: Could not process rejection", "error");
            }
        }
        
        // View withdrawal details button handling
        else if (event.target.closest('.view-btn')) {
            const requestId = event.target.closest('[data-request-id]')?.getAttribute('data-request-id');
            if (requestId) {
                console.log("View details button clicked for request:", requestId);
                viewWithdrawalDetails(requestId);
    } else {
                console.error("Could not find request ID for viewing details");
                showNotification("Error: Could not load withdrawal details", "error");
            }
        }
    });
    
    // Export users data button
    const exportUsersBtn = document.getElementById('export-users-btn');
    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', exportUsersData);
    }
    
    // Mark all notifications as read button
    const markAllReadBtn = document.getElementById('mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsRead);
    }
    
    // Apply notification filter
    const notificationFilter = document.getElementById('notification-filter');
    if (notificationFilter) {
        notificationFilter.addEventListener('change', function() {
            loadNotificationsManagement();
        });
    }
    
    // Apply withdrawal filter
    const withdrawalFilter = document.getElementById('withdrawal-filter');
    if (withdrawalFilter) {
        withdrawalFilter.addEventListener('change', function() {
            loadWithdrawalRequests();
        });
    }
    
    // Apply user filter
    const userSortOptions = document.getElementById('user-sort-options');
    if (userSortOptions) {
        userSortOptions.addEventListener('change', function() {
            loadUserManagement();
        });
    }
    
    // Notification bell click
    const notificationBell = document.getElementById('header-notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function() {
            const notificationsBtn = document.getElementById('notifications-btn');
            if (notificationsBtn) {
                notificationsBtn.click();
            }
        });
    }
    
    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // Implement add user functionality
            console.log("Add user button clicked");
            showNotification("Add user functionality not implemented yet", "info");
        });
    }
    
    // Theme switch
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            document.body.classList.toggle('light-theme');
            localStorage.setItem('admin-theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
        });
        
        // Apply saved theme
        if (localStorage.getItem('admin-theme') === 'light') {
            document.body.classList.add('light-theme');
            themeSwitch.checked = true;
        }
    }
    
    console.log("Event listeners setup complete");
}

// Export users data to CSV
function exportUsersData() {
    console.log("Exporting users data...");
    
    if (!window.users || window.users.length === 0) {
        showNotification("No users to export", "error");
        return;
    }
    
    try {
        // Define CSV headers
        const headers = [
            "ID", "Name", "Email", "Mobile", "Points", 
            "Ads Watched", "Referral Code", "Status", "Join Date"
        ];
        
        // Convert users to CSV rows
        const rows = window.users.map(user => [
            user.id,
            user.name,
            user.email || 'N/A',
            user.mobile || 'N/A',
            user.points || 0,
            user.adsWatched || 0,
            user.referralCode || 'N/A',
            user.status || 'active',
            formatDate(user.joinDate || user.createdAt || new Date().toISOString())
        ]);
        
        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Create a blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `users_${formatDate(new Date().toISOString())}.csv`);
        link.style.display = 'none';
        
        // Add to document, click to download, then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification("Users data exported successfully", "success");
    } catch (error) {
        console.error("Error exporting users data:", error);
        showNotification("Error exporting users data: " + error.message, "error");
    }
}

// Fix approve withdrawal function
function approveWithdrawal(requestId) {
    console.log("Approving withdrawal request:", requestId);
    
    // Validate input
    if (!requestId) {
        console.error("No request ID provided");
        showNotification("Error: Could not approve withdrawal", "error");
        return;
    }
    
    // Get fresh data
    loadWithdrawalData();
    
    // Find withdrawal request
    const requestIndex = window.withdrawalRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
        console.error("Withdrawal request not found with ID:", requestId);
        showNotification("Error: Withdrawal request not found", "error");
        return;
    }
    
    // Show confirmation dialog
    showConfirmDialog(
        "Approve Withdrawal", 
        `Are you sure you want to approve this withdrawal request for ${window.withdrawalRequests[requestIndex].currency || '₹'}${window.withdrawalRequests[requestIndex].amount.toFixed(2)}?`,
        () => {
            try {
                // Process approval
                console.log("Confirming withdrawal approval for request:", requestId);
                
                // Update request status
                window.withdrawalRequests[requestIndex].status = 'approved';
                window.withdrawalRequests[requestIndex].processedDate = new Date().toISOString();
                window.withdrawalRequests[requestIndex].processedBy = 'admin';
                
                // Save to localStorage
                localStorage.setItem('withdrawalRequests', JSON.stringify(window.withdrawalRequests));
                
                // Create notification for admin
                createNotification({
                    type: 'withdrawal',
                    title: 'Withdrawal Approved',
                    message: `You approved withdrawal request #${requestId.substring(0, 8)} for ${window.withdrawalRequests[requestIndex].currency || '₹'}${window.withdrawalRequests[requestIndex].amount.toFixed(2)}`
                });
                
                // Update UI
                loadWithdrawalRequests();
                updateWithdrawalSummary();
                
                // Show success notification
                showNotification("Withdrawal request approved successfully", "success");
            } catch (error) {
                console.error("Error during withdrawal approval:", error);
                showNotification("Error: Approval process failed", "error");
            }
        }
    );
}

// Fix reject withdrawal function
function rejectWithdrawal(requestId) {
    console.log("Rejecting withdrawal request:", requestId);
    
    // Validate input
    if (!requestId) {
        console.error("No request ID provided");
        showNotification("Error: Could not reject withdrawal", "error");
        return;
    }
    
    // Get fresh data
    loadWithdrawalData();
    loadAllUsersData();
    
    // Find withdrawal request
    const requestIndex = window.withdrawalRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
        console.error("Withdrawal request not found with ID:", requestId);
        showNotification("Error: Withdrawal request not found", "error");
        return;
    }
    
    // Get request and user details
    const request = window.withdrawalRequests[requestIndex];
    const user = window.users.find(u => u.id === request.userId);
    
    if (!user) {
        console.error("User not found for withdrawal request:", requestId);
        showNotification("Error: User not found for this withdrawal", "error");
        return;
    }
    
    // Create modal for rejection reason
    const rejectDialog = document.createElement('div');
    rejectDialog.className = 'modal-overlay';
    rejectDialog.innerHTML = `
        <div class="modal-content animate__animated animate__fadeInUp">
            <div class="modal-header">
                <h3>Reject Withdrawal</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
        </div>
            <div class="modal-body">
                <p>Are you sure you want to reject this withdrawal request for ${request.currency || '₹'}${request.amount.toFixed(2)}?</p>
                <p>The points will be refunded to the user's account.</p>
                
                <div class="form-group">
                    <label for="reject-reason">Reason for rejection:</label>
                    <textarea id="reject-reason" rows="3" placeholder="Enter reason for rejection"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancel-reject">Cancel</button>
                <button class="btn btn-danger" id="confirm-reject">Reject Withdrawal</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(rejectDialog);
    
    // Add event listeners
    const closeButton = rejectDialog.querySelector('.close-modal');
    const cancelButton = rejectDialog.querySelector('#cancel-reject');
    const confirmButton = rejectDialog.querySelector('#confirm-reject');
    
    // Close dialog function
    const closeDialog = () => {
        rejectDialog.classList.add('fadeOut');
        setTimeout(() => {
            if (document.body.contains(rejectDialog)) {
                document.body.removeChild(rejectDialog);
            }
        }, 300);
    };
    
    closeButton.addEventListener('click', closeDialog);
    cancelButton.addEventListener('click', closeDialog);
    
    confirmButton.addEventListener('click', () => {
        try {
            const reason = document.getElementById('reject-reason').value.trim() || 'No reason provided';
            
            // Process rejection
            console.log("Confirming withdrawal rejection for request:", requestId);
            
            // Calculate points to refund (convert amount back to points)
            const pointsToRefund = Math.floor(request.amount * 100); // Assuming ₹1 = 100 points
            
            // Update user points
            user.points = (user.points || 0) + pointsToRefund;
            
            // Update request status
            request.status = 'rejected';
            request.processedDate = new Date().toISOString();
            request.processedBy = 'admin';
            request.rejectionReason = reason;
            
            // Save to localStorage
            localStorage.setItem('withdrawalRequests', JSON.stringify(window.withdrawalRequests));
            localStorage.setItem('appUsers', JSON.stringify(window.users)); // Use correct key
            
            // Create notification for admin
            createNotification({
                type: 'withdrawal',
                title: 'Withdrawal Rejected',
                message: `You rejected withdrawal request #${requestId.substring(0, 8)} for ${request.currency || '₹'}${request.amount.toFixed(2)}`
            });
            
            // Update UI
            loadWithdrawalRequests();
            updateWithdrawalSummary();
            
            // Show success notification
            showNotification(`Withdrawal request rejected. ${pointsToRefund} points refunded to user.`, "success");
            
            // Close dialog
            closeDialog();
        } catch (error) {
            console.error("Error during withdrawal rejection:", error);
            showNotification("Error: Rejection process failed", "error");
        }
    });
}

// View withdrawal details
function viewWithdrawalDetails(requestId) {
    console.log("Viewing withdrawal details for request:", requestId);
    
    // Validate input
    if (!requestId) {
        console.error("No request ID provided");
        showNotification("Error: Could not view withdrawal details", "error");
        return;
    }
    
    // Make sure we have fresh data
    loadWithdrawalData();
    loadAllUsersData();
    
    // Find withdrawal request
    const request = window.withdrawalRequests.find(req => req.id === requestId);
    if (!request) {
        console.error("Withdrawal request not found with ID:", requestId);
        showNotification("Error: Withdrawal request not found", "error");
        return;
    }
    
    // Find user
    const user = window.users.find(u => u.id === request.userId || u.userId === request.userId);
    const userName = user ? user.name : 'Unknown';
    
    // Format dates
    const requestDate = formatDate(request.date);
    const processedDate = request.processedDate ? formatDate(request.processedDate) : 'N/A';
    
    // Create modal
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal-overlay';
    detailsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Withdrawal Request Details</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="details-group">
                    <span class="details-label">Request ID:</span>
                    <span class="details-value">${request.id}</span>
            </div>
                <div class="details-group">
                    <span class="details-label">User:</span>
                    <span class="details-value">${userName}</span>
            </div>
                <div class="details-group">
                    <span class="details-label">Amount:</span>
                    <span class="details-value">${request.currency || '₹'}${request.amount.toFixed(2)}</span>
            </div>
                <div class="details-group">
                    <span class="details-label">Method:</span>
                    <span class="details-value">${request.method || 'N/A'}</span>
            </div>
                <div class="details-group">
                    <span class="details-label">Account:</span>
                    <span class="details-value">${request.account || 'N/A'}</span>
            </div>
                <div class="details-group">
                    <span class="details-label">Status:</span>
                    <span class="details-value status-badge ${request.status}">${request.status}</span>
                </div>
                <div class="details-group">
                    <span class="details-label">Requested On:</span>
                    <span class="details-value">${requestDate}</span>
                </div>
                <div class="details-group">
                    <span class="details-label">Processed On:</span>
                    <span class="details-value">${processedDate}</span>
                </div>
                ${request.rejectionReason ? `
                <div class="details-group">
                    <span class="details-label">Rejection Reason:</span>
                    <span class="details-value">${request.rejectionReason}</span>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" id="close-details">Close</button>
                ${request.status === 'pending' ? `
                <button class="btn btn-success" id="approve-from-details">Approve</button>
                <button class="btn btn-danger" id="reject-from-details">Reject</button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    
    // Add event listeners
    const closeButton = detailsModal.querySelector('.close-modal');
    const closeDetailsButton = detailsModal.querySelector('#close-details');
    
    const closeModal = () => {
        detailsModal.classList.add('fadeOut');
        setTimeout(() => {
            if (document.body.contains(detailsModal)) {
                document.body.removeChild(detailsModal);
            }
        }, 300);
    };
    
    closeButton.addEventListener('click', closeModal);
    closeDetailsButton.addEventListener('click', closeModal);
    
    // Add approve/reject buttons if pending
    if (request.status === 'pending') {
        const approveButton = detailsModal.querySelector('#approve-from-details');
        const rejectButton = detailsModal.querySelector('#reject-from-details');
        
        approveButton.addEventListener('click', () => {
        closeModal();
            approveWithdrawal(requestId);
        });
        
        rejectButton.addEventListener('click', () => {
            closeModal();
            rejectWithdrawal(requestId);
        });
    }
    
    // Show modal with animation
    setTimeout(() => {
        detailsModal.classList.add('fadeIn');
    }, 10);
}

// Update withdrawal summary
function updateWithdrawalSummary() {
    console.log("Updating withdrawal summary...");
    
    // Calculate statistics
    const totalRequests = window.withdrawalRequests ? window.withdrawalRequests.length : 0;
    const pendingRequests = window.withdrawalRequests ? window.withdrawalRequests.filter(req => req.status === 'pending').length : 0;
    const approvedRequests = window.withdrawalRequests ? window.withdrawalRequests.filter(req => req.status === 'approved').length : 0;
    const rejectedRequests = window.withdrawalRequests ? window.withdrawalRequests.filter(req => req.status === 'rejected').length : 0;
    
    const totalAmount = window.withdrawalRequests ? 
        window.withdrawalRequests.reduce((sum, req) => sum + req.amount, 0) : 0;
    
    const pendingAmount = window.withdrawalRequests ? 
        window.withdrawalRequests.filter(req => req.status === 'pending')
            .reduce((sum, req) => sum + req.amount, 0) : 0;
    
    const approvedAmount = window.withdrawalRequests ? 
        window.withdrawalRequests.filter(req => req.status === 'approved')
            .reduce((sum, req) => sum + req.amount, 0) : 0;
    
    // Update UI
    const pendingCountElement = document.getElementById('pending-count');
    const approvedCountElement = document.getElementById('approved-count');
    const totalCountElement = document.getElementById('total-withdrawal-count');
    const pendingAmountElement = document.getElementById('pending-amount');
    const approvedAmountElement = document.getElementById('approved-amount');
    const totalAmountElement = document.getElementById('total-amount');
    
    if (pendingCountElement) pendingCountElement.textContent = pendingRequests;
    if (approvedCountElement) approvedCountElement.textContent = approvedRequests;
    if (totalCountElement) totalCountElement.textContent = totalRequests;
    
    if (pendingAmountElement) pendingAmountElement.textContent = `₹${pendingAmount.toFixed(2)}`;
    if (approvedAmountElement) approvedAmountElement.textContent = `₹${approvedAmount.toFixed(2)}`;
    if (totalAmountElement) totalAmountElement.textContent = `₹${totalAmount.toFixed(2)}`;
    
    console.log("Withdrawal summary updated successfully");
}

// Show confirmation dialog
function showConfirmDialog(title, message, confirmCallback) {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'modal-overlay';
    dialogOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancel-confirm">Cancel</button>
                <button class="btn btn-primary" id="confirm-action">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialogOverlay);
    
    // Add event listeners
    const closeButton = dialogOverlay.querySelector('.close-modal');
    const cancelButton = dialogOverlay.querySelector('#cancel-confirm');
    const confirmButton = dialogOverlay.querySelector('#confirm-action');
    
    const closeDialog = () => {
        dialogOverlay.classList.add('fadeOut');
        setTimeout(() => {
            if (document.body.contains(dialogOverlay)) {
                document.body.removeChild(dialogOverlay);
            }
        }, 300);
    };
    
    closeButton.addEventListener('click', closeDialog);
    cancelButton.addEventListener('click', closeDialog);
    
    confirmButton.addEventListener('click', () => {
        closeDialog();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // Show dialog with animation
    setTimeout(() => {
        dialogOverlay.classList.add('fadeIn');
    }, 10);
}

// Load withdrawal data from localStorage
function loadWithdrawalData() {
    console.log("Loading withdrawal data from localStorage...");
    try {
        const withdrawalData = localStorage.getItem('withdrawalRequests');
        if (withdrawalData) {
            window.withdrawalRequests = JSON.parse(withdrawalData);
            console.log(`Loaded ${window.withdrawalRequests.length} withdrawal requests from localStorage`);
        } else {
            console.log("No withdrawal requests found in localStorage");
            window.withdrawalRequests = [];
        }
    } catch (error) {
        console.error('Error loading withdrawal data:', error);
        window.withdrawalRequests = [];
    }
}

// Load support tickets data from localStorage
function loadSupportTicketsData() {
    console.log("Loading support tickets data from localStorage...");
    try {
        const ticketsData = localStorage.getItem('supportTickets');
        if (ticketsData) {
            window.supportTickets = JSON.parse(ticketsData);
            console.log(`Loaded ${window.supportTickets.length} support tickets from localStorage`);
        } else {
            console.log("No support tickets found in localStorage");
            window.supportTickets = [];
        }
    } catch (error) {
        console.error('Error loading support tickets data:', error);
        window.supportTickets = [];
    }
}

// Load notifications data from localStorage
function loadNotificationsData() {
    console.log("Loading notifications data from localStorage...");
    try {
        const notificationsData = localStorage.getItem('adminNotifications');
        if (notificationsData) {
            window.adminNotifications = JSON.parse(notificationsData);
            console.log(`Loaded ${window.adminNotifications.length} notifications from localStorage`);
        } else {
            console.log("No notifications found in localStorage");
            window.adminNotifications = [];
        }
        
        // Update notification count
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading notifications data:', error);
        window.adminNotifications = [];
    }
}

// Update notification count badge
function updateNotificationCount() {
    const unreadCount = window.adminNotifications ? 
        window.adminNotifications.filter(n => !n.read).length : 0;
    
    const badge = document.getElementById('notification-count');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Load user management section
function loadUserManagement(highlightNew = false) {
    console.log("Loading user management section...", highlightNew ? "Highlighting new" : "");
    const userTableBody = document.getElementById('user-table-body');
    if (!userTableBody) {
        console.error("User table body not found");
        return;
    }

    const tableWrapper = userTableBody.closest('.table-responsive') || userTableBody.parentElement;
    const currentScroll = tableWrapper.scrollTop; // Get scroll from parent wrapper
    userTableBody.innerHTML = ''; // Clear existing rows
    loadAllUsersData(); // Ensure latest data is loaded into window.users

    if (!window.users || window.users.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="8" class="no-data"><div class="empty-state"><i class="fas fa-users-slash"></i><p>No users found</p></div></td></tr>`;
        return;
    }

    // Sorting logic
    const sortValue = document.getElementById('user-sort-options')?.value || 'date';
    const sortedUsers = sortUserData(window.users, sortValue);

    const fragment = document.createDocumentFragment();
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;

    sortedUsers.forEach(user => {
        const row = createUserRow(user); // Use helper function
        // Check if this user was potentially added in the last few seconds
        const joinTimestamp = new Date(user.joinDate || user.createdAt || 0).getTime();
        if (highlightNew && joinTimestamp > fiveSecondsAgo) {
            row.classList.add('new-item-highlight');
            setTimeout(() => row.classList.remove('new-item-highlight'), 3000); // Remove highlight after 3s
        }
        fragment.appendChild(row);
    });

    userTableBody.appendChild(fragment);
    tableWrapper.scrollTop = currentScroll; // Restore scroll position on parent
    attachUserActionListeners(); // Re-attach listeners using delegation
    console.log(`Loaded ${sortedUsers.length} users into table.`);
}

// Create user row helper
function createUserRow(user) {
    const row = document.createElement('tr');
    row.setAttribute('data-user-id', user.id);
    const joinDate = user.joinDate || user.createdAt || '';
    const formattedDate = joinDate ? formatDate(joinDate) : 'N/A';
    const formattedPoints = (user.points || 0).toLocaleString();
    const status = user.status || 'active';
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&color=fff`;

    // Ensure referralCode is defined
    const referralCode = user.referralCode || 'N/A';

    row.innerHTML = `
        <td>
            <div class="user-cell">
                <div class="user-avatar">
                    <img src="${avatarUrl}" alt="${user.name || 'User'}" onerror="this.src='https://ui-avatars.com/api/?name=X&background=e0e0e0&color=666'">
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || 'Unknown'}</div>
                    <div class="user-email">${user.email || 'No email'}</div>
                </div>
                    </div>
                </td>
        <td>${user.mobile || 'N/A'}</td>
        <td>${formattedPoints}</td>
        <td>${user.adsWatched || 0}</td>
        <td>${referralCode}</td> 
        <td>${formattedDate}</td>
        <td><span class="status-badge ${status}">${status}</span></td>
        <td>
            <button class="table-action-btn edit-user" title="Edit User"><i class="fas fa-pencil-alt"></i></button>
            <button class="table-action-btn delete-user" title="Delete User"><i class="fas fa-trash"></i></button>
        </td>
    `;
    return row;
}

// Edit User Function
function editUser(userId) {
    console.log("[EditAdmin] Attempting to edit user:", userId);
    
    // Ensure we have fresh data before editing
    loadAllUsersData();
    
    // First, find the user in our local window.users array
    const userIndex = window.users.findIndex(u => (u.id === userId || u.userId === userId));
    
    if (userIndex === -1) {
        showNotification("User not found.", "error");
        console.error("[EditAdmin] Edit failed: User not found with ID", userId);
        return;
    }
    
    const user = window.users[userIndex];
    console.log("[EditAdmin] Found user to edit:", user);

    // Create and show the edit modal with user data
    const editModal = document.createElement('div');
    editModal.className = 'modal-overlay edit-user-modal-overlay';
    editModal.id = 'edit-user-modal';
    editModal.innerHTML = `
        <div class="modal-content modal-slide-up">
            <div class="modal-header">
                <h3>Edit User: ${user.name || 'Unknown'}</h3>
                <button class="close-modal" aria-label="Close modal"><i class="fas fa-times"></i></button>
            </div>
            <form id="edit-user-form" novalidate>
                <div class="modal-body">
                    <input type="hidden" id="edit-user-id" value="${user.id || user.userId}">

                    <div class="form-row">
                        <div class="form-group form-group-enhanced">
                            <label for="edit-user-name"><i class="fas fa-user form-icon"></i>Name:</label>
                            <input type="text" id="edit-user-name" class="input-styled" value="${user.name || ''}" required>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="edit-user-email"><i class="fas fa-envelope form-icon"></i>Email:</label>
                            <input type="email" id="edit-user-email" class="input-styled" value="${user.email || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group form-group-enhanced">
                            <label for="edit-user-mobile"><i class="fas fa-mobile-alt form-icon"></i>Mobile:</label>
                            <input type="text" id="edit-user-mobile" class="input-styled" value="${user.mobile || ''}">
                        </div>
                         <div class="form-group form-group-enhanced">
                            <label for="edit-user-points"><i class="fas fa-coins form-icon"></i>Points:</label>
                            <input type="number" id="edit-user-points" class="input-styled" value="${user.points || 0}" required min="0" step="1">
                        </div>
                    </div>
                    
                     <div class="form-row">
                        <div class="form-group form-group-enhanced">
                            <label for="edit-user-status"><i class="fas fa-user-tag form-icon"></i>Status:</label>
                            <select id="edit-user-status" class="input-styled">
                                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>Banned</option>
                            </select>
                        </div>
                        <div class="form-group form-group-enhanced">
                            <label for="edit-user-min-withdrawal"><i class="fas fa-rupee-sign form-icon"></i>Min Withdrawal:</label>
                            <input type="number" id="edit-user-min-withdrawal" class="input-styled" value="${user.minWithdrawal || 0}" min="0" step="1" placeholder="e.g., 50">
                        </div>
                    </div>
                    
                     <div class="form-row">
                         <div class="form-group form-group-enhanced">
                            <label for="edit-user-referral"><i class="fas fa-link form-icon"></i>Referral Code:</label>
                            <input type="text" id="edit-user-referral" class="input-styled" value="${user.referralCode || ''}" readonly >
                        </div>
                         <div class="form-group form-group-enhanced">
                            <label for="edit-user-joined"><i class="fas fa-calendar-alt form-icon"></i>Joined:</label>
                            <input type="text" id="edit-user-joined" class="input-styled" value="${formatDate(user.joinDate || user.createdAt)}" readonly>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-edit-user">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
    editModal.offsetHeight; // Force reflow for animation
    editModal.classList.add('visible');

    // Set up modal close/cancel logic
    const closeModalButton = editModal.querySelector('.close-modal');
    const cancelModalButton = editModal.querySelector('#cancel-edit-user');
    const editForm = editModal.querySelector('#edit-user-form');
    const modalContent = editModal.querySelector('.modal-content');
    
    const closeEditModal = () => {
        editModal.classList.remove('visible');
        modalContent.classList.add('modal-slide-down');
        setTimeout(() => {
            if (document.body.contains(editModal)) {
                document.body.removeChild(editModal);
            }
        }, 300);
    };
    
    closeModalButton.addEventListener('click', closeEditModal);
    cancelModalButton.addEventListener('click', closeEditModal);

    // Handle form submission
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get the current user ID from form
        const userIdToUpdate = document.getElementById('edit-user-id').value;
        console.log("[EditAdmin] Form submitted for user ID:", userIdToUpdate);
        
        // IMPORTANT: Read fresh data from localStorage to avoid overwriting other changes
        let appUsers = [];
        try {
            const rawData = localStorage.getItem('appUsers');
            if (rawData) {
                appUsers = JSON.parse(rawData);
                console.log("[EditAdmin] Loaded fresh appUsers data, count:", appUsers.length);
            } else {
                console.warn("[EditAdmin] No appUsers data in localStorage, using window.users");
                appUsers = [...window.users]; // Fallback
            }
        } catch (err) {
            console.error("[EditAdmin] Error loading appUsers:", err);
            showNotification("Error loading user data. Try refreshing.", "error");
            return;
        }
        
        // Find user in the freshly loaded data
        const finalUserIndex = appUsers.findIndex(u => 
            (u.id === userIdToUpdate || u.userId === userIdToUpdate)
        );
        
        if (finalUserIndex === -1) {
            showNotification("Error: User not found during save.", "error");
            console.error("[EditAdmin] User not found in fresh data:", userIdToUpdate);
            closeEditModal();
            return;
        }

        // Get updated values from form
        const updatedName = document.getElementById('edit-user-name').value.trim();
        const updatedEmail = document.getElementById('edit-user-email').value.trim();
        const updatedMobile = document.getElementById('edit-user-mobile').value.trim();
        const updatedPoints = parseInt(document.getElementById('edit-user-points').value, 10);
        const updatedStatus = document.getElementById('edit-user-status').value;
        const updatedMinWithdrawal = parseInt(document.getElementById('edit-user-min-withdrawal').value, 10);

        // Validation logic
        const pointsInput = document.getElementById('edit-user-points');
        const nameInput = document.getElementById('edit-user-name');
        const minWithdrawalInput = document.getElementById('edit-user-min-withdrawal');
        
        pointsInput.classList.remove('error');
        nameInput.classList.remove('error');
        minWithdrawalInput.classList.remove('error');
        
        let isValid = true;
        
        if (!updatedName) {
            showNotification("User name cannot be empty.", "error");
            nameInput.classList.add('error');
            nameInput.focus();
            isValid = false;
        }
        
        if (isNaN(updatedPoints) || updatedPoints < 0) {
            showNotification("Invalid points value. Must be 0 or greater.", "error");
            pointsInput.classList.add('error');
            if (isValid) pointsInput.focus();
            isValid = false;
        }
        
        if (isNaN(updatedMinWithdrawal) || updatedMinWithdrawal < 0) {
            showNotification("Invalid Minimum Withdrawal value. Must be 0 or greater.", "error");
            minWithdrawalInput.classList.add('error');
            if (isValid) minWithdrawalInput.focus();
            isValid = false;
        }
        
        if (!isValid) {
            return;
        }

        // Create updated user object, preserving all original fields
        const updatedUser = {
            ...appUsers[finalUserIndex], // Keep all existing properties
            name: updatedName,
            email: updatedEmail,
            mobile: updatedMobile,
            points: updatedPoints,
            status: updatedStatus,
            minWithdrawal: updatedMinWithdrawal
        };
        
        // Ensure both ID fields exist for compatibility
        if (updatedUser.id && !updatedUser.userId) {
            updatedUser.userId = updatedUser.id;
        } else if (updatedUser.userId && !updatedUser.id) {
            updatedUser.id = updatedUser.userId;
        }
        
        console.log("[EditAdmin] User data before update:", JSON.stringify(appUsers[finalUserIndex]));
        console.log("[EditAdmin] User data after update:", JSON.stringify(updatedUser));

        // Replace user in the array
        appUsers[finalUserIndex] = updatedUser;

        // CRITICAL: Save the ENTIRE updated users array to localStorage
        try {
            localStorage.setItem('appUsers', JSON.stringify(appUsers));
            
            // Verify the save worked
            const savedData = localStorage.getItem('appUsers');
            const parsedData = JSON.parse(savedData);
            const savedUser = parsedData.find(u => u.id === userIdToUpdate || u.userId === userIdToUpdate);
            
            if (!savedUser) {
                throw new Error("User not found in saved data");
            }
            
            if (savedUser.points !== updatedPoints) {
                throw new Error(`Points mismatch: ${savedUser.points} vs ${updatedPoints}`);
            }
            
            console.log("[EditAdmin] User data successfully saved to appUsers in localStorage");
            
            // Update our local window.users for admin UI
            window.users = [...appUsers];
            
            // Show success message and update UI
            showNotification("User details updated successfully!", "success");
            closeEditModal();
            
            // Refresh admin panel UI
            loadUserManagement();
            updateStatistics();
            
        } catch (error) {
            console.error('[EditAdmin] Error saving user data:', error);
            showNotification("Error saving user data. Check console.", "error");
        }
    });

    // Focus first field after animation completes
    setTimeout(() => {
        document.getElementById('edit-user-name')?.focus();
    }, 100);
}

// Delete User Function
function deleteUser(userId) {
    console.log("[DeleteAdmin] Delete user requested:", userId);
    
    showConfirmDialog(
        "Delete User",
        "Are you sure you want to delete this user? This action cannot be undone.",
        () => {
            // IMPORTANT: Load fresh data from localStorage to avoid overwriting other changes
            let appUsers = [];
            try {
                const rawData = localStorage.getItem('appUsers');
                if (rawData) {
                    appUsers = JSON.parse(rawData);
                    console.log("[DeleteAdmin] Loaded fresh appUsers data, count:", appUsers.length);
                } else {
                    console.warn("[DeleteAdmin] No appUsers data in localStorage, using window.users");
                    appUsers = [...window.users]; // Fallback
                }
            } catch (err) {
                console.error("[DeleteAdmin] Error loading appUsers:", err);
                showNotification("Error loading user data. Try refreshing.", "error");
                return;
            }
            
            // Find user in the freshly loaded data
            const userIndex = appUsers.findIndex(u => 
                (u.id === userId || u.userId === userId)
            );
            
            if (userIndex === -1) {
                showNotification("Error: User not found during delete operation.", "error");
                console.error("[DeleteAdmin] User not found in fresh data:", userId);
                return;
            }

            // Remove user from array
            const deletedUser = appUsers.splice(userIndex, 1)[0];
            console.log("[DeleteAdmin] User removed from array:", deletedUser);

            // CRITICAL: Save the ENTIRE updated users array to localStorage
            try {
                localStorage.setItem('appUsers', JSON.stringify(appUsers));
                
                // Verify the save worked
                const savedData = localStorage.getItem('appUsers');
                const parsedData = JSON.parse(savedData);
                const deletedUserStillExists = parsedData.some(u => 
                    (u.id === userId || u.userId === userId)
                );
                
                if (deletedUserStillExists) {
                    throw new Error("User still exists in saved data after deletion");
                }
                
                console.log("[DeleteAdmin] User data successfully saved to appUsers in localStorage");
                
                // Update our local window.users for admin UI
                window.users = [...appUsers];
                
                // Show success message and update UI
                showNotification("User deleted successfully.", "success");
                
                // Refresh admin panel UI
                loadUserManagement();
                updateStatistics();
                
            } catch (error) {
                console.error('[DeleteAdmin] Error saving user data after deletion:', error);
                showNotification("Error deleting user. Check console.", "error");
            }
        }
    );
}

// Attach listeners for user actions (using delegation)
// This function should only be called *once* during initialization
function attachUserActionListeners() {
    const userTableBody = document.getElementById('user-table-body');
    if (!userTableBody) {
        console.error("User table body not found for attaching listeners.");
        return;
    }

    // Check if listener is already attached to prevent duplicates
    if (userTableBody.dataset.listenerAttached === 'true') {
         console.log("User action listener already attached.");
        return;
    }

    console.log("Attaching user action listener to table body...");
    userTableBody.addEventListener('click', function(event) {
        // Find the closest button with the target class
        const editButton = event.target.closest('button.edit-user');
        const deleteButton = event.target.closest('button.delete-user');
        // Get userId from the row the button is in
        const tableRow = event.target.closest('tr[data-user-id]');
        const userId = tableRow?.dataset.userId;

        // If no userId found on the row, do nothing
        if (!userId) {
            // console.log("Click inside table body, but not on a user row action.");
            return;
        }

        if (editButton) {
            event.stopPropagation(); // Prevent potential parent handlers
            console.log("Delegated edit click detected for user:", userId);
            editUser(userId); // Call the edit function
        } else if (deleteButton) {
            event.stopPropagation(); // Prevent potential parent handlers
            console.log("Delegated delete click detected for user:", userId);
            deleteUser(userId); // Call the delete function
        }
    });

    // Mark the listener as attached using a data attribute
    userTableBody.dataset.listenerAttached = 'true';
    console.log("User action listener successfully attached.");
}

// Modify loadWithdrawalRequests similarly
function loadWithdrawalRequests(highlightNew = false) {
    console.log("Loading withdrawal requests...", highlightNew ? "Highlighting new" : "");
    const withdrawalTableBody = document.getElementById('withdrawal-table-body');
    if (!withdrawalTableBody) {
        console.error("Withdrawal table body not found");
        return;
    }

    const tableWrapper = withdrawalTableBody.closest('.table-responsive') || withdrawalTableBody.parentElement;
    const currentScroll = tableWrapper.scrollTop; // Get scroll from parent wrapper
    withdrawalTableBody.innerHTML = '';
    loadWithdrawalData(); // Ensure latest window.withdrawalRequests

    if (!window.withdrawalRequests || window.withdrawalRequests.length === 0) {
        withdrawalTableBody.innerHTML = `<tr><td colspan="7" class="no-data"><div class="empty-state"><i class="fas fa-exchange-alt"></i><p>No withdrawal requests</p></div></td></tr>`;
        return;
    }

    const filterValue = document.getElementById('withdrawal-filter')?.value || 'all';
    let filteredRequests = [...window.withdrawalRequests];
    if (filterValue !== 'all') {
        filteredRequests = filteredRequests.filter(req => req.status === filterValue);
    }
    filteredRequests.sort((a, b) => new Date(b.date) - new Date(a.date));

    const fragment = document.createDocumentFragment();
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;

    filteredRequests.forEach(request => {
        const row = createWithdrawalRow(request); // Use helper
        const requestTimestamp = new Date(request.date || 0).getTime();
         // Highlight only if new AND pending
        if (highlightNew && requestTimestamp > fiveSecondsAgo && request.status === 'pending') {
            row.classList.add('new-item-highlight');
            setTimeout(() => row.classList.remove('new-item-highlight'), 3000);
        }
        fragment.appendChild(row);
    });
    withdrawalTableBody.appendChild(fragment);
    tableWrapper.scrollTop = currentScroll; // Restore scroll on parent
    updateWithdrawalSummary(); // Update summary cards
    console.log(`Loaded ${filteredRequests.length} withdrawal requests into table.`);
}

// Create Withdrawal Row helper
function createWithdrawalRow(request) {
    const row = document.createElement('tr');
    row.setAttribute('data-request-id', request.id);
    // Ensure users array is loaded before finding user
    const user = window.users?.find(u => u.id === request.userId);
    const userName = user ? user.name : `User ${request.userId?.slice(-4) || 'Unknown'}`;
    const status = request.status || 'pending';
    // Ensure paymentMethod and accountDetails exist
    const paymentMethod = request.method || request.paymentMethod || 'N/A';
    const accountDetails = request.account || request.accountDetails || 'N/A';

    row.innerHTML = `
        <td>${userName}</td>
        <td>${request.currency || '₹'}${request.amount.toFixed(2)}</td>
        <td>${paymentMethod}</td> 
        <td>${accountDetails}</td>
        <td>${formatDate(request.date)}</td>
        <td><span class="status-badge ${status}">${status}</span></td>
        <td class="action-buttons">
            <button class="table-action-btn view-btn" title="View Details"><i class="fas fa-eye"></i></button>
            ${status === 'pending' ? `
                <button class="table-action-btn approve-btn" title="Approve"><i class="fas fa-check"></i></button>
                <button class="table-action-btn reject-btn" title="Reject"><i class="fas fa-times"></i></button>
            ` : ''}
        </td>
    `;
    return row;
}

// Load notifications management section
function loadNotificationsManagement() {
    console.log("Loading notifications management section...");
    
    // Get the notifications container
    const notificationsContainer = document.getElementById('notifications-list');
    if (!notificationsContainer) {
        console.error("Notifications container element not found");
        return;
    }
    
    // Clear existing notifications
    notificationsContainer.innerHTML = '';
    
    // Make sure we have fresh data
    loadNotificationsData();
    
    // Check if we have notifications
    if (!window.adminNotifications || window.adminNotifications.length === 0) {
        notificationsContainer.innerHTML = `
            <div class="empty-state">
                <p>No notifications found</p>
            </div>
        `;
        return;
    }
    
    // Get filter value
    const filterValue = document.getElementById('notification-filter')?.value || 'all';
    
    // Filter notifications
    let filteredNotifications = [...window.adminNotifications];
    if (filterValue === 'unread') {
        filteredNotifications = filteredNotifications.filter(n => !n.read);
    }
    
    // Sort notifications by date (newest first)
    filteredNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Add notifications to container
    filteredNotifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
        notificationItem.setAttribute('data-notification-id', notification.id);
        
        // Format date
        const formattedTime = formatTimeAgo(notification.timestamp);
        
        // Set icon based on notification type
        let iconClass = 'notification-icon';
        if (notification.type === 'user') {
            iconClass += ' user';
        } else if (notification.type === 'withdrawal') {
            iconClass += ' withdrawal';
        } else if (notification.type === 'ticket') {
            iconClass += ' ticket';
        }
        
        notificationItem.innerHTML = `
            <div class="${iconClass}">
                <i class="fas fa-${notification.type === 'user' ? 'user' : notification.type === 'withdrawal' ? 'money-bill-wave' : 'ticket-alt'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title || 'Notification'}</div>
                <div class="notification-message">${notification.message || ''}</div>
                <div class="notification-time">${formattedTime}</div>
            </div>
            <div class="notification-actions">
                ${!notification.read ? `
                    <button class="notification-btn mark-read" data-notification-id="${notification.id}">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="notification-btn dismiss" data-notification-id="${notification.id}">
                    <i class="fas fa-times"></i>
                </button>
        </div>
    `;
    
        notificationsContainer.appendChild(notificationItem);
    });
    
    // Add event listeners to notification buttons
    const markReadButtons = document.querySelectorAll('.notification-btn.mark-read');
    const dismissButtons = document.querySelectorAll('.notification-btn.dismiss');
    
    markReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.getAttribute('data-notification-id');
            markNotificationAsRead(notificationId);
        });
    });
    
    dismissButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.getAttribute('data-notification-id');
            dismissNotification(notificationId);
        });
    });
    
    console.log("Notifications management section loaded successfully");
}

// Format time ago function
function formatTimeAgo(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
        
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting time ago:', error);
        return 'Unknown time';
    }
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    console.log("Marking notification as read:", notificationId);
    
    // Find notification in array
    const notificationIndex = window.adminNotifications.findIndex(n => n.id === notificationId);
    if (notificationIndex === -1) {
        console.error("Notification not found with ID:", notificationId);
        return;
    }
    
    // Mark as read
    window.adminNotifications[notificationIndex].read = true;
    
    // Save updated notifications to localStorage
    localStorage.setItem('adminNotifications', JSON.stringify(window.adminNotifications));
    
    // Update UI
    const notificationElement = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
    if (notificationElement) {
        notificationElement.classList.remove('unread');
        
        // Remove mark read button
        const markReadButton = notificationElement.querySelector('.notification-btn.mark-read');
        if (markReadButton) {
            markReadButton.remove();
        }
    }
    
    // Update notification count
    updateNotificationCount();
}

// Mark all notifications as read
function markAllNotificationsRead() {
    console.log("Marking all notifications as read");
    
    // Check if we have notifications
    if (!window.adminNotifications || window.adminNotifications.length === 0) {
        return;
    }
    
    // Mark all as read
    window.adminNotifications.forEach(notification => {
        notification.read = true;
    });
    
    // Save updated notifications to localStorage
    localStorage.setItem('adminNotifications', JSON.stringify(window.adminNotifications));
    
    // Update UI
    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
    unreadNotifications.forEach(element => {
        element.classList.remove('unread');
        
        // Remove mark read button
        const markReadButton = element.querySelector('.notification-btn.mark-read');
        if (markReadButton) {
            markReadButton.remove();
        }
    });
    
    // Update notification count
    updateNotificationCount();
    
    // Show success notification
    showNotification("All notifications marked as read", "success");
}

// Dismiss notification
function dismissNotification(notificationId) {
    console.log("Dismissing notification:", notificationId);
    
    // Find notification in array
    const notificationIndex = window.adminNotifications.findIndex(n => n.id === notificationId);
    if (notificationIndex === -1) {
        console.error("Notification not found with ID:", notificationId);
        return;
    }
    
    // Remove from array
    window.adminNotifications.splice(notificationIndex, 1);
    
    // Save updated notifications to localStorage
    localStorage.setItem('adminNotifications', JSON.stringify(window.adminNotifications));
    
    // Update UI
    const notificationElement = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
    if (notificationElement) {
        // Animate removal
        notificationElement.style.height = notificationElement.offsetHeight + 'px';
        notificationElement.classList.add('removing');
        
        setTimeout(() => {
            notificationElement.style.height = '0';
            notificationElement.style.marginTop = '0';
            notificationElement.style.paddingTop = '0';
            notificationElement.style.paddingBottom = '0';
            
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
                
                // Check if we need to show empty state
                if (window.adminNotifications.length === 0) {
                    const notificationsContainer = document.getElementById('notifications-list');
                    if (notificationsContainer) {
                        notificationsContainer.innerHTML = `
                            <div class="empty-state">
                                <p>No notifications found</p>
                            </div>
                        `;
                    }
                }
            }, 300);
        }, 10);
    }
    
    // Update notification count
    updateNotificationCount();
}

// Load support tickets management section
function loadTicketsManagement(highlightNew = false) {
    console.log("Loading tickets management...", highlightNew ? "Highlighting new" : "");
    const ticketsListContainer = document.getElementById('tickets-list');
    if (!ticketsListContainer) {
        console.error("Tickets list container not found");
        return;
    }

    const currentScroll = ticketsListContainer.scrollTop;
    ticketsListContainer.innerHTML = '';
    loadSupportTicketsData(); // Ensure latest window.supportTickets

    if (!window.supportTickets || window.supportTickets.length === 0) {
        ticketsListContainer.innerHTML = `<div class="no-data-message"><i class="fas fa-ticket-alt"></i><p>No tickets found</p></div>`;
        // Clear details pane as well
        const ticketDetailPlaceholder = document.querySelector('.ticket-detail-placeholder');
        const ticketDetail = document.getElementById('ticket-detail');
        if (ticketDetailPlaceholder) ticketDetailPlaceholder.style.display = 'flex';
        if (ticketDetail) ticketDetail.style.display = 'none';
        return;
    }

    const filterValue = document.getElementById('ticket-filter')?.value || 'all';
    let filteredTickets = [...window.supportTickets];
    if (filterValue !== 'all') {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === filterValue);
    }
    filteredTickets.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const fragment = document.createDocumentFragment();
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;

    filteredTickets.forEach(ticket => {
        const item = createTicketListItem(ticket); // Use helper
        const ticketTimestamp = new Date(ticket.date || 0).getTime();
        // Highlight only if new AND open
        if (highlightNew && ticketTimestamp > fiveSecondsAgo && ticket.status === 'open') {
            item.classList.add('new-item-highlight');
            setTimeout(() => item.classList.remove('new-item-highlight'), 3000);
        }
        fragment.appendChild(item);
    });
    ticketsListContainer.appendChild(fragment);
    ticketsListContainer.scrollTop = currentScroll;
    console.log(`Loaded ${filteredTickets.length} tickets into list.`);
    // Note: showing ticket details is handled by the click listener added in createTicketListItem
}

// Create Ticket List Item helper
function createTicketListItem(ticket) {
    const item = document.createElement('div');
    item.className = 'ticket-item';
    item.setAttribute('data-ticket-id', ticket.id);
    // Ensure users array is loaded
    const user = window.users?.find(u => u.id === ticket.userId);
    const userName = user ? user.name : `User ${ticket.userId?.slice(-4) || 'Unknown'}`;
    // Check for messages array and last message content
    const lastMessageText = ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1].text || ticket.messages[ticket.messages.length - 1].message : 'No messages yet';
    const status = ticket.status || 'open';
    const subject = ticket.subject || ticket.title || 'No Subject';

    item.innerHTML = `
        <div class="ticket-item-header">
            <div class="ticket-item-title" title="${subject}">${subject}</div>
            <span class="status-badge ${status}">${status}</span>
                </div>
        <div class="ticket-item-preview">${lastMessageText.substring(0, 50)}${lastMessageText.length > 50 ? '...' : ''}</div>
        <div class="ticket-item-footer">
            <span>From: ${userName}</span>
            <span>${formatTimeAgo(ticket.date)}</span>
            </div>
        `;
    // Attach click listener directly here
    item.addEventListener('click', function() {
        const ticketId = this.dataset.ticketId;
        console.log("Ticket item clicked:", ticketId);
        // Ensure showTicketDetails function exists
        if (typeof showTicketDetails === 'function') {
            showTicketDetails(ticketId);
            } else {
            console.warn('showTicketDetails function not defined');
            showNotification('Cannot display ticket details.', 'warning');
        }
        // Handle active state class
        document.querySelectorAll('.ticket-item.active').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
    });
    return item;
}

// Update playNotificationSound to be more specific
function playNotificationSound(type = 'default') {
    let soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3'; // Default sound
    if (type === 'ticket' || type === 'withdrawal') {
        // Use a slightly more prominent sound for actionable items
        soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3';
    } else if (type === 'error') {
         soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-991.mp3'; // Error sound
    } else if (type === 'user') {
         soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-quick-win-video-game-notification-269.mp3'; // Sound for new user
    }

    try {
        const audio = new Audio(soundUrl);
        audio.volume = 0.3; // Keep volume reasonable
        // Attempt to play, catching potential browser restrictions
        audio.play().catch(e => console.warn("Audio playback failed (browser likely requires user interaction first):", e));
    } catch (error) {
        console.error("Error creating or playing notification sound:", error);
    }
}

// Create notification function
function createNotification(notification) {
    if (!notification) return;
    
    console.log("Creating new notification:", notification);
    
    // Generate a unique ID if not provided
    if (!notification.id) {
        notification.id = 'notification_' + Date.now();
    }
    
    // Set default values
    notification.read = notification.read || false;
    notification.timestamp = notification.timestamp || new Date().toISOString();
    
    // Make sure we have the notifications array
    if (!window.adminNotifications) {
        window.adminNotifications = [];
    }
    
    // Add to beginning of array
    window.adminNotifications.unshift(notification);
    
    // Save to localStorage
    localStorage.setItem('adminNotifications', JSON.stringify(window.adminNotifications));
    
    // Update notification count
    updateNotificationCount();
    
    console.log("Notification created successfully");
}

// Show notification toast
function showNotification(message, type = 'info') {
    console.log(`Showing ${type} notification: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <div class="notification-toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Set a timeout to remove the notification
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Add close button event listener
    const closeButton = notification.querySelector('.close-notification');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Format date function (Handles potential invalid dates)
function formatDate(dateString) {
    if (!dateString) return 'N/A'; // Handle null or undefined dates
    try {
    const date = new Date(dateString);
        // Check if the date is valid after parsing
        if (isNaN(date.getTime())) {
            console.warn("Invalid date string received:", dateString);
            return 'Invalid Date';
        }
        // Format the date nicely
        return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
            // Optional: add time if needed
            // hour: '2-digit',
            // minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return 'Error'; // Return specific error string
    }
}

// Sort User Data function
function sortUserData(users, sortBy) {
    if (!Array.isArray(users)) return [];
    switch (sortBy) {
        case 'points-high': return [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
        case 'points-low': return [...users].sort((a, b) => (a.points || 0) - (b.points || 0));
        case 'name': return [...users].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        case 'date':
        default: return [...users].sort((a, b) => new Date(b.joinDate || b.createdAt || 0) - new Date(a.joinDate || a.createdAt || 0));
    }
} 
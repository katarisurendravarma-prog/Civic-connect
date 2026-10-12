// App state variables
let token = localStorage.getItem('token') || null;
let currentUser = null;
let activeSection = 'section-dashboard';
let citizenMap = null;
let pinMap = null;
let pinMarker = null;
let pinAccuracyCircle = null;
let liveWatchId = null;
let currentCoords = { lat: 12.9716, lng: 77.5946 }; // Default center
let uploadedImages = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAuthNavigation();
    initAppNavigation();
    initChatbot();

    if (token) {
        loadUserProfile();
    } else {
        showScreen('auth');
    }
});

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Themes setup
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
    
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    });
}

function updateThemeIcons(theme) {
    const sun = document.getElementById('theme-sun');
    const moon = document.getElementById('theme-moon');
    if (theme === 'dark') {
        sun.style.display = 'none';
        moon.style.display = 'block';
    } else {
        sun.style.display = 'block';
        moon.style.display = 'none';
    }
}

// Navigating screens (Auth vs Main Application)
function showScreen(screen) {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    
    if (screen === 'auth') {
        authScreen.style.display = 'flex';
        appScreen.style.display = 'none';
    } else {
        authScreen.style.display = 'flex'; // Reset display wrapper
        authScreen.style.display = 'none';
        appScreen.style.display = 'flex';
        initCitizenMap(); // Lazy load map once visible
    }
}

// Authentication Forms & Screen Toggles
function initAuthNavigation() {
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const otpCard = document.getElementById('otp-card');
    const forgotCard = document.getElementById('forgot-card');
    
    document.getElementById('to-register').addEventListener('click', () => {
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    });
    
    document.getElementById('to-login').addEventListener('click', () => {
        registerCard.style.display = 'none';
        loginCard.style.display = 'block';
    });
    
    document.getElementById('to-forgot').addEventListener('click', () => {
        loginCard.style.display = 'none';
        forgotCard.style.display = 'block';
    });
    
    document.getElementById('forgot-back-to-login').addEventListener('click', () => {
        forgotCard.style.display = 'none';
        loginCard.style.display = 'block';
    });

    // Handle Login Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            if (res.ok) {
                token = data.token;
                currentUser = data.user;
                localStorage.setItem('token', token);
                
                showToast('Signed in successfully', 'success');

                if (currentUser.role && currentUser.role !== 'Citizen') {
                    showToast(`Welcome ${currentUser.name}! Redirecting to Admin Console...`, 'info');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 800);
                    return;
                }

                loadUserProfile();
            } else if (res.status === 403 && !data.is_verified) {
                // Not verified
                showToast(data.message, 'warning');
                document.getElementById('otp-email-display').innerText = data.email;
                loginCard.style.display = 'none';
                otpCard.style.display = 'block';
            } else {
                showToast(data.message || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Connection error to auth gateway', 'error');
        }
    });

    // Handle Google Login Click
    document.getElementById('google-login-btn').addEventListener('click', async () => {
        showToast('Connecting to Google Accounts...', 'info');
        
        // Simulating Google OAuth prompt returning profile details
        setTimeout(async () => {
            const mockGoogleUser = {
                email: "google_citizen@gmail.com",
                name: "Google Citizen",
                google_id: "google_oauth_1234567890"
            };
            
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/auth/google-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockGoogleUser)
                });
                
                const data = await res.json();
                if (res.ok) {
                    token = data.token;
                    currentUser = data.user;
                    localStorage.setItem('token', token);
                    
                    showToast('Logged in successfully via Google!', 'success');
                    loadUserProfile();
                } else {
                    showToast(data.message || 'Google Auth login failed', 'error');
                }
            } catch (err) {
                showToast('Connection error to auth gateway', 'error');
            }
        }, 800);
    });

    // Handle Registration Submit
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const phone = document.getElementById('reg-phone').value;
        const password = document.getElementById('reg-password').value;
        const address = document.getElementById('reg-address').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password, address })
            });
            
            const data = await res.json();
            if (res.ok) {
                showToast('Registration submitted. OTP Code generated: ' + data.otp_demo, 'success');
                document.getElementById('otp-email-display').innerText = email;
                registerCard.style.display = 'none';
                otpCard.style.display = 'block';
            } else {
                showToast(data.message || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Connection error to auth gateway', 'error');
        }
    });

    // Handle OTP Verify
    document.getElementById('otp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('otp-email-display').innerText;
        const otp = document.getElementById('otp-code').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            
            const data = await res.json();
            if (res.ok) {
                showToast('Account activated. You can now login.', 'success');
                otpCard.style.display = 'none';
                loginCard.style.display = 'block';
            } else {
                showToast(data.message || 'OTP Verification failed', 'error');
            }
        } catch (err) {
            showToast('Connection error during verification', 'error');
        }
    });

    // Handle OTP Resend
    document.getElementById('resend-otp-btn').addEventListener('click', async () => {
        const email = document.getElementById('otp-email-display').innerText;
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('New OTP Code generated: ' + data.otp_demo, 'info');
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    // Handle Forgot Password
    let forgotPasswordStep = 1;
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        
        if (forgotPasswordStep === 1) {
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast('Reset code sent. Verification OTP: ' + data.otp_demo, 'info');
                    document.getElementById('forgot-otp-section').style.display = 'block';
                    document.getElementById('forgot-submit-btn').innerHTML = 'Reset Password <i class="fa-solid fa-lock-open"></i>';
                    forgotPasswordStep = 2;
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Connection error', 'error');
            }
        } else {
            const otp = document.getElementById('forgot-otp').value;
            const new_password = document.getElementById('forgot-new-password').value;
            
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/auth/reset-password-verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp, new_password })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast('Password updated. You can login now.', 'success');
                    forgotCard.style.display = 'none';
                    loginCard.style.display = 'block';
                    document.getElementById('forgot-otp-section').style.display = 'none';
                    document.getElementById('forgot-submit-btn').innerHTML = 'Send Reset Code <i class="fa-solid fa-paper-plane"></i>';
                    forgotPasswordStep = 1;
                } else {
                    showToast(data.message, 'error');
                }
            } catch (err) {
                showToast('Connection error', 'error');
            }
        }
    });
}

// App Sidebar Navigation & Actions
function initAppNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.page-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-target');
            if (!target) return; // Skip logout button
            
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(s => s.style.display = 'none');
            document.getElementById(target).style.display = 'block';
            
            activeSection = target;
            
            // Set header title dynamically
            const titles = {
                'section-dashboard': 'Citizen Dashboard',
                'section-submit': 'File Civic Complaint',
                'section-my-complaints': 'My Complaints Registry',
                'section-notifications': 'Notification Center',
                'section-profile': 'Personal Settings',
                'section-map': 'City Complaint Map',
                'section-feedback': 'Your Feedback & Ratings',
                'section-ai-assistant': 'Smart AI Assistant',
                'section-history': 'Activity History',
                'section-settings': 'Portal Settings',
                'section-help': 'Help & Support'
            };
            document.getElementById('page-title').innerText = titles[target] || 'Citizen Connect';
            
            // Context triggers
            if (target === 'section-submit') {
                initPinMap();
            } else if (target === 'section-my-complaints') {
                loadMyComplaints();
            } else if (target === 'section-notifications') {
                loadNotifications();
            } else if (target === 'section-dashboard') {
                loadDashboardStats();
                initCitizenMap();
            } else if (target === 'section-map') {
                initDedicatedCitizenMap();
            } else if (target === 'section-feedback') {
                loadUserFeedbacks();
            } else if (target === 'section-ai-assistant') {
                initFullChatbot();
            } else if (target === 'section-history') {
                loadUserAuditLogs();
            } else if (target === 'section-settings') {
                initSettingsView();
            }
        });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        showScreen('auth');
        showToast('Logged out successfully', 'info');
    });

    // Profile Settings Submit
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;
        const address = document.getElementById('profile-address').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone, address })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Profile settings updated successfully', 'success');
                currentUser = data.user;
                document.getElementById('nav-username').innerText = currentUser.name;
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    // Modify Credentials Submit
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const old_password = document.getElementById('pw-old').value;
        const new_password = document.getElementById('pw-new').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ old_password, new_password })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Password changed successfully', 'success');
                document.getElementById('password-form').reset();
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });

    // Handle Return buttons from Detail Screen
    document.getElementById('detail-back-btn').addEventListener('click', () => {
        document.getElementById('section-complaint-detail').style.display = 'none';
        document.getElementById(activeSection).style.display = 'block';
    });

    // Handle Delete button from Detail Screen
    document.getElementById('detail-delete-btn').addEventListener('click', async () => {
        const id = document.getElementById('detail-unique-id').getAttribute('data-id');
        if (!id) return;
        
        const confirmDelete = confirm("Are you sure you want to delete this complaint? This action cannot be undone and will remove all associated logs and records.");
        if (!confirmDelete) return;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/delete/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                showToast('Complaint deleted successfully', 'success');
                // Return to complaints list
                document.getElementById('section-complaint-detail').style.display = 'none';
                document.getElementById(activeSection).style.display = 'block';
                loadMyComplaints();
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Failed to delete complaint', 'error');
            }
        } catch (err) {
            showToast('Network error while deleting complaint', 'error');
        }
    });

    // Init submit complaint logic
    initSubmitComplaintFlow();
}

// Load profile & check roles
async function loadUserProfile() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            currentUser = await res.json();
            
            // Populate profile forms
            document.getElementById('profile-name').value = currentUser.name;
            document.getElementById('profile-email').value = currentUser.email;
            document.getElementById('profile-phone').value = currentUser.phone;
            document.getElementById('profile-address').value = currentUser.address || '';
            
            // UI elements
            document.getElementById('nav-username').innerText = currentUser.name;
            document.getElementById('nav-avatar').innerText = currentUser.name.charAt(0).toUpperCase();
            
            showScreen('app');
            loadDashboardStats();
        } else {
            // Token invalid or expired
            token = null;
            localStorage.removeItem('token');
            showScreen('auth');
            showToast('Session expired. Please sign in again.', 'info');
        }
    } catch (err) {
        showScreen('auth');
        showToast('Server down. Local sandbox bypass enabled.', 'warning');
    }
}

// Load stats for counters
async function loadDashboardStats() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const list = await res.json();
            document.getElementById('stat-total').innerText = list.length;
            document.getElementById('stat-pending').innerText = list.filter(c => c.status === 'Pending').length;
            document.getElementById('stat-progress').innerText = list.filter(c => c.status === 'In Progress' || c.status === 'Assigned').length;
            document.getElementById('stat-resolved').innerText = list.filter(c => c.status === 'Resolved').length;
            
            // Populate recent reports list
            const recentContainer = document.getElementById('recent-list');
            if (list.length === 0) {
                recentContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No complaints filed yet.</p>';
            } else {
                recentContainer.innerHTML = '';
                list.slice(0, 5).forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'complaint-item';
                    div.style.cursor = 'pointer';
                    div.addEventListener('click', () => openComplaintDetail(c.id));
                    
                    div.innerHTML = `
                        <div class="complaint-meta">
                            <span class="complaint-title">${c.title}</span>
                            <div class="complaint-subtitle">
                                <span>ID: ${c.unique_id}</span>
                                <span>Category: ${c.category}</span>
                            </div>
                        </div>
                        <span class="badge ${c.status.toLowerCase()}">${c.status}</span>
                    `;
                    recentContainer.appendChild(div);
                });
            }
        }
    } catch (err) {
        console.error(err);
    }
}

// Geolocation Leaflet Maps
function initCitizenMap() {
    if (citizenMap) {
        setTimeout(() => citizenMap.invalidateSize(), 150);
        return;
    }
    
    // Default center coords
    citizenMap = L.map('citizen-map').setView([currentCoords.lat, currentCoords.lng], 13);
    
    CONFIG.addSatelliteOption(citizenMap);
    setTimeout(() => citizenMap.invalidateSize(), 200);
    
    // Fetch all active issues to place on Map
    loadMapMarkers();
}

async function loadMapMarkers() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            list.forEach(c => {
                let color = '#f59e0b'; // pending
                if (c.status === 'Resolved') color = '#10b981';
                if (c.status === 'In Progress') color = '#06b6d4';
                if (c.status === 'Rejected') color = '#ef4444';
                
                const circle = L.circleMarker([c.latitude, c.longitude], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    radius: 8
                }).addTo(citizenMap);
                
                circle.bindPopup(`
                    <div style="font-family: var(--font-body); font-size: 0.85rem; color: #000; min-width: 160px;">
                        <b>ID:</b> ${c.unique_id}<br/>
                        <b>Title:</b> ${c.title}<br/>
                        <b>Category:</b> ${c.category}<br/>
                        <b>Status:</b> <span style="font-weight:bold; color:${color}">${c.status}</span><br/>
                        <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
                            <button onclick="window.parent.openComplaintDetail(${c.id})" style="background:#2563EB; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Details</button>
                            <button onclick="CONFIG.openStreetView(${c.latitude}, ${c.longitude})" style="background:#ea4335; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;"><i class="fa-solid fa-street-view"></i> Street View</button>
                        </div>
                    </div>
                `);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// Smart multi-tier geolocation resolver (Hardware GPS -> Network -> IP fallback)
async function fetchSmartLocation(showToastNotice = true) {
    if (showToastNotice) {
        showToast("Locating your live coordinates...", "info");
    }
    
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            fallbackToIpLocation().then(resolve);
            return;
        }
        
        let resolved = false;
        
        // Tier 1: High accuracy GPS
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (resolved) return;
                resolved = true;
                resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    source: pos.coords.accuracy <= 30 ? 'High Precision GPS' : 'Browser Geolocation'
                });
            },
            (err1) => {
                console.warn("High accuracy geolocation timed out/failed, trying standard network...", err1);
                // Tier 2: Standard accuracy (cellular / Wi-Fi / Windows location cache)
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (resolved) return;
                        resolved = true;
                        resolve({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            source: 'Network Geolocation'
                        });
                    },
                    (err2) => {
                        console.warn("Standard geolocation failed, falling back to IP location...", err2);
                        // Tier 3: IP Geolocation
                        fallbackToIpLocation().then(ipLoc => {
                            if (resolved) return;
                            resolved = true;
                            resolve(ipLoc);
                        });
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
        
        // Safety timeout in case browser hangs on prompt
        setTimeout(() => {
            if (!resolved) {
                console.warn("Geolocation safety timeout triggered, querying IP location...");
                fallbackToIpLocation().then(ipLoc => {
                    if (!resolved) {
                        resolved = true;
                        resolve(ipLoc);
                    }
                });
            }
        }, 12000);
    });
}

// IP-based Geolocation fallback for desktop PCs / blocked location
async function fallbackToIpLocation() {
    try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (res.ok) {
            const data = await res.json();
            const lat = parseFloat(data.latitude);
            const lng = parseFloat(data.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                return {
                    lat: lat,
                    lng: lng,
                    accuracy: 1200,
                    source: `IP Geolocation (${data.city || data.region || 'Detected Area'})`
                };
            }
        }
    } catch (e) {
        console.warn("IP Geolocation provider 1 failed:", e);
    }
    
    try {
        const res2 = await fetch('https://ipapi.co/json/');
        if (res2.ok) {
            const data2 = await res2.json();
            const lat = parseFloat(data2.latitude);
            const lng = parseFloat(data2.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                return {
                    lat: lat,
                    lng: lng,
                    accuracy: 1500,
                    source: `IP Geolocation (${data2.city || 'Detected City'})`
                };
            }
        }
    } catch (e) {
        console.warn("IP Geolocation provider 2 failed:", e);
    }
    
    return null;
}

// Pinning complaint map setup
function initPinMap() {
    if (pinMap) {
        setTimeout(() => pinMap.invalidateSize(), 150);
        return;
    }
    
    pinMap = L.map('pin-map').setView([currentCoords.lat, currentCoords.lng], 14);
    
    CONFIG.addSatelliteOption(pinMap);
    setTimeout(() => pinMap.invalidateSize(), 200);
    
    pinMarker = L.marker([currentCoords.lat, currentCoords.lng], { draggable: true }).addTo(pinMap);
    
    updateCoordinateInputs(currentCoords.lat, currentCoords.lng);
    reverseGeocode(currentCoords.lat, currentCoords.lng);
    
    pinMarker.on('dragend', function (event) {
        const marker = event.target;
        const position = marker.getLatLng();
        setPinLocation(position.lat, position.lng, null, 'Manual Pin');
    });
    
    pinMap.on('click', function(e) {
        const coords = e.latlng;
        setPinLocation(coords.lat, coords.lng, null, 'Map Selected');
    });

    // Auto-resolve live location on opening pin map
    fetchSmartLocation(false).then(loc => {
        if (loc) {
            setPinLocation(loc.lat, loc.lng, loc.accuracy, loc.source);
        }
    });

    // Local live GPS button
    const locateBtn = document.getElementById('gps-locate-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', async () => {
            const loc = await fetchSmartLocation(true);
            if (loc) {
                setPinLocation(loc.lat, loc.lng, loc.accuracy, loc.source);
                showToast(`Location locked via ${loc.source}`, "success");
            } else {
                showToast("Could not retrieve GPS coordinates. Default retained.", "warning");
            }
        });
    }

    // Continuous Live Tracking button
    const trackBtn = document.getElementById('gps-track-btn');
    if (trackBtn) {
        trackBtn.addEventListener('click', toggleLiveTracking);
    }

    // Google Street View 360 viewer button
    const streetviewBtn = document.getElementById('open-streetview-btn');
    if (streetviewBtn) {
        streetviewBtn.addEventListener('click', () => {
            CONFIG.openStreetView(currentCoords.lat, currentCoords.lng);
        });
    }

    // Manual address set logic
    const setManualBtn = document.getElementById('set-manual-address-btn');
    if (setManualBtn) {
        setManualBtn.addEventListener('click', async () => {
            const manualAddr = document.getElementById('manual-address').value;
            if (!manualAddr) {
                showToast("Please type an address first", "warning");
                return;
            }
            
            document.getElementById('coord-address').innerText = manualAddr;
            showToast("Searching address location...", "info");

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualAddr)}&format=json&limit=1`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        setPinLocation(lat, lng, null, 'Address Search');
                        showToast("Location updated to typed address", "success");
                        return;
                    }
                }
            } catch(e) {}
            showToast("Manual address saved", "success");
        });
    }
}

// Update pin position, map view, accuracy circle and state
function setPinLocation(lat, lng, accuracy = null, source = 'User Selection') {
    currentCoords.lat = lat;
    currentCoords.lng = lng;
    
    if (pinMarker) {
        pinMarker.setLatLng([lat, lng]);
    }
    if (pinMap) {
        const zoom = pinMap.getZoom() < 16 ? 16 : pinMap.getZoom();
        pinMap.setView([lat, lng], zoom);
        pinMap.invalidateSize();
    }
    
    // Draw / update accuracy circle
    if (accuracy && accuracy > 0 && pinMap) {
        if (!pinAccuracyCircle) {
            pinAccuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5
            }).addTo(pinMap);
        } else {
            pinAccuracyCircle.setLatLng([lat, lng]);
            pinAccuracyCircle.setRadius(accuracy);
        }
    } else if (pinAccuracyCircle && pinMap) {
        pinMap.removeLayer(pinAccuracyCircle);
        pinAccuracyCircle = null;
    }
    
    updateCoordinateInputs(lat, lng);
    updateAccuracyBadge(accuracy, source);
    reverseGeocode(lat, lng);
}

// Display accuracy badge
function updateAccuracyBadge(accuracy, source = 'GPS') {
    const badge = document.getElementById('gps-accuracy-badge');
    if (!badge) return;
    
    if (!accuracy || accuracy <= 0) {
        badge.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> ${source}`;
        badge.style.background = 'rgba(59, 130, 246, 0.15)';
        badge.style.color = '#60a5fa';
        badge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        return;
    }
    
    const accMeters = Math.round(accuracy);
    if (accMeters <= 25) {
        badge.innerHTML = `<i class="fa-solid fa-satellite"></i> High Precision (±${accMeters}m)`;
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#34d399';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } else if (accMeters <= 100) {
        badge.innerHTML = `<i class="fa-solid fa-wifi"></i> Good Signal (±${accMeters}m)`;
        badge.style.background = 'rgba(59, 130, 246, 0.15)';
        badge.style.color = '#60a5fa';
        badge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
    } else {
        badge.innerHTML = `<i class="fa-solid fa-tower-broadcast"></i> Approximate (±${accMeters}m)`;
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
        badge.style.color = '#fbbf24';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
    }
}

// Continuous Live Tracking watcher
function toggleLiveTracking() {
    const btn = document.getElementById('gps-track-btn');
    if (!btn) return;
    
    if (liveWatchId !== null) {
        navigator.geolocation.clearWatch(liveWatchId);
        liveWatchId = null;
        btn.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Live Tracking: OFF`;
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        showToast("Live tracking turned off", "info");
    } else {
        if (!navigator.geolocation) {
            showToast("Live tracking not supported by browser", "error");
            return;
        }
        
        btn.innerHTML = `<i class="fa-solid fa-satellite-dish fa-fade"></i> Live Tracking: ON`;
        btn.style.background = 'rgba(16, 185, 129, 0.15)';
        btn.style.color = '#34d399';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        showToast("Live tracking active! Following movement in real-time.", "success");
        
        liveWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const acc = pos.coords.accuracy;
                setPinLocation(lat, lng, acc, 'Live Tracking Active');
            },
            (err) => {
                console.warn("Live tracking watch error:", err);
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
        );
    }
}

function updateCoordinateInputs(lat, lng) {
    const latEl = document.getElementById('coord-lat');
    const lngEl = document.getElementById('coord-lng');
    if (latEl) latEl.innerText = lat.toFixed(6);
    if (lngEl) lngEl.innerText = lng.toFixed(6);
}

// Reverse Geocoding with structured street name parsing & fallback
async function reverseGeocode(lat, lng) {
    const addressEl = document.getElementById('coord-address');
    const manualInput = document.getElementById('manual-address');
    
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
                const addr = data.address || {};
                const parts = [];
                if (addr.road || addr.street || addr.pedestrian) parts.push(addr.road || addr.street || addr.pedestrian);
                if (addr.house_number) parts.push(`No. ${addr.house_number}`);
                if (addr.neighbourhood || addr.suburb || addr.residential) parts.push(addr.neighbourhood || addr.suburb || addr.residential);
                if (addr.city || addr.town || addr.village || addr.county) parts.push(addr.city || addr.town || addr.village || addr.county);
                if (addr.postcode) parts.push(addr.postcode);
                
                const formatted = parts.length > 0 ? parts.join(', ') : data.display_name;
                if (addressEl) addressEl.innerText = formatted;
                if (manualInput && !manualInput.value) manualInput.placeholder = formatted;
                return;
            }
        }
    } catch (e) {
        console.warn("Nominatim reverse geocode failed, trying BigDataCloud...", e);
    }
    
    // Fallback: Free client reverse geocoder by BigDataCloud (No key required)
    try {
        const res2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (res2.ok) {
            const data2 = await res2.json();
            const parts2 = [];
            if (data2.locality) parts2.push(data2.locality);
            if (data2.city) parts2.push(data2.city);
            if (data2.principalSubdivision) parts2.push(data2.principalSubdivision);
            if (data2.postcode) parts2.push(data2.postcode);
            
            const formatted2 = parts2.length > 0 ? parts2.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            if (addressEl) addressEl.innerText = formatted2;
            if (manualInput && !manualInput.value) manualInput.placeholder = formatted2;
            return;
        }
    } catch (e) {
        console.warn("BigDataCloud reverse geocode failed:", e);
    }
    
    if (addressEl) addressEl.innerText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// Submitting Complaint details
function initSubmitComplaintFlow() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('comp-files');
    const previewContainer = document.getElementById('media-preview-container');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            uploadMediaFile(file);
        });
    });
    
    async function uploadMediaFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/upload-media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                uploadedImages.push(data.file_url);
                showToast("File uploaded", "success");
                
                // Render preview + display OpenCV AI outputs
                const div = document.createElement('div');
                div.className = 'preview-item';
                
                // Extract tag information if AI detected anomalies
                let aiBadge = '';
                if (data.ai_analysis && data.ai_analysis.detected) {
                    aiBadge = `<span class="ai-pill" style="position:absolute; bottom:2px; left:2px; font-size:0.6rem;" title="${data.ai_analysis.details}">
                        <i class="fa-solid fa-brain"></i> AI Verified (${Math.round(data.ai_analysis.confidence * 100)}%)
                    </span>`;
                    showToast(`AI Analysis: ${data.ai_analysis.details}`, 'info');
                }
                
                const previewSrc = (data.file_url && (data.file_url.startsWith('http') || data.file_url.startsWith('data:') || data.file_url.startsWith('blob:'))) ? data.file_url : `${CONFIG.API_BASE_URL.replace('/api', '')}${data.file_url}`;
                div.innerHTML = `
                    <img src="${previewSrc}" alt="preview">
                    ${aiBadge}
                    <button class="remove-btn" type="button" onclick="removeUploadedMedia('${data.file_url}', this)"><i class="fa-solid fa-xmark"></i></button>
                `;
                previewContainer.appendChild(div);
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Error uploading files', 'error');
        }
    }

    // Submit complaint form
    document.getElementById('submit-complaint-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('comp-title').value;
        const description = document.getElementById('comp-desc').value;
        const category = document.getElementById('comp-category').value;
        const lat = parseFloat(document.getElementById('coord-lat').innerText);
        const lng = parseFloat(document.getElementById('coord-lng').innerText);
        let address = document.getElementById('manual-address').value;
        if (!address || address.trim() === '') {
            address = document.getElementById('coord-address').innerText;
        }

        const payload = {
            title,
            description,
            category,
            latitude: lat,
            longitude: lng,
            address,
            images: uploadedImages
        };
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/submit`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if (res.ok) {
                if (data.is_duplicate) {
                    showToast(`Merged: This issue matches duplicate cluster of ${data.duplicate_of}.`, 'warning');
                } else {
                    showToast(`Complaint filed! Unique ID: ${data.complaint.unique_id}. Priority predicted: ${data.ai_insights.predicted_priority}`, 'success');
                }
                
                // Reset form
                document.getElementById('submit-complaint-form').reset();
                previewContainer.innerHTML = '';
                uploadedImages = [];
                
                // Return to dashboard
                document.querySelector('[data-target="section-dashboard"]').click();
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Error registering complaint', 'error');
        }
    });
}

// Window globally scoped remove function
window.removeUploadedMedia = function(fileUrl, element) {
    uploadedImages = uploadedImages.filter(url => url !== fileUrl);
    element.parentElement.remove();
};

// Fetch My Complaints registry
async function loadMyComplaints() {
    const listContainer = document.getElementById('full-complaints-list');
    const statusFilter = document.getElementById('filter-complaints-status').value;
    
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            let list = await res.json();
            
            // Filter locally
            if (statusFilter !== 'All') {
                list = list.filter(c => c.status === statusFilter);
            }
            
            if (list.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 3rem;">No complaints matching requirements.</p>';
                return;
            }
            
            listContainer.innerHTML = '';
            list.forEach(c => {
                const div = document.createElement('div');
                div.className = 'glass-card complaint-item';
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => openComplaintDetail(c.id));
                
                div.innerHTML = `
                    <div class="complaint-meta">
                        <span class="complaint-title" style="font-size:1.2rem;">${c.title}</span>
                        <div class="complaint-subtitle" style="margin-top:0.4rem;">
                            <span><b>ID:</b> ${c.unique_id}</span>
                            <span><b>Category:</b> ${c.category}</span>
                            <span><b>Priority:</b> <span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span></span>
                            <span><b>Date:</b> ${new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span class="badge ${c.status.toLowerCase()}">${c.status}</span>
                `;
                listContainer.appendChild(div);
            });
        }
    } catch (err) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--critical); padding: 3rem;">Failed to connect to backend.</p>';
    }
}

// Bind status filters
document.getElementById('filter-complaints-status').addEventListener('change', loadMyComplaints);

// View Complaint Detail Screen
let detailMap = null;
let detailMarker = null;

window.openComplaintDetail = async function(complaintId) {
    // Hide all other panels
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.getElementById('section-complaint-detail').style.display = 'block';
    document.getElementById('page-title').innerText = 'Complaint Track History';
    
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/details/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            const comp = data.complaint;
            const timeline = data.timeline;
            
            document.getElementById('detail-unique-id').innerText = comp.unique_id;
            document.getElementById('detail-unique-id').setAttribute('data-id', comp.id);
            document.getElementById('detail-delete-btn').style.display = 'block';
            document.getElementById('detail-title').innerText = comp.title;
            document.getElementById('detail-description').innerText = comp.description;
            document.getElementById('detail-category').innerText = comp.category;
            
            // Priority badge classes
            const priorityBadge = document.getElementById('detail-priority-badge');
            priorityBadge.innerText = comp.priority;
            priorityBadge.className = `badge priority-${comp.priority.toLowerCase()}`;
            
            // Status badge classes
            const statusBadge = document.getElementById('detail-status-badge');
            statusBadge.innerText = comp.status;
            statusBadge.className = `badge ${comp.status.toLowerCase()}`;
            
            document.getElementById('detail-created-at').innerText = new Date(comp.created_at).toLocaleDateString();
            document.getElementById('detail-address').innerText = comp.address || 'Coordinates location';
            
            // Department details
            document.getElementById('detail-department').innerText = comp.department_name;
            document.getElementById('detail-officer').innerText = comp.assigned_officer_name;
            document.getElementById('detail-officer-phone').innerText = comp.assigned_officer_phone ? `📞 ${comp.assigned_officer_phone}` : '';
            
            // Attached media rendering
            const gallery = document.getElementById('detail-media-gallery');
            gallery.innerHTML = '';
            if (comp.images && comp.images.length > 0) {
                comp.images.forEach(imgUrl => {
                    const hostUrl = (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('data:') || imgUrl.startsWith('blob:'))) ? imgUrl : CONFIG.API_BASE_URL.replace('/api', '') + imgUrl;
                    const img = document.createElement('img');
                    img.src = hostUrl;
                    img.style.width = '100%';
                    img.style.borderRadius = '8px';
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', () => window.open(hostUrl));
                    gallery.appendChild(img);
                });
            } else {
                gallery.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.9rem;">No media attached.</p>';
            }

            // Remarks
            const remarksCont = document.getElementById('detail-remarks-container');
            const proofCont = document.getElementById('detail-resolution-proof');
            if (comp.remarks || comp.status === 'Resolved') {
                remarksCont.style.display = 'block';
                document.getElementById('detail-remarks').innerText = comp.remarks || 'This issue has been resolved by field staff.';
                
                if (comp.resolution_proof) {
                    proofCont.style.display = 'block';
                    const proofUrl = (comp.resolution_proof && (comp.resolution_proof.startsWith('http') || comp.resolution_proof.startsWith('data:') || comp.resolution_proof.startsWith('blob:'))) ? comp.resolution_proof : `${CONFIG.API_BASE_URL.replace('/api', '')}${comp.resolution_proof}`;
                    proofCont.innerHTML = `<h5 style="margin-bottom:0.25rem;">Resolution Proof</h5><img src="${proofUrl}" style="width:100%; border-radius:6px; cursor:pointer;" onclick="window.open(this.src)"/>`;
                } else {
                    proofCont.style.display = 'none';
                }
            } else {
                remarksCont.style.display = 'none';
            }

            // Feedback controls show/hide
            const feedbackSec = document.getElementById('feedback-section');
            const reopenSec = document.getElementById('reopen-section');
            
            if (comp.status === 'Resolved') {
                reopenSec.style.display = 'block';
                // Check if feedback already submitted in DB
                if (comp.feedback) {
                    feedbackSec.style.display = 'none';
                    remarksCont.insertAdjacentHTML('beforeend', `<div style="margin-top:1rem; color:var(--warning); font-size:0.95rem;"><b>Your Rating:</b> ${'★'.repeat(comp.feedback.rating)}${'☆'.repeat(5-comp.feedback.rating)} <span style="color:var(--text-secondary)">(${comp.feedback.comments || 'No comments'})</span></div>`);
                } else {
                    feedbackSec.style.display = 'block';
                    setupFeedbackRating(comp.id);
                }
            } else {
                feedbackSec.style.display = 'none';
                reopenSec.style.display = 'none';
            }

            // Bind Reopen Event
            const reopenBtn = document.getElementById('reopen-submit-btn');
            reopenBtn.onclick = async () => {
                const reason = document.getElementById('reopen-reason').value;
                if (!reason) {
                    showToast('Please state a reason for reopening', 'warning');
                    return;
                }
                
                try {
                    const rRes = await fetch(`${CONFIG.API_BASE_URL}/complaints/reopen`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ complaint_id: comp.id, remarks: reason })
                    });
                    if (rRes.ok) {
                        showToast('Complaint reopened', 'success');
                        openComplaintDetail(comp.id);
                    }
                } catch (e) {
                    showToast('Network error', 'error');
                }
            };
            
            // Map rendering
            setTimeout(() => {
                if (detailMap) {
                    detailMap.remove();
                }
                detailMap = L.map('detail-map').setView([comp.latitude, comp.longitude], 14);
                CONFIG.addSatelliteOption(detailMap);
                detailMarker = L.marker([comp.latitude, comp.longitude]).addTo(detailMap);
                detailMap.invalidateSize();
            }, 100);
            
            // Wire up Google Street View button in detail view
            const detailStreetviewBtn = document.getElementById('detail-streetview-btn');
            if (detailStreetviewBtn) {
                detailStreetviewBtn.onclick = () => {
                    CONFIG.openStreetView(comp.latitude, comp.longitude);
                };
            }
            
            // Render Tracking timeline logs
            const timelineList = document.getElementById('timeline-list');
            timelineList.innerHTML = '';
            
            if (timeline.length === 0) {
                timelineList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No timeline updates available.</p>';
            } else {
                timeline.forEach(tNode => {
                    const tDiv = document.createElement('div');
                    tDiv.className = 'timeline-event';
                    tDiv.innerHTML = `
                        <div class="timeline-dot"></div>
                        <div class="timeline-time">${new Date(tNode.created_at).toLocaleString()}</div>
                        <div class="timeline-desc"><b>${tNode.action.replace('_', ' ')}</b></div>
                        <div class="timeline-actor">Actor: ${tNode.actor_name} (${tNode.details || ''})</div>
                    `;
                    timelineList.appendChild(tDiv);
                });
            }
        }
    } catch (err) {
        showToast('Error loading details', 'error');
    }
};

// Bind rating star events
let selectedRating = 0;
function setupFeedbackRating(complaintId) {
    const stars = document.querySelectorAll('#star-rating-widget i');
    const submitBtn = document.getElementById('feedback-submit-btn');
    
    stars.forEach(star => {
        star.classList.remove('selected');
        
        star.onmouseover = () => {
            const val = parseInt(star.getAttribute('data-value'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= val) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        };
        
        star.onmouseout = () => {
            stars.forEach(s => s.classList.remove('hover'));
        };
        
        star.onclick = () => {
            selectedRating = parseInt(star.getAttribute('data-value'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-value')) <= selectedRating) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
        };
    });
    
    submitBtn.onclick = async () => {
        if (selectedRating === 0) {
            showToast('Please select a star rating', 'warning');
            return;
        }
        const comments = document.getElementById('feedback-comments').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    complaint_id: complaintId,
                    rating: selectedRating,
                    comments
                })
            });
            if (res.ok) {
                showToast('Feedback submitted successfully. Thank you!', 'success');
                openComplaintDetail(complaintId);
            } else {
                showToast('Failed to submit feedback', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    };
}

// Notifications
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, { // Get updates based on notification list
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Dynamic mock notifications based on active profile for display
        container.innerHTML = `
            <div class="glass-card" style="border-left: 4px solid var(--primary); padding:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin-bottom:0.25rem;">Verify Contact Active</h4>
                    <p style="font-size:0.9rem; color:var(--text-secondary);">Your citizen account was activated. OTP verification check completed.</p>
                </div>
                <span style="font-size:0.8rem; color:var(--text-muted);">Today</span>
            </div>
            <div class="glass-card" style="border-left: 4px solid var(--success); padding:1rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin-bottom:0.25rem;">Smart City Integration Active</h4>
                    <p style="font-size:0.9rem; color:var(--text-secondary);">Your account coordinates are linked to Smart City Map Services.</p>
                </div>
                <span style="font-size:0.8rem; color:var(--text-muted);">Yesterday</span>
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<p>Error fetching alerts.</p>';
    }
}

// AI Chatbot UI Interactivity
function initChatbot() {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const widget = document.getElementById('chat-widget');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    toggleBtn.addEventListener('click', () => {
        widget.classList.add('active');
        toggleBtn.style.display = 'none';
    });
    
    closeBtn.addEventListener('click', () => {
        widget.classList.remove('active');
        toggleBtn.style.display = 'flex';
    });
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMsg = chatInput.value.trim();
        if (!userMsg) return;
        
        // Add User message
        appendMessage(userMsg, 'user');
        chatInput.value = '';
        
        // Loading state
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-bubble bot';
        loadingDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Smart AI is searching...';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await res.json();
            loadingDiv.remove();
            
            if (res.ok) {
                appendMessage(data.reply, 'bot');
            } else {
                appendMessage("I'm having trouble matching that issue. Can you describe it differently?", 'bot');
            }
        } catch (err) {
            loadingDiv.remove();
            appendMessage("AI engine connection timed out. Please check your internet connectivity.", 'bot');
        }
    });
    
    function appendMessage(text, sender) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = text.replace(/\n/g, '<br/>');
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 1. Dedicated Full-screen Complaint Map
let dedicatedMap = null;
function initDedicatedCitizenMap() {
    setTimeout(async () => {
        if (dedicatedMap) {
            dedicatedMap.remove();
            dedicatedMap = null;
        }
        dedicatedMap = L.map('dedicated-citizen-map').setView([currentCoords.lat, currentCoords.lng], 13);
        CONFIG.addSatelliteOption(dedicatedMap);
        setTimeout(() => dedicatedMap.invalidateSize(), 200);
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                list.forEach(c => {
                    let color = '#3b82f6';
                    if (c.priority === 'Critical') color = '#ef4444';
                    else if (c.priority === 'High') color = '#f59e0b';
                    else if (c.priority === 'Low') color = '#94a3b8';
                    
                    const marker = L.circleMarker([c.latitude, c.longitude], {
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.5,
                        radius: 12
                    }).addTo(dedicatedMap);
                    
                    marker.bindPopup(`
                        <div style="font-family: var(--font-body); font-size:0.85rem; color:#000; min-width:160px;">
                            <b>ID:</b> ${c.unique_id}<br/>
                            <b>Title:</b> ${c.title}<br/>
                            <b>Category:</b> ${c.category}<br/>
                            <b>Status:</b> ${c.status}<br/>
                            <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
                                <button onclick="window.parent.openComplaintDetail(${c.id})" style="background:#2563EB; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Details</button>
                                <button onclick="CONFIG.openStreetView(${c.latitude}, ${c.longitude})" style="background:#ea4335; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;"><i class="fa-solid fa-street-view"></i> Street View</button>
                            </div>
                        </div>
                    `);
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, 100);
}
window.initDedicatedCitizenMap = initDedicatedCitizenMap;

// 2. Feedback & Ratings view
window.loadUserFeedbacks = async function() {
    const list = document.getElementById('feedback-history-list');
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/feedbacks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.length === 0) {
                list.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">No feedback responses recorded yet.</p>';
                document.getElementById('feedback-avg-score').innerText = '5.0';
                return;
            }
            
            // Calculate average
            const totalRating = data.reduce((acc, f) => acc + f.rating, 0);
            const avg = (totalRating / data.length).toFixed(1);
            document.getElementById('feedback-avg-score').innerText = avg;
            
            list.innerHTML = '';
            data.forEach(f => {
                const div = document.createElement('div');
                div.className = 'glass-card';
                div.style.padding = '1rem';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>Complaint ID: ${f.complaint_unique_id}</b>
                        <span style="color:var(--warning);">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span>
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">${f.comments || 'No comments left.'}</p>
                `;
                list.appendChild(div);
            });
        }
    } catch (err) {
        list.innerHTML = '<p style="color: var(--critical); font-style: italic;">Error fetching feedback records.</p>';
    }
};

// 3. Dedicated AI Assistant View
let fullChatInitialized = false;
window.initFullChatbot = function() {
    const fullChatMessages = document.getElementById('full-chat-messages');
    const fullChatForm = document.getElementById('full-chat-input-form');
    const fullChatInput = document.getElementById('full-chat-input');
    
    if (fullChatInitialized) return;
    fullChatInitialized = true;
    
    fullChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = fullChatInput.value.trim();
        if (!msg) return;
        
        // Append user msg
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-bubble user';
        userDiv.innerText = msg;
        fullChatMessages.appendChild(userDiv);
        fullChatInput.value = '';
        fullChatMessages.scrollTop = fullChatMessages.scrollHeight;
        
        // Append loading
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-bubble bot';
        loadingDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Smart AI is searching...';
        fullChatMessages.appendChild(loadingDiv);
        fullChatMessages.scrollTop = fullChatMessages.scrollHeight;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            loadingDiv.remove();
            
            const botDiv = document.createElement('div');
            botDiv.className = 'chat-bubble bot';
            botDiv.innerHTML = data.reply.replace(/\n/g, '<br/>');
            fullChatMessages.appendChild(botDiv);
            fullChatMessages.scrollTop = fullChatMessages.scrollHeight;
        } catch (err) {
            loadingDiv.remove();
            const errDiv = document.createElement('div');
            errDiv.className = 'chat-bubble bot';
            errDiv.innerText = "AI assistant timed out. Please verify connectivity.";
            fullChatMessages.appendChild(errDiv);
            fullChatMessages.scrollTop = fullChatMessages.scrollHeight;
        }
    });
};

// 4. Complaint History timeline
window.loadUserAuditLogs = async function() {
    const timelineList = document.getElementById('user-audit-list');
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            if (list.length === 0) {
                timelineList.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; font-style:italic;">No historical updates available yet.</p>';
                return;
            }
            
            timelineList.innerHTML = '';
            list.forEach(t => {
                const div = document.createElement('div');
                div.className = 'timeline-event';
                div.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-time">${new Date(t.created_at).toLocaleString()}</div>
                    <div class="timeline-desc"><b>${t.action.replace('_', ' ')}</b></div>
                    <div class="timeline-actor">Details: ${t.details || ''}</div>
                `;
                timelineList.appendChild(div);
            });
        }
    } catch (err) {
        timelineList.innerHTML = '<p style="color:var(--critical); font-style:italic;">Error loading history timeline.</p>';
    }
};

// 5. Settings Configuration
let settingsInitialized = false;
window.initSettingsView = function() {
    if (settingsInitialized) return;
    settingsInitialized = true;
    
    const themeSelect = document.getElementById('settings-theme');
    themeSelect.value = localStorage.getItem('theme') || 'dark';
    
    themeSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        document.documentElement.setAttribute('data-theme', selected);
        localStorage.setItem('theme', selected);
        
        // Sync header theme toggle button
        const sun = document.getElementById('theme-sun');
        const moon = document.getElementById('theme-moon');
        if (selected === 'dark') {
            sun.style.display = 'none';
            moon.style.display = 'block';
        } else {
            sun.style.display = 'block';
            moon.style.display = 'none';
        }
        showToast(`Theme mode updated to ${selected}`, 'success');
    });
};

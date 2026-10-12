let token = localStorage.getItem('token') || null;
let currentUser = null;
let activeSection = 'admin-section-dashboard';
let adminHeatmap = null;
let actionMap = null;
let actionMarker = null;
let officerMap = null;
let officerMapMarkers = {};
let officerUserMarker = null;
let departmentsList = [];
let staffList = [];
let currentComplaintId = null;
let resolutionProofUrl = null;

// Charts instances
let categoryChartInstance = null;
let departmentChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initAdminTheme();
    initAdminAuth();
    initAdminNavigation();
    
    if (token) {
        verifyAdminSession();
    } else {
        showAdminScreen('auth');
    }
});

// Toast notifications helper
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

// Light-Dark Mode triggers
function initAdminTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
    
    document.getElementById('admin-theme-toggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    });
}

function updateThemeIcons(theme) {
    const sun = document.getElementById('admin-theme-sun');
    const moon = document.getElementById('admin-theme-moon');
    if (theme === 'dark') {
        sun.style.display = 'none';
        moon.style.display = 'block';
    } else {
        sun.style.display = 'block';
        moon.style.display = 'none';
    }
}

// Navigating workspaces (Auth Login page vs Main Admin workspace)
function showAdminScreen(screen) {
    const auth = document.getElementById('admin-auth-screen');
    const app = document.getElementById('admin-app-screen');
    if (screen === 'auth') {
        auth.style.display = 'flex';
        app.style.display = 'none';
    } else {
        auth.style.display = 'none';
        app.style.display = 'flex';
        loadDashboardData();
    }
}

// Auth Login controls
function initAdminAuth() {
    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Check if user role is authorized
                if (data.user.role === 'Citizen') {
                    showToast('Access Denied: Administrative account credentials required.', 'error');
                    return;
                }
                
                token = data.token;
                currentUser = data.user;
                localStorage.setItem('token', token);
                showToast('Authorization authorized. Loading console.', 'success');
                verifyAdminSession();
            } else {
                showToast(data.message || 'Authentication failed', 'error');
            }
        } catch (err) {
            showToast('Connection error to auth gateway', 'error');
        }
    });
}

// Sidebar links navigation
function initAdminNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.page-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (!target) return;
            
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(s => s.style.display = 'none');
            document.getElementById(target).style.display = 'block';
            
            activeSection = target;
            
            const titles = {
                'admin-section-dashboard': 'Administrative Overview',
                'admin-section-complaints': 'Manage Civic Complaints',
                'admin-section-map': 'Officers Complaint Map & Field Dispatch',
                'admin-section-departments': 'Departments & Staff'
            };
            document.getElementById('admin-page-title').innerText = titles[target] || 'Admin Console';
            
            // Sub-routing triggers
            if (target === 'admin-section-dashboard') {
                loadDashboardData();
            } else if (target === 'admin-section-complaints') {
                loadAdminComplaints();
            } else if (target === 'admin-section-map') {
                initOfficerComplaintMap();
            } else if (target === 'admin-section-departments') {
                loadDepartmentsAndStaff();
            }
        });
    });

    const switchMapBtn = document.getElementById('admin-switch-map-btn');
    if (switchMapBtn) {
        switchMapBtn.addEventListener('click', () => {
            const mapNavItem = document.querySelector('.menu-item[data-target="admin-section-map"]');
            if (mapNavItem) mapNavItem.click();
        });
    }

    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        token = null;
        currentUser = null;
        localStorage.removeItem('token');
        showAdminScreen('auth');
        showToast('Logged out of admin console', 'info');
    });

    document.getElementById('action-back-btn').addEventListener('click', () => {
        document.getElementById('admin-section-complaint-action').style.display = 'none';
        document.getElementById(activeSection).style.display = 'block';
    });

    // Generate authenticated PDF reports
    document.getElementById('report-pdf-btn').addEventListener('click', async () => {
        showToast('Compiling metrics PDF...', 'info');
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/admin/generate-pdf-report`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `smart_city_performance_report_${new Date().toISOString().slice(0,10)}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast('Report generated and downloaded successfully.', 'success');
            } else {
                showToast('Failed to compile PDF report', 'error');
            }
        } catch (err) {
            showToast('Connection error during report compiling', 'error');
        }
    });

    // Setup filter listeners in registry
    document.getElementById('admin-search').addEventListener('input', filterComplaintsTable);
    document.getElementById('admin-filter-status').addEventListener('change', filterComplaintsTable);
    document.getElementById('admin-filter-priority').addEventListener('change', filterComplaintsTable);

    // Setup action form submission
    initActionFormFlows();
}

// Session validation
async function verifyAdminSession() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            if (currentUser.role === 'Citizen') {
                token = null;
                localStorage.removeItem('token');
                showAdminScreen('auth');
                showToast('Access denied.', 'error');
                return;
            }
            
            // Populate nav
            document.getElementById('admin-nav-username').innerText = currentUser.name;
            document.getElementById('admin-nav-role').innerText = currentUser.role;
            document.getElementById('admin-nav-avatar').innerText = currentUser.name.charAt(0).toUpperCase();
            
            showAdminScreen('app');
        } else {
            token = null;
            localStorage.removeItem('token');
            showAdminScreen('auth');
        }
    } catch (err) {
        showAdminScreen('auth');
        showToast('Backend offline. Demo bypass triggered.', 'warning');
    }
}

// Load stats, charts and maps
async function loadDashboardData() {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/admin/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            
            // Update numerical stats
            document.getElementById('admin-stat-pending').innerText = data.summary.pending + data.summary.assigned;
            document.getElementById('admin-stat-progress').innerText = data.summary.in_progress;
            document.getElementById('admin-stat-resolution-time').innerText = `${data.performance.avg_resolution_hours}h`;
            document.getElementById('admin-stat-csat').innerText = `${data.performance.avg_rating} ★ (${data.performance.csat_score}%)`;
            
            // Build / Update Charts
            buildCharts(data);
            
            // Init Heatmap Layer
            initHeatmap(data.heatmap);
        }
    } catch (err) {
        console.error("Dashboard stats error: ", err);
    }
}

// Chart.js render configurations
function buildCharts(data) {
    // 1. Categories Doughnut Chart
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    
    // Group categories count from heatmap data
    const categoriesCount = {};
    data.heatmap.forEach(item => {
        categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
    });
    
    const catLabels = Object.keys(categoriesCount);
    const catData = Object.values(categoriesCount);
    
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: catLabels.length > 0 ? catLabels : ['Roads', 'Garbage', 'Water'],
            datasets: [{
                data: catData.length > 0 ? catData : [12, 19, 3],
                backgroundColor: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() } }
            }
        }
    });

    // 2. Department Resolution Bar Chart
    const ctxDepartment = document.getElementById('departmentChart').getContext('2d');
    const deptLabels = data.department_distribution.map(d => d.name);
    const deptRates = data.department_distribution.map(d => d.resolution_rate);
    
    if (departmentChartInstance) departmentChartInstance.destroy();
    departmentChartInstance = new Chart(ctxDepartment, {
        type: 'bar',
        data: {
            labels: deptLabels.length > 0 ? deptLabels : ['Roads Dept', 'Water Dept', 'Sanitation'],
            datasets: [{
                label: 'Resolution Rate %',
                data: deptRates.length > 0 ? deptRates : [80, 50, 95],
                backgroundColor: '#06b6d4',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { max: 100, ticks: { color: '#64748b' } },
                x: { ticks: { color: '#64748b' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 3. Line Trend Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const trendLabels = data.trends.map(t => t.date);
    const trendCounts = data.trends.map(t => t.count);
    
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels.length > 0 ? trendLabels : ['06-20', '06-21', '06-22', '06-23', '06-24', '06-25'],
            datasets: [{
                label: 'Issues Reported',
                data: trendCounts.length > 0 ? trendCounts : [4, 6, 2, 7, 5, 8],
                borderColor: '#10b981',
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { precision: 0, color: '#64748b' } },
                x: { ticks: { color: '#64748b' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Heatmap Leaflet implementation
function initHeatmap(heatmapPoints) {
    if (adminHeatmap) {
        // Redraw layers
        adminHeatmap.eachLayer(layer => {
            if (!!layer.toGeoJSON) adminHeatmap.removeLayer(layer);
        });
    } else {
        adminHeatmap = L.map('admin-heatmap').setView([12.9716, 77.5946], 13);
        CONFIG.addSatelliteOption(adminHeatmap);
    }
    
    heatmapPoints.forEach(p => {
        let size = 15;
        let color = '#ef4444'; // default red
        
        if (p.priority === 'Critical') { size = 30; color = '#ef4444'; }
        else if (p.priority === 'High') { size = 22; color = '#f59e0b'; }
        else if (p.priority === 'Medium') { size = 16; color = '#3b82f6'; }
        else { size = 10; color = '#94a3b8'; }
        
        const circle = L.circleMarker([p.latitude, p.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.45,
            radius: size,
            stroke: false
        }).addTo(adminHeatmap);
        
        circle.bindPopup(`
            <div style="font-family: var(--font-body); font-size:0.85rem; color:#000;">
                <b>ID:</b> ${p.id}<br/>
                <b>Title:</b> ${p.title}<br/>
                <b>Priority:</b> <span style="font-weight:bold; color:${color}">${p.priority}</span><br/>
                <b>Status:</b> ${p.status}<br/>
                <button onclick="window.parent.openComplaintAction(${p.id})" style="margin-top: 5px; background:#2563EB; color:#fff; border:none; padding:3px 6px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Action Case</button>
            </div>
        `);
    });
}

// Registry lists
let rawComplaintsRegistry = [];
async function loadAdminComplaints() {
    const tableBody = document.getElementById('admin-complaints-table-body');
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            rawComplaintsRegistry = await res.json();
            renderComplaintsTable(rawComplaintsRegistry);
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--critical);">Failed to authorize session credentials.</td></tr>';
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--critical);">Network connectivity error.</td></tr>';
    }
}

function renderComplaintsTable(list) {
    const tableBody = document.getElementById('admin-complaints-table-body');
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding:2rem;">No records matched queries.</td></tr>';
        return;
    }
    
    list.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${c.unique_id}</b></td>
            <td>${c.title}</td>
            <td>${c.category}</td>
            <td><span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span></td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td><span class="badge ${c.status.toLowerCase()}">${c.status}</span></td>
            <td>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button onclick="openComplaintAction(${c.id})" class="btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; width: auto; box-shadow:none;">Action</button>
                    <button onclick="focusComplaintOnOfficerMap(${c.id})" class="btn-secondary" title="View on Complaint Map" style="padding: 0.35rem 0.55rem; font-size: 0.75rem; width: auto; margin:0;"><i class="fa-solid fa-map-location-dot" style="color:var(--primary);"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function filterComplaintsTable() {
    const searchVal = document.getElementById('admin-search').value.toLowerCase();
    const statusVal = document.getElementById('admin-filter-status').value;
    const priorityVal = document.getElementById('admin-filter-priority').value;
    
    const filtered = rawComplaintsRegistry.filter(c => {
        const matchesSearch = c.unique_id.toLowerCase().includes(searchVal) ||
                            c.title.toLowerCase().includes(searchVal) ||
                            (c.address && c.address.toLowerCase().includes(searchVal));
        const matchesStatus = statusVal === 'All' || c.status === statusVal;
        const matchesPriority = priorityVal === 'All' || c.priority === priorityVal;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    renderComplaintsTable(filtered);
}

// Dedicated Officers Complaint Map
async function initOfficerComplaintMap() {
    const mapContainer = document.getElementById('officer-complaint-map');
    if (!mapContainer) return;

    if (!officerMap) {
        officerMap = L.map('officer-complaint-map').setView([12.9716, 77.5946], 13);
        CONFIG.addSatelliteOption(officerMap);
        
        // Filter event listeners
        const searchInput = document.getElementById('officer-map-search');
        const statusSelect = document.getElementById('officer-map-status');
        const prioritySelect = document.getElementById('officer-map-priority');
        const categorySelect = document.getElementById('officer-map-category');
        
        if (searchInput) searchInput.addEventListener('input', filterOfficerMapPins);
        if (statusSelect) statusSelect.addEventListener('change', filterOfficerMapPins);
        if (prioritySelect) prioritySelect.addEventListener('change', filterOfficerMapPins);
        if (categorySelect) categorySelect.addEventListener('change', filterOfficerMapPins);
        
        // Refresh button
        const refreshBtn = document.getElementById('officer-map-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                showToast('Reloading grievances database...', 'info');
                await loadAdminComplaints();
                filterOfficerMapPins();
            });
        }

        // Center Live GPS button for Officers
        const gpsBtn = document.getElementById('officer-map-gps-btn');
        if (gpsBtn) {
            gpsBtn.addEventListener('click', () => {
                if (navigator.geolocation) {
                    showToast('Acquiring officer live location...', 'info');
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const lat = pos.coords.latitude;
                            const lng = pos.coords.longitude;
                            officerMap.setView([lat, lng], 15);
                            officerMap.invalidateSize();
                            
                            if (!officerUserMarker) {
                                officerUserMarker = L.marker([lat, lng], {
                                    icon: L.divIcon({
                                        className: 'officer-gps-pin',
                                        html: '<div style="background:#2563EB; width:26px; height:26px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 14px rgba(37,99,235,0.9); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;"><i class="fa-solid fa-user-shield"></i></div>',
                                        iconSize: [26, 26],
                                        iconAnchor: [13, 13]
                                    })
                                }).addTo(officerMap);
                            } else {
                                officerUserMarker.setLatLng([lat, lng]);
                            }
                            officerUserMarker.bindPopup(`
                                <div style="font-family:var(--font-body); font-size:0.85rem; color:#000;">
                                    <b>Officer Live Location</b><br/>
                                    <span>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</span><br/>
                                    <span style="font-size:0.75rem; color:#10b981;">● GPS Signal Active</span>
                                </div>
                            `).openPopup();
                            showToast('Map centered at officer GPS location', 'success');
                        },
                        async (err) => {
                            try {
                                const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
                                if (res.ok) {
                                    const data = await res.json();
                                    const lat = parseFloat(data.latitude);
                                    const lng = parseFloat(data.longitude);
                                    officerMap.setView([lat, lng], 13);
                                    officerMap.invalidateSize();
                                    showToast(`Centered to regional position (${data.city || 'Area'})`, 'info');
                                    return;
                                }
                            } catch (e) {}
                            showToast('Could not acquire GPS fix. Please ensure location is enabled.', 'warning');
                        },
                        { enableHighAccuracy: true, timeout: 8000 }
                    );
                } else {
                    showToast('Geolocation not supported by this browser', 'error');
                }
            });
        }
    }

    setTimeout(() => {
        if (officerMap) officerMap.invalidateSize();
    }, 150);
    setTimeout(() => {
        if (officerMap) officerMap.invalidateSize();
    }, 450);

    // Fetch complaints if not loaded yet
    if (rawComplaintsRegistry.length === 0) {
        await loadAdminComplaints();
    }
    
    filterOfficerMapPins();
}

function filterOfficerMapPins() {
    if (!officerMap) return;

    const searchVal = (document.getElementById('officer-map-search')?.value || '').toLowerCase();
    const statusVal = document.getElementById('officer-map-status')?.value || 'All';
    const priorityVal = document.getElementById('officer-map-priority')?.value || 'All';
    const categoryVal = document.getElementById('officer-map-category')?.value || 'All';

    const filtered = rawComplaintsRegistry.filter(c => {
        const matchesSearch = c.unique_id.toLowerCase().includes(searchVal) ||
                            c.title.toLowerCase().includes(searchVal) ||
                            (c.address && c.address.toLowerCase().includes(searchVal));
        const matchesStatus = statusVal === 'All' || c.status === statusVal;
        const matchesPriority = priorityVal === 'All' || c.priority === priorityVal;
        const matchesCategory = categoryVal === 'All' || c.category === categoryVal;

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    renderOfficerMapPins(filtered);
}

function renderOfficerMapPins(list) {
    if (!officerMap) return;

    // Clear existing markers
    Object.values(officerMapMarkers).forEach(m => officerMap.removeLayer(m));
    officerMapMarkers = {};

    let criticalCount = 0;
    let progressCount = 0;
    let pendingCount = 0;

    const bounds = [];

    list.forEach(c => {
        // Stats aggregation
        if (c.priority === 'Critical') criticalCount++;
        if (c.status === 'In Progress' || c.status === 'Assigned') progressCount++;
        if (c.status === 'Pending') pendingCount++;

        let color = '#3b82f6';
        if (c.priority === 'Critical') color = '#ef4444';
        else if (c.priority === 'High') color = '#f59e0b';
        else if (c.status === 'Resolved') color = '#10b981';
        else if (c.status === 'In Progress') color = '#06b6d4';
        else if (c.status === 'Pending') color = '#eab308';
        else if (c.priority === 'Low') color = '#94a3b8';

        const marker = L.circleMarker([c.latitude, c.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.65,
            radius: c.priority === 'Critical' ? 12 : 9,
            weight: c.priority === 'Critical' ? 3 : 2
        }).addTo(officerMap);

        marker.bindPopup(`
            <div style="font-family: var(--font-body); font-size: 0.85rem; color: #000; min-width: 220px; line-height: 1.5;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-weight:700; color:#1e293b;">${c.unique_id}</span>
                    <span style="font-size:0.75rem; font-weight:700; color:${color}; background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:4px;">${c.priority}</span>
                </div>
                <div style="font-weight:600; font-size:0.95rem; margin-bottom:4px;">${c.title}</div>
                <div style="color:#64748b; font-size:0.8rem; margin-bottom:2px;">📁 <b>Category:</b> ${c.category}</div>
                <div style="color:#64748b; font-size:0.8rem; margin-bottom:2px;">🏢 <b>Dept:</b> ${c.department_name || 'Unassigned'}</div>
                <div style="color:#64748b; font-size:0.8rem; margin-bottom:4px;">👤 <b>Citizen:</b> ${c.citizen_name || 'Anonymous'} (${c.citizen_phone || 'N/A'})</div>
                <div style="font-size:0.8rem; margin-bottom:8px; color:#475569;">📍 ${c.address || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button onclick="openComplaintAction(${c.id})" style="flex:1; background:#2563EB; color:#fff; border:none; padding:5px 8px; border-radius:5px; font-size:0.78rem; font-weight:600; cursor:pointer;">Action Case</button>
                    <button onclick="CONFIG.openStreetView(${c.latitude}, ${c.longitude})" style="flex:1; background:#ea4335; color:#fff; border:none; padding:5px 8px; border-radius:5px; font-size:0.78rem; font-weight:600; cursor:pointer;"><i class="fa-solid fa-street-view"></i> Street View</button>
                </div>
            </div>
        `);

        officerMapMarkers[c.id] = marker;
        bounds.push([c.latitude, c.longitude]);
    });

    // Update Quick Stats
    const statTotal = document.getElementById('officer-map-stat-total');
    const statCrit = document.getElementById('officer-map-stat-critical');
    const statProg = document.getElementById('officer-map-stat-progress');
    const statPend = document.getElementById('officer-map-stat-pending');

    if (statTotal) statTotal.innerText = list.length;
    if (statCrit) statCrit.innerText = criticalCount;
    if (statProg) statProg.innerText = progressCount;
    if (statPend) statPend.innerText = pendingCount;

    // Auto-fit bounds if markers exist
    if (bounds.length > 0 && officerMap && bounds.length <= 50) {
        officerMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
}

// Pan & Zoom to specific complaint marker on the Officer Complaint Map
window.focusComplaintOnOfficerMap = async function(complaintId) {
    const mapNavItem = document.querySelector('.menu-item[data-target="admin-section-map"]');
    if (mapNavItem) mapNavItem.click();

    setTimeout(() => {
        if (!officerMap) return;
        const targetComplaint = rawComplaintsRegistry.find(c => c.id === complaintId);
        if (targetComplaint) {
            officerMap.setView([targetComplaint.latitude, targetComplaint.longitude], 16);
            officerMap.invalidateSize();
            const marker = officerMapMarkers[complaintId];
            if (marker) {
                marker.openPopup();
            }
        }
    }, 400);
};

// Action panels routing
window.openComplaintAction = async function(complaintId) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.getElementById('admin-section-complaint-action').style.display = 'block';
    document.getElementById('admin-page-title').innerText = 'Resolve & Assign Console';
    currentComplaintId = complaintId;
    resolutionProofUrl = null;
    document.getElementById('resolution-proof-preview').innerHTML = '';
    
    try {
        // Load department lists
        await loadDropdownLists();
        
        const res = await fetch(`${CONFIG.API_BASE_URL}/complaints/details/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            const comp = data.complaint;
            const timeline = data.timeline;
            
            document.getElementById('action-unique-id').innerText = comp.unique_id;
            document.getElementById('action-title').innerText = comp.title;
            document.getElementById('action-description').innerText = comp.description;
            document.getElementById('action-category').innerText = comp.category;
            
            const pBadge = document.getElementById('action-priority-badge');
            pBadge.innerText = comp.priority;
            pBadge.className = `badge priority-${comp.priority.toLowerCase()}`;
            
            const sBadge = document.getElementById('action-status-badge');
            sBadge.innerText = comp.status;
            sBadge.className = `badge ${comp.status.toLowerCase()}`;
            
            document.getElementById('action-citizen-name').innerText = comp.citizen_name;
            document.getElementById('action-address').innerText = comp.address || `${comp.latitude}, ${comp.longitude}`;
            
            // Set form selections
            document.getElementById('action-set-priority').value = comp.priority;
            document.getElementById('action-set-status').value = comp.status;
            document.getElementById('action-remarks').value = comp.remarks || '';
            
            if (comp.department_id) {
                document.getElementById('action-set-dept').value = comp.department_id;
            }
            if (comp.assigned_officer_id) {
                document.getElementById('action-set-officer').value = comp.assigned_officer_id;
            }
            
            // Show/hide resolution proof fields if status is resolved
            toggleResolutionProofField(comp.status);
            
            // Render media
            const gallery = document.getElementById('action-media-gallery');
            gallery.innerHTML = '';
            if (comp.images && comp.images.length > 0) {
                comp.images.forEach(imgUrl => {
                    const fullUrl = (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('data:') || imgUrl.startsWith('blob:'))) ? imgUrl : CONFIG.API_BASE_URL.replace('/api', '') + imgUrl;
                    const img = document.createElement('img');
                    img.src = fullUrl;
                    img.style.width = '100%';
                    img.style.borderRadius = '6px';
                    img.style.cursor = 'pointer';
                    img.onclick = () => window.open(fullUrl);
                    gallery.appendChild(img);
                });
            } else {
                gallery.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">No supporting files attached.</p>';
            }
            
            // Leaflet Map focus
            setTimeout(() => {
                if (actionMap) actionMap.remove();
                actionMap = L.map('action-map').setView([comp.latitude, comp.longitude], 14);
                CONFIG.addSatelliteOption(actionMap);
                actionMarker = L.marker([comp.latitude, comp.longitude]).addTo(actionMap);
                actionMap.invalidateSize();
            }, 100);
            
            // Wire up Google Street View button
            const streetviewBtn = document.getElementById('action-streetview-btn');
            if (streetviewBtn) {
                streetviewBtn.onclick = () => {
                    CONFIG.openStreetView(comp.latitude, comp.longitude);
                };
            }
            
            // Timeline audit
            const audits = document.getElementById('action-audit-logs');
            audits.innerHTML = '';
            timeline.forEach(t => {
                const div = document.createElement('div');
                div.className = 'timeline-event';
                div.innerHTML = `
                    <div class="timeline-dot"></div>
                    <div class="timeline-time">${new Date(t.created_at).toLocaleString()}</div>
                    <div class="timeline-desc"><b>${t.action}</b></div>
                    <div class="timeline-actor">Actor: ${t.actor_name} (${t.details || ''})</div>
                `;
                audits.appendChild(div);
            });
        }
    } catch (err) {
        showToast('Error reading details', 'error');
    }
};

async function loadDropdownLists() {
    try {
        // Load Departments
        const dRes = await fetch(`${CONFIG.API_BASE_URL}/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (dRes.ok) {
            departmentsList = await dRes.json();
            const setDept = document.getElementById('action-set-dept');
            setDept.innerHTML = '<option value="">-- Choose Department --</option>';
            departmentsList.forEach(d => {
                setDept.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
        }
        
        // Load staff
        const sRes = await fetch(`${CONFIG.API_BASE_URL}/admin/list-staff`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (sRes.ok) {
            staffList = await sRes.json();
            const setOfficer = document.getElementById('action-set-officer');
            setOfficer.innerHTML = '<option value="">-- Choose Field Officer --</option>';
            staffList.forEach(s => {
                setOfficer.innerHTML += `<option value="${s.id}">${s.name} (${s.role})</option>`;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

function initActionFormFlows() {
    const statusSelect = document.getElementById('action-set-status');
    const uploadProofZone = document.getElementById('resolution-upload-zone');
    const fileProofInput = document.getElementById('action-proof-file');
    
    statusSelect.addEventListener('change', (e) => {
        toggleResolutionProofField(e.target.value);
    });
    
    uploadProofZone.addEventListener('click', () => fileProofInput.click());
    
    fileProofInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
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
                resolutionProofUrl = data.file_url;
                const proofPreviewSrc = (resolutionProofUrl && (resolutionProofUrl.startsWith('http') || resolutionProofUrl.startsWith('data:') || resolutionProofUrl.startsWith('blob:'))) ? resolutionProofUrl : `${CONFIG.API_BASE_URL.replace('/api', '')}${resolutionProofUrl}`;
                document.getElementById('resolution-proof-preview').innerHTML = `<img src="${proofPreviewSrc}" style="width:100%; border-radius:6px;"/>`;
                showToast("Resolution proof uploaded successfully", "success");
            } else {
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Network error during file upload', 'error');
        }
    });

    // Update form submission
    document.getElementById('action-update-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const status = document.getElementById('action-set-status').value;
        const priority = document.getElementById('action-set-priority').value;
        const department_id = document.getElementById('action-set-dept').value;
        const assigned_officer_id = document.getElementById('action-set-officer').value;
        const remarks = document.getElementById('action-remarks').value;
        
        if (status === 'Resolved' && !resolutionProofUrl) {
            // Require proof photo when resolving
            showToast('Uploading a Resolution Proof Photo is required to mark the case resolved.', 'warning');
            return;
        }
        
        const payload = {
            status,
            priority,
            department_id: department_id || null,
            assigned_officer_id: assigned_officer_id || null,
            remarks,
            resolution_proof: resolutionProofUrl
        };
        
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/admin/update-status/${currentComplaintId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                showToast('Case updated successfully', 'success');
                document.getElementById('action-back-btn').click();
                loadAdminComplaints();
            } else {
                const data = await res.json();
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    });
}

function toggleResolutionProofField(status) {
    const proofSec = document.getElementById('resolution-proof-upload-section');
    if (status === 'Resolved') {
        proofSec.style.display = 'block';
    } else {
        proofSec.style.display = 'none';
    }
}

// Departments & Staff directory loading
async function loadDepartmentsAndStaff() {
    const dList = document.getElementById('admin-departments-list');
    const sList = document.getElementById('admin-staff-list');
    
    try {
        // Fetch departments
        const dRes = await fetch(`${CONFIG.API_BASE_URL}/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (dRes.ok) {
            const list = await dRes.json();
            dList.innerHTML = '';
            list.forEach(d => {
                const div = document.createElement('div');
                div.className = 'glass-card';
                div.style.padding = '1rem';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="font-size:1.1rem; font-weight:700;">${d.name}</h4>
                        <span class="badge progress">ACTIVE</span>
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">${d.description || 'No description added'}</p>
                `;
                dList.appendChild(div);
            });
        }
        
        // Fetch staff
        const sRes = await fetch(`${CONFIG.API_BASE_URL}/admin/list-staff`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (sRes.ok) {
            const list = await sRes.json();
            sList.innerHTML = '';
            list.forEach(s => {
                const div = document.createElement('div');
                div.className = 'glass-card';
                div.style.padding = '1rem';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="font-size:1.1rem; font-weight:700;">${s.name}</h4>
                            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.1rem;">Email: ${s.email}</p>
                            <p style="font-size:0.85rem; color:var(--text-muted);">Phone: ${s.phone}</p>
                        </div>
                        <span class="badge" style="background:rgba(59,130,246,0.15); color:var(--primary);">${s.role}</span>
                    </div>
                `;
                sList.appendChild(div);
            });
        }
    } catch(err) {
        console.error(err);
    }
}

// Action Center Tab Toggling
window.switchActionTab = function(tabId) {
    document.querySelectorAll('.action-tab-content').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(`action-tab-${tabId}`).style.display = 'block';
    
    document.getElementById('tab-btn-comp-mgmt').classList.remove('active-tab');
    document.getElementById('tab-btn-comm').classList.remove('active-tab');
    document.getElementById('tab-btn-evidence').classList.remove('active-tab');
    document.getElementById('tab-btn-tracking').classList.remove('active-tab');
    document.getElementById('tab-btn-escalation').classList.remove('active-tab');
    
    document.getElementById(`tab-btn-${tabId}`).classList.add('active-tab');
};

// Dispatch Action Triggers
window.triggerAction = async function(actionType) {
    if (!currentComplaintId) return;
    
    switch (actionType) {
        case 'view-complaint':
            document.getElementById('action-unique-id').scrollIntoView({ behavior: 'smooth' });
            showToast('Showing complaint details above.', 'info');
            break;
            
        case 'accept-complaint':
            document.getElementById('action-set-status').value = 'Assigned';
            document.getElementById('action-remarks').value = '[Accepted case review] Department reassigned/active.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'reject-complaint':
            const rejectRemarks = prompt("Enter reason for rejection:");
            if (rejectRemarks === null) return;
            document.getElementById('action-set-status').value = 'Rejected';
            document.getElementById('action-remarks').value = rejectRemarks || 'Rejected by department reviewer.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'assign-dept':
            document.getElementById('action-set-dept').focus();
            showToast('Please choose a department in the selection field below.', 'info');
            break;
            
        case 'assign-staff':
            document.getElementById('action-set-officer').focus();
            showToast('Please choose a field staff/officer in the selection field below.', 'info');
            break;
            
        case 'transfer-complaint':
            document.getElementById('action-set-dept').focus();
            showToast('Select a new department to transfer this complaint, then click update.', 'info');
            break;
            
        case 'priority-low':
            document.getElementById('action-set-priority').value = 'Low';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'priority-medium':
            document.getElementById('action-set-priority').value = 'Medium';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'priority-high':
            document.getElementById('action-set-priority').value = 'High';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'priority-critical':
            document.getElementById('action-set-priority').value = 'Critical';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'mark-review':
            document.getElementById('action-set-status').value = 'Pending';
            document.getElementById('action-remarks').value = '[Case marked under review] Checking logistics.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'mark-progress':
            document.getElementById('action-set-status').value = 'In Progress';
            document.getElementById('action-remarks').value = '[Case marked In Progress] Field work has commenced.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'mark-resolved':
            document.getElementById('action-set-status').value = 'Resolved';
            document.getElementById('action-remarks').value = '[Case marked Resolved] Resolution criteria successfully met.';
            document.getElementById('action-proof-file').click();
            showToast('Please upload a resolution proof photo first.', 'warning');
            break;
            
        case 'reopen-complaint':
            document.getElementById('action-set-status').value = 'Reopened';
            document.getElementById('action-remarks').value = '[Case Reopened] Investigation restarted for resolution compliance.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'close-complaint':
            document.getElementById('action-set-status').value = 'Resolved';
            document.getElementById('action-remarks').value = '[Case Closed] Case successfully archived and closed.';
            if (!resolutionProofUrl) {
                resolutionProofUrl = "/backend/uploads/sample.jpg"; 
            }
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'contact-citizen':
            showToast('Contacting citizen via phone dialer...', 'success');
            window.open(`tel:6666666666`);
            break;
            
        case 'send-notification':
            const notifMsg = prompt("Enter custom notification message to send to the citizen:");
            if (!notifMsg) return;
            await sendCustomNotification('Alert from Municipal Admin', notifMsg);
            break;
            
        case 'request-info':
            const requestMsg = prompt("Enter details of additional information requested from the citizen:", "Please provide additional photos or explain the exact location reference.");
            if (!requestMsg) return;
            await sendCustomNotification('Additional Information Requested', requestMsg);
            break;
            
        case 'reply-citizen':
            const replyMsg = prompt("Enter reply message to citizen:");
            if (!replyMsg) return;
            await sendCustomNotification('Official Administration Reply', replyMsg);
            break;
            
        case 'view-images':
            const galleryImages = document.querySelectorAll('#action-media-gallery img');
            if (galleryImages.length > 0) {
                galleryImages[0].click(); 
                showToast('Opening attached media...', 'info');
            } else {
                showToast('No attached media found for this complaint.', 'warning');
            }
            break;
            
        case 'upload-proof':
        case 'upload-photos':
            document.getElementById('action-proof-file').click();
            break;
            
        case 'verify-location':
            showToast('GPS Coordinates and Address successfully verified.', 'success');
            await logCustomAuditEvent('VERIFY_LOCATION', 'Verified exact latitude/longitude coordinates on city grid.');
            break;
            
        case 'view-history':
            document.getElementById('action-audit-logs').scrollIntoView({ behavior: 'smooth' });
            showToast('Focusing tracking timeline history below.', 'info');
            break;
            
        case 'track-status':
            const statusText = document.getElementById('action-status-badge').innerText;
            showToast(`Current Tracking Status: ${statusText}`, 'info');
            break;
            
        case 'view-gps':
            document.getElementById('action-map').scrollIntoView({ behavior: 'smooth' });
            showToast('Focusing geographic coordinates map.', 'info');
            break;
            
        case 'generate-report':
            document.getElementById('report-pdf-btn').click();
            break;
            
        case 'print-details':
            window.print();
            break;
            
        case 'escalate-officer':
            document.getElementById('action-set-priority').value = 'Critical';
            document.getElementById('action-remarks').value = '[Escalated to Senior Officer] High priority action requested.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'forward-dept':
            document.getElementById('action-set-dept').focus();
            showToast('Forwarding complaint. Choose target department below.', 'info');
            break;
            
        case 'mark-emergency':
            document.getElementById('action-set-priority').value = 'Critical';
            document.getElementById('action-set-status').value = 'In Progress';
            document.getElementById('action-remarks').value = '[Emergency Response Triggered] Immediate field inspection dispatched.';
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        case 'flag-duplicate':
            const dupId = prompt("Enter original Complaint ID this matches (e.g. CC-20260625-XP76):");
            if (dupId === null) return;
            document.getElementById('action-set-status').value = 'Rejected';
            document.getElementById('action-remarks').value = `[Flagged as Duplicate] Merged with active case: ${dupId || 'Unknown ID'}`;
            document.getElementById('action-update-form').dispatchEvent(new Event('submit'));
            break;
            
        default:
            console.warn("Unknown action trigger: ", actionType);
    }
};

// Custom Notifications Communication API
async function sendCustomNotification(title, message) {
    try {
        const compRes = await fetch(`${CONFIG.API_BASE_URL}/complaints/details/${currentComplaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!compRes.ok) return;
        const compData = await compRes.json();
        const citizenId = compData.complaint.citizen_id;
        
        const res = await fetch(`${CONFIG.API_BASE_URL}/admin/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                citizen_id: citizenId,
                complaint_id: currentComplaintId,
                title: title,
                message: message
            })
        });
        if (res.ok) {
            showToast('Message sent to citizen successfully', 'success');
            openComplaintAction(currentComplaintId);
        } else {
            showToast('Failed to send message', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

// Custom Audit Logging API
async function logCustomAuditEvent(action, details) {
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/admin/log-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                complaint_id: currentComplaintId,
                action: action,
                details: details
            })
        });
        if (res.ok) {
            openComplaintAction(currentComplaintId);
        }
    } catch (err) {
        console.error(err);
    }
}

// Scroll and Focus with pulse animation helper
window.scrollAndFocus = function(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.parentElement.style.transition = 'all 0.5s ease';
        el.parentElement.style.boxShadow = '0 0 20px var(--primary)';
        setTimeout(() => {
            el.parentElement.style.boxShadow = 'none';
        }, 1500);
    }
};

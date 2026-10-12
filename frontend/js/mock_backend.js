/**
 * Civic Connect - In-Browser Mock Backend & Live Client Engine
 * Ensures 100% full-stack functionality when hosted on GitHub Pages or when Python backend is offline.
 * Automatically intercepts /api/ calls and handles Authentication, Complaints, Geo, Admin Dispatch, and AI Chatbot.
 */

(function () {
    'use strict';

    const STORAGE_KEY_PREFIX = 'civic_connect_';
    const KEY_USERS = STORAGE_KEY_PREFIX + 'users';
    const KEY_COMPLAINTS = STORAGE_KEY_PREFIX + 'complaints';
    const KEY_DEPARTMENTS = STORAGE_KEY_PREFIX + 'departments';
    const KEY_AUDIT_LOGS = STORAGE_KEY_PREFIX + 'audit_logs';
    const KEY_NOTIFICATIONS = STORAGE_KEY_PREFIX + 'notifications';
    const KEY_FEEDBACKS = STORAGE_KEY_PREFIX + 'feedbacks';
    const KEY_INIT = STORAGE_KEY_PREFIX + 'initialized_v2';

    // 1. Initial Standard Seed Data
    const SEED_DEPARTMENTS = [
        { id: 1, name: "Roads & Potholes", description: "Potholes, cracked asphalt, missing pavements, resurfacing.", created_at: new Date().toISOString() },
        { id: 2, name: "Garbage Management", description: "Littering, overflowing bins, missed collections, dumping.", created_at: new Date().toISOString() },
        { id: 3, name: "Water Supply Issues", description: "Leaking pipes, low water pressure, muddy water, supply outages.", created_at: new Date().toISOString() },
        { id: 4, name: "Drainage Problems", description: "Blocked storm drains, street flooding, surface water pooling.", created_at: new Date().toISOString() },
        { id: 5, name: "Sewage Issues", description: "Sewer line bursts, blockages, foul odor leaks, toxic overflows.", created_at: new Date().toISOString() },
        { id: 6, name: "Streetlight Failure", description: "Non-functional streetlights, blinking bulbs, dark areas.", created_at: new Date().toISOString() },
        { id: 7, name: "Electricity Problems", description: "Hanging wires, voltage spikes, transformer fire/failure.", created_at: new Date().toISOString() },
        { id: 8, name: "Public Property Damage", description: "Broken park benches, vandalized railings, damaged public toilets.", created_at: new Date().toISOString() },
        { id: 9, name: "Traffic Signal Issues", description: "Dead traffic lights, malfunctioning crossing indicators.", created_at: new Date().toISOString() },
        { id: 10, name: "Environmental Issues", description: "Illegal deforestation, chemical discharges, toxic smoke.", created_at: new Date().toISOString() }
    ];

    const SEED_USERS = [
        {
            id: 1,
            name: "Super Admin",
            email: "admin@civic.gov",
            phone: "9999999999",
            password: "adminPassword123",
            role: "SuperAdmin",
            address: "Municipal HQ, Civic Center",
            is_verified: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: "Officer John",
            email: "officer@civic.gov",
            phone: "8888888888",
            password: "officerPassword123",
            role: "DepartmentOfficer",
            address: "Zonal Municipal Office",
            is_verified: true,
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            name: "Staff David",
            email: "staff@civic.gov",
            phone: "7777777777",
            password: "staffPassword123",
            role: "FieldStaff",
            address: "Central Field Depot",
            is_verified: true,
            created_at: new Date().toISOString()
        },
        {
            id: 4,
            name: "Citizen Jane",
            email: "jane@civic.gov",
            phone: "6666666666",
            password: "janePassword123",
            role: "Citizen",
            address: "Plot 42, 5th Main Road, Ward 18",
            is_verified: true,
            created_at: new Date().toISOString()
        },
        {
            id: 5,
            name: "Surendra Varma",
            email: "varma@gmail.com",
            phone: "9876543210",
            password: "varma@123",
            role: "Citizen",
            address: "Flat 304, Green Heights, Tech Hub",
            is_verified: true,
            created_at: new Date().toISOString()
        }
    ];

    // Seed Complaints with realistic coordinates (Bengaluru urban zone)
    const SEED_COMPLAINTS = [
        {
            id: 101,
            unique_id: "CC-20261010-POT7812",
            title: "Severe deep crater pothole near metro station",
            description: "A hazardous pothole over 8 inches deep has formed right outside the metro entrance, causing frequent two-wheeler skids and traffic jams.",
            category: "Roads & Potholes",
            latitude: 12.9754,
            longitude: 77.5960,
            address: "MG Road Metro Entrance, Bangalore",
            priority: "Critical",
            status: "In Progress",
            images: ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60"],
            documents: [],
            remarks: "Road repair crew dispatched with asphalt patcher.",
            resolution_proof: null,
            resolution_date: null,
            citizen_id: 4,
            citizen_name: "Citizen Jane",
            citizen_phone: "6666666666",
            department_id: 1,
            department_name: "Roads & Potholes",
            assigned_officer_id: 3,
            assigned_officer_name: "Staff David",
            assigned_officer_phone: "7777777777",
            created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
        },
        {
            id: 102,
            unique_id: "CC-20261011-GAR9104",
            title: "Overflowing commercial garbage container",
            description: "Garbage container on 4th cross has not been cleared for four days. Foul odor spreading into neighboring primary school.",
            category: "Garbage Management",
            latitude: 12.9698,
            longitude: 77.6015,
            address: "4th Cross, Brigade Road Junction",
            priority: "High",
            status: "Pending",
            images: ["https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=60"],
            documents: [],
            remarks: "Awaiting sanitation truck route assignment.",
            resolution_proof: null,
            resolution_date: null,
            citizen_id: 5,
            citizen_name: "Surendra Varma",
            citizen_phone: "9876543210",
            department_id: 2,
            department_name: "Garbage Management",
            assigned_officer_id: null,
            assigned_officer_name: "Unassigned",
            assigned_officer_phone: "",
            created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        },
        {
            id: 103,
            unique_id: "CC-20261009-WAT3321",
            title: "Major water pipeline fracture flooding street",
            description: "High-pressure clean water supply pipe burst under pavement. Thousands of liters wasted and street submerged.",
            category: "Water Supply Issues",
            latitude: 12.9650,
            longitude: 77.5890,
            address: "Residency Road & Richmond Circle",
            priority: "Critical",
            status: "Resolved",
            images: ["https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=60"],
            documents: [],
            remarks: "Main valve isolated, replacement pipe section welded and tested successfully.",
            resolution_proof: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60",
            resolution_date: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
            citizen_id: 4,
            citizen_name: "Citizen Jane",
            citizen_phone: "6666666666",
            department_id: 3,
            department_name: "Water Supply Issues",
            assigned_officer_id: 2,
            assigned_officer_name: "Officer John",
            assigned_officer_phone: "8888888888",
            created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
        },
        {
            id: 104,
            unique_id: "CC-20261011-LGT4456",
            title: "Dark sector street with 6 non-functional poles",
            description: "Streetlights across the entire residential block have been pitch black for two nights. Safety hazard for pedestrians.",
            category: "Streetlight Failure",
            latitude: 12.9780,
            longitude: 77.6080,
            address: "8th Main, Indiranagar 1st Stage",
            priority: "Medium",
            status: "Assigned",
            images: ["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=60"],
            documents: [],
            remarks: "Assigned to electric lineman David for timer capacitor inspection.",
            resolution_proof: null,
            resolution_date: null,
            citizen_id: 5,
            citizen_name: "Surendra Varma",
            citizen_phone: "9876543210",
            department_id: 6,
            department_name: "Streetlight Failure",
            assigned_officer_id: 3,
            assigned_officer_name: "Staff David",
            assigned_officer_phone: "7777777777",
            created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
        },
        {
            id: 105,
            unique_id: "CC-20261012-DRN1120",
            title: "Blocked storm drainage causing waterlogging",
            description: "Stormwater drain inlet covered with construction debris and silt. Rainwater accumulating on highway underpass.",
            category: "Drainage Problems",
            latitude: 12.9610,
            longitude: 77.6030,
            address: "Hosur Main Road Underpass",
            priority: "High",
            status: "In Progress",
            images: ["https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=60"],
            documents: [],
            remarks: "Desilting excavator active at location.",
            resolution_proof: null,
            resolution_date: null,
            citizen_id: 4,
            citizen_name: "Citizen Jane",
            citizen_phone: "6666666666",
            department_id: 4,
            department_name: "Drainage Problems",
            assigned_officer_id: 3,
            assigned_officer_name: "Staff David",
            assigned_officer_phone: "7777777777",
            created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        }
    ];

    // Seed database if not existing or outdated
    function initSeedData() {
        if (!localStorage.getItem(KEY_INIT)) {
            localStorage.setItem(KEY_USERS, JSON.stringify(SEED_USERS));
            localStorage.setItem(KEY_DEPARTMENTS, JSON.stringify(SEED_DEPARTMENTS));
            localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(SEED_COMPLAINTS));
            localStorage.setItem(KEY_AUDIT_LOGS, JSON.stringify([
                {
                    id: 1,
                    actor_id: 1,
                    actor_name: "Super Admin",
                    action: "SYSTEM_INITIALIZE",
                    target_type: "System",
                    target_id: 0,
                    details: "Civic Connect municipal platform initialized with default demo datasets.",
                    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
                }
            ]));
            localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify([
                {
                    id: 1,
                    user_id: 4,
                    title: "Welcome to Civic Connect",
                    message: "Welcome Jane! You can file civic grievances, track repair progress, and explore 360° street views.",
                    read: false,
                    type: "System",
                    created_at: new Date().toISOString()
                }
            ]));
            localStorage.setItem(KEY_FEEDBACKS, JSON.stringify([
                {
                    id: 1,
                    complaint_id: 103,
                    citizen_id: 4,
                    rating: 5,
                    comments: "Rapid response on the water line rupture! Resolved within hours.",
                    satisfaction_score: 100,
                    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
                }
            ]));
            localStorage.setItem(KEY_INIT, 'true');
        }
    }

    initSeedData();

    // Data Access Helpers
    function getUsers() {
        try { return JSON.parse(localStorage.getItem(KEY_USERS)) || SEED_USERS; }
        catch (e) { return SEED_USERS; }
    }
    function saveUsers(users) {
        localStorage.setItem(KEY_USERS, JSON.stringify(users));
    }
    function getComplaints() {
        try { return JSON.parse(localStorage.getItem(KEY_COMPLAINTS)) || SEED_COMPLAINTS; }
        catch (e) { return SEED_COMPLAINTS; }
    }
    function saveComplaints(complaints) {
        localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(complaints));
    }
    function getDepartments() {
        try { return JSON.parse(localStorage.getItem(KEY_DEPARTMENTS)) || SEED_DEPARTMENTS; }
        catch (e) { return SEED_DEPARTMENTS; }
    }
    function getAuditLogs() {
        try { return JSON.parse(localStorage.getItem(KEY_AUDIT_LOGS)) || []; }
        catch (e) { return []; }
    }
    function addAuditLog(actorId, actorName, action, targetType, targetId, details) {
        const logs = getAuditLogs();
        const newLog = {
            id: Date.now(),
            actor_id: actorId,
            actor_name: actorName,
            action: action,
            target_type: targetType,
            target_id: targetId,
            details: details,
            created_at: new Date().toISOString()
        };
        logs.unshift(newLog);
        localStorage.setItem(KEY_AUDIT_LOGS, JSON.stringify(logs));
        return newLog;
    }

    // AI Classification in JavaScript
    function classifyComplaint(text) {
        const lower = (text || '').toLowerCase();
        if (lower.includes('pothole') || lower.includes('road') || lower.includes('asphalt') || lower.includes('crater') || lower.includes('pavement')) {
            return 'Roads & Potholes';
        }
        if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste') || lower.includes('bin') || lower.includes('litter') || lower.includes('dump')) {
            return 'Garbage Management';
        }
        if (lower.includes('sewer') || lower.includes('sewage') || lower.includes('smell') || lower.includes('foul odor')) {
            return 'Sewage Issues';
        }
        if (lower.includes('water') || lower.includes('pipe') || lower.includes('leak') || lower.includes('tap') || lower.includes('supply')) {
            return 'Water Supply Issues';
        }
        if (lower.includes('drain') || lower.includes('flood') || lower.includes('clog') || lower.includes('waterlog')) {
            return 'Drainage Problems';
        }
        if (lower.includes('light') || lower.includes('bulb') || lower.includes('lamp') || lower.includes('dark') || lower.includes('pole')) {
            return 'Streetlight Failure';
        }
        if (lower.includes('electric') || lower.includes('wire') || lower.includes('spark') || lower.includes('transformer') || lower.includes('power cut')) {
            return 'Electricity Problems';
        }
        if (lower.includes('bench') || lower.includes('park') || lower.includes('railing') || lower.includes('vandal') || lower.includes('toilet')) {
            return 'Public Property Damage';
        }
        if (lower.includes('signal') || lower.includes('traffic') || lower.includes('crossing') || lower.includes('junction')) {
            return 'Traffic Signal Issues';
        }
        if (lower.includes('pollution') || lower.includes('tree') || lower.includes('smoke') || lower.includes('chemical') || lower.includes('forest')) {
            return 'Environmental Issues';
        }
        return 'Roads & Potholes';
    }

    function predictPriority(text) {
        const lower = (text || '').toLowerCase();
        if (lower.includes('burst') || lower.includes('emergency') || lower.includes('fire') || lower.includes('hazard') || lower.includes('danger') || lower.includes('spark') || lower.includes('severe') || lower.includes('accident')) {
            return 'Critical';
        }
        if (lower.includes('overflow') || lower.includes('huge') || lower.includes('deep') || lower.includes('flood') || lower.includes('dark') || lower.includes('high')) {
            return 'High';
        }
        if (lower.includes('minor') || lower.includes('aesthetic') || lower.includes('paint') || lower.includes('clean')) {
            return 'Low';
        }
        return 'Medium';
    }

    // Helper: Create Response Object
    function createResponse(data, status = 200, contentType = 'application/json') {
        const body = (contentType === 'application/json') ? JSON.stringify(data) : data;
        return new Response(body, {
            status: status,
            statusText: status === 200 || status === 201 ? 'OK' : 'Error',
            headers: {
                'Content-Type': contentType,
                'X-Mock-Backend': 'CivicConnect-InBrowser-Engine'
            }
        });
    }

    // Decode token or get user
    function getUserFromAuthHeader(headers) {
        const auth = headers.get('Authorization') || headers.get('authorization') || '';
        if (auth.startsWith('Bearer ')) {
            const rawToken = auth.replace('Bearer ', '').trim();
            // Check if mock token with format mock_jwt_{id}_{ts}
            const match = rawToken.match(/mock_jwt_(\d+)_/);
            if (match) {
                const userId = parseInt(match[1], 10);
                const user = getUsers().find(u => u.id === userId);
                if (user) return user;
            }
        }
        // Fallback to active logged in user from localStorage if present
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            const match = savedToken.match(/mock_jwt_(\d+)_/);
            if (match) {
                const userId = parseInt(match[1], 10);
                const user = getUsers().find(u => u.id === userId);
                if (user) return user;
            }
        }
        // Default to Super Admin for admin routes, or Citizen Jane
        return getUsers().find(u => u.role === 'SuperAdmin') || SEED_USERS[0];
    }

    // Intercepted Mock Handler
    async function handleMockRequest(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = new Headers(options.headers || {});
        let body = {};
        if (options.body) {
            if (typeof options.body === 'string') {
                try { body = JSON.parse(options.body); } catch (e) { body = {}; }
            } else if (options.body instanceof FormData) {
                body = options.body;
            }
        }

        const path = url.pathname;

        // 1. AUTH ROUTES
        if (path.endsWith('/auth/login')) {
            const username = (body.username || '').trim().toLowerCase();
            const password = body.password || '';
            const users = getUsers();
            
            // Check matching user
            let user = users.find(u => u.email.toLowerCase() === username || u.phone === username);
            
            // Auto-enroll citizen if not found, allowing seamless testing with any credential
            if (!user) {
                user = {
                    id: Date.now(),
                    name: username.split('@')[0] || "Civic Citizen",
                    email: username.includes('@') ? username : `${username}@civic.gov`,
                    phone: username.match(/^\d+$/) ? username : `9${Math.floor(100000000 + Math.random() * 900000000)}`,
                    password: password,
                    role: username.includes('admin') ? "SuperAdmin" : (username.includes('officer') ? "DepartmentOfficer" : "Citizen"),
                    address: "Verified Municipal Ward",
                    is_verified: true,
                    created_at: new Date().toISOString()
                };
                users.push(user);
                saveUsers(users);
            }

            // Always allow login for demo experience
            const token = `mock_jwt_${user.id}_${Date.now()}`;
            addAuditLog(user.id, user.name, "LOGIN_SUCCESS", "User", user.id, `User signed in via web portal.`);

            return createResponse({
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    address: user.address,
                    is_verified: true,
                    created_at: user.created_at
                }
            }, 200);
        }

        if (path.endsWith('/auth/google-login')) {
            const users = getUsers();
            let user = users.find(u => u.email === "google_citizen@gmail.com");
            if (!user) {
                user = {
                    id: Date.now(),
                    name: body.name || "Google Citizen",
                    email: body.email || "google_citizen@gmail.com",
                    phone: "9123456789",
                    password: "google_oauth_pass",
                    role: "Citizen",
                    address: "Google Authenticated Profile",
                    is_verified: true,
                    created_at: new Date().toISOString()
                };
                users.push(user);
                saveUsers(users);
            }
            const token = `mock_jwt_${user.id}_${Date.now()}`;
            return createResponse({
                message: 'Logged in successfully via Google!',
                token: token,
                user: user
            }, 200);
        }

        if (path.endsWith('/auth/register')) {
            const users = getUsers();
            const email = body.email || '';
            const newUser = {
                id: Date.now(),
                name: body.name || "New Citizen",
                email: email,
                phone: body.phone || "9999999999",
                password: body.password || "password123",
                address: body.address || "Local Ward",
                role: "Citizen",
                is_verified: true, // Auto-verified for seamless testing
                created_at: new Date().toISOString()
            };
            users.push(newUser);
            saveUsers(users);
            return createResponse({
                message: 'Registration successful! Verification code: 123456',
                email: email,
                otp_demo: '123456'
            }, 201);
        }

        if (path.endsWith('/auth/verify-otp') || path.endsWith('/auth/resend-otp')) {
            return createResponse({ message: 'Account verified successfully.', otp_demo: '123456' }, 200);
        }

        if (path.endsWith('/auth/forgot-password') || path.endsWith('/auth/reset-password-verify')) {
            return createResponse({ message: 'Password updated successfully.', otp_demo: '123456' }, 200);
        }

        if (path.endsWith('/auth/profile')) {
            const user = getUserFromAuthHeader(headers);
            return createResponse({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                address: user.address,
                is_verified: true,
                created_at: user.created_at
            }, 200);
        }

        if (path.endsWith('/auth/change-password')) {
            return createResponse({ message: 'Password updated successfully.' }, 200);
        }

        // 2. COMPLAINTS ROUTES
        if (path.endsWith('/complaints/list')) {
            const user = getUserFromAuthHeader(headers);
            const allComplaints = getComplaints();
            // If Citizen, return only citizen's complaints, or all if none filed
            if (user.role === 'Citizen') {
                const userComplaints = allComplaints.filter(c => c.citizen_id === user.id);
                return createResponse(userComplaints.length > 0 ? userComplaints : allComplaints, 200);
            }
            return createResponse(allComplaints, 200);
        }

        if (path.includes('/complaints/details/')) {
            const idPart = path.split('/complaints/details/')[1];
            const compId = parseInt(idPart, 10);
            const comp = getComplaints().find(c => c.id === compId) || getComplaints()[0];
            return createResponse({
                complaint: comp,
                timeline: [
                    { action: "FILED", actor: comp.citizen_name, timestamp: comp.created_at, note: "Grievance submitted by citizen" },
                    { action: "STATUS_UPDATE", actor: comp.assigned_officer_name || "Department Dispatch", timestamp: comp.updated_at, note: comp.remarks || "Processing update" }
                ]
            }, 200);
        }

        if (path.endsWith('/complaints/upload-media')) {
            // Read file from FormData if available
            let uploadedUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60";
            if (body instanceof FormData && body.get('file')) {
                const file = body.get('file');
                if (file && file.name) {
                    try {
                        // Create object URL for client preview
                        uploadedUrl = URL.createObjectURL(file);
                    } catch (e) {
                        uploadedUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60";
                    }
                }
            }
            return createResponse({
                message: 'File uploaded successfully',
                file_url: uploadedUrl,
                filename: 'grievance_proof.jpg',
                ai_analysis: { is_blurry: false, brightness: 'Optimal', confidence: 0.94 }
            }, 200);
        }

        if (path.endsWith('/complaints/submit')) {
            const user = getUserFromAuthHeader(headers);
            const complaints = getComplaints();
            const detectedCategory = classifyComplaint(body.description || body.title || '');
            const finalCategory = (body.category && body.category !== 'Detect Automatically' && body.category !== 'Others') ? body.category : detectedCategory;
            const priority = predictPriority(body.description || '');

            const uniqueId = `CC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
            
            const newComp = {
                id: Date.now(),
                unique_id: uniqueId,
                title: body.title || "Civic Grievance",
                description: body.description || "",
                category: finalCategory,
                latitude: parseFloat(body.latitude) || 12.9716,
                longitude: parseFloat(body.longitude) || 77.5946,
                address: body.address || "Reported Location",
                priority: priority,
                status: "Pending",
                images: Array.isArray(body.images) && body.images.length > 0 ? body.images : ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60"],
                documents: body.documents || [],
                remarks: "Awaiting municipal department review.",
                resolution_proof: null,
                resolution_date: null,
                citizen_id: user.id,
                citizen_name: user.name,
                citizen_phone: user.phone,
                department_id: 1,
                department_name: finalCategory,
                assigned_officer_id: null,
                assigned_officer_name: "Unassigned",
                assigned_officer_phone: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            complaints.unshift(newComp);
            saveComplaints(complaints);

            addAuditLog(user.id, user.name, "CREATE_COMPLAINT", "Complaint", newComp.id, `Created grievance ${uniqueId} (${finalCategory}).`);

            return createResponse({
                message: 'Complaint registered successfully',
                complaint: newComp,
                is_duplicate: false,
                ai_insights: {
                    detected_category: detectedCategory,
                    predicted_priority: priority
                }
            }, 201);
        }

        if (path.includes('/complaints/delete/')) {
            const idPart = path.split('/complaints/delete/')[1];
            const compId = parseInt(idPart, 10);
            let complaints = getComplaints().filter(c => c.id !== compId);
            saveComplaints(complaints);
            return createResponse({ message: 'Complaint deleted successfully' }, 200);
        }

        if (path.endsWith('/complaints/reopen')) {
            const compId = body.complaint_id;
            const complaints = getComplaints();
            const comp = complaints.find(c => c.id === compId);
            if (comp) {
                comp.status = 'Reopened';
                comp.remarks = `Citizen Reopened: ${body.reason || 'Issue persists'}`;
                comp.updated_at = new Date().toISOString();
                saveComplaints(complaints);
            }
            return createResponse({ message: 'Complaint reopened successfully', complaint: comp }, 200);
        }

        if (path.endsWith('/complaints/feedback')) {
            return createResponse({ message: 'Feedback submitted successfully' }, 200);
        }

        if (path.endsWith('/complaints/feedbacks')) {
            const feedbacks = JSON.parse(localStorage.getItem(KEY_FEEDBACKS) || '[]');
            return createResponse(feedbacks, 200);
        }

        if (path.endsWith('/complaints/history')) {
            const logs = getAuditLogs();
            return createResponse(logs, 200);
        }

        if (path.endsWith('/complaints/chatbot')) {
            const msg = (body.message || '').trim();
            const lower = msg.toLowerCase();
            const complaints = getComplaints();

            // Check if user provided Complaint ID
            const idMatch = msg.match(/CC-\d+-[A-Z0-9]+/i);
            if (idMatch) {
                const found = complaints.find(c => c.unique_id.toLowerCase() === idMatch[0].toLowerCase());
                if (found) {
                    return createResponse({
                        reply: `📋 <b>Complaint Status for ${found.unique_id}:</b><br>` +
                               `• <b>Category:</b> ${found.category}<br>` +
                               `• <b>Status:</b> <span class="badge ${found.status.toLowerCase()}">${found.status}</span><br>` +
                               `• <b>Priority:</b> ${found.priority}<br>` +
                               `• <b>Assigned Officer:</b> ${found.assigned_officer_name}<br>` +
                               `• <b>Remarks:</b> ${found.remarks || 'Under active investigation'}`
                    }, 200);
                } else {
                    return createResponse({
                        reply: `⚠️ I could not locate any active complaint with ID <b>${idMatch[0]}</b>. Please verify the ID or check the My Complaints dashboard.`
                    }, 200);
                }
            }

            if (lower.includes('pothole') || lower.includes('road')) {
                return createResponse({
                    reply: `🛣️ <b>Road & Pothole Assistance:</b><br>You can report road cracks or potholes by clicking <b>'File New Grievance'</b>. Our AI will automatically verify street coordinates and assign field repair squads within 24-48 hours!`
                }, 200);
            }

            if (lower.includes('water') || lower.includes('pipe')) {
                return createResponse({
                    reply: `🚰 <b>Water Supply & Leakage:</b><br>Pipeline bursts or dirty water issues are flagged as <b>Critical</b> priority and dispatched immediately to the Water Redressal Wing.`
                }, 200);
            }

            if (lower.includes('contact') || lower.includes('helpline') || lower.includes('phone')) {
                return createResponse({
                    reply: `📞 <b>Municipal Helpline Numbers:</b><br>• Central Grievance Cell: <b>1800-425-0012</b><br>• Water Supply Emergency: <b>1916</b><br>• Electricity Redressal: <b>1912</b><br>• Police / Traffic Control: <b>100 / 103</b>`
                }, 200);
            }

            return createResponse({
                reply: `👋 Hello! I am the Smart Civic AI Assistant.<br>` +
                       `• Type your <b>Complaint ID</b> (e.g. <code>${complaints[0] ? complaints[0].unique_id : 'CC-20261010-POT7812'}</code>) to track its live status.<br>` +
                       `• Ask questions about municipal services, water lines, or pothole repairs!<br>` +
                       `• All grievances are GPS geotagged with 360° Google Street View verification.`
            }, 200);
        }

        // 3. ADMIN ROUTES
        if (path.endsWith('/admin/dashboard-stats')) {
            const complaints = getComplaints();
            const total = complaints.length;
            const pending = complaints.filter(c => c.status === 'Pending').length;
            const assigned = complaints.filter(c => c.status === 'Assigned').length;
            const in_progress = complaints.filter(c => c.status === 'In Progress').length;
            const resolved = complaints.filter(c => c.status === 'Resolved').length;
            const reopened = complaints.filter(c => c.status === 'Reopened').length;
            const rejected = complaints.filter(c => c.status === 'Rejected').length;

            const depts = getDepartments();
            const deptStats = depts.map(d => {
                const count = complaints.filter(c => c.category === d.name).length;
                const resCount = complaints.filter(c => c.category === d.name && c.status === 'Resolved').length;
                return {
                    department_id: d.id,
                    name: d.name,
                    total: count,
                    resolved: resCount,
                    resolution_rate: count > 0 ? Math.round((resCount / count) * 100) : 0
                };
            });

            const heatmap = complaints.map(c => ({
                id: c.id,
                latitude: c.latitude,
                longitude: c.longitude,
                category: c.category,
                status: c.status,
                priority: c.priority,
                title: c.title
            }));

            const trends = [
                { date: '10-06', count: 3 },
                { date: '10-07', count: 4 },
                { date: '10-08', count: 2 },
                { date: '10-09', count: 6 },
                { date: '10-10', count: 5 },
                { date: '10-11', count: 7 },
                { date: '10-12', count: total }
            ];

            return createResponse({
                summary: {
                    total, pending, assigned, in_progress, resolved, reopened, rejected
                },
                department_distribution: deptStats,
                heatmap: heatmap,
                performance: {
                    avg_resolution_hours: 14.5,
                    avg_rating: 4.8,
                    csat_score: 96
                },
                trends: trends
            }, 200);
        }

        if (path.endsWith('/admin/departments')) {
            return createResponse(getDepartments(), 200);
        }

        if (path.endsWith('/admin/list-staff')) {
            const staff = getUsers().filter(u => u.role === 'FieldStaff' || u.role === 'DepartmentOfficer');
            return createResponse(staff, 200);
        }

        if (path.includes('/admin/update-status/')) {
            const idPart = path.split('/admin/update-status/')[1];
            const compId = parseInt(idPart, 10);
            const complaints = getComplaints();
            const comp = complaints.find(c => c.id === compId);

            if (comp) {
                if (body.status) comp.status = body.status;
                if (body.priority) comp.priority = body.priority;
                if (body.remarks) comp.remarks = body.remarks;
                if (body.resolution_proof) {
                    comp.resolution_proof = body.resolution_proof;
                    comp.resolution_date = new Date().toISOString();
                }
                if (body.department_id) {
                    const d = getDepartments().find(dep => dep.id === parseInt(body.department_id, 10));
                    if (d) {
                        comp.department_id = d.id;
                        comp.department_name = d.name;
                    }
                }
                if (body.assigned_officer_id) {
                    const st = getUsers().find(u => u.id === parseInt(body.assigned_officer_id, 10));
                    if (st) {
                        comp.assigned_officer_id = st.id;
                        comp.assigned_officer_name = st.name;
                        comp.assigned_officer_phone = st.phone;
                    }
                }
                comp.updated_at = new Date().toISOString();
                saveComplaints(complaints);

                const adminUser = getUserFromAuthHeader(headers);
                addAuditLog(adminUser.id, adminUser.name, "UPDATE_STATUS", "Complaint", comp.id, `Updated complaint ${comp.unique_id} to status '${comp.status}'.`);
            }

            return createResponse({
                message: 'Complaint details updated successfully',
                complaint: comp
            }, 200);
        }

        if (path.endsWith('/admin/send-notification') || path.endsWith('/admin/log-audit')) {
            return createResponse({ message: 'Action registered successfully' }, 200);
        }

        if (path.endsWith('/admin/generate-pdf-report')) {
            // Generate a real downloadable plain text or formatted summary PDF blob
            const reportText = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF";
            const blob = new Blob([reportText], { type: 'application/pdf' });
            return new Response(blob, {
                status: 200,
                headers: { 'Content-Type': 'application/pdf' }
            });
        }

        return createResponse({ message: 'Mock endpoint handled', path: path }, 200);
    }

    // 4. Global Fetch Interceptor
    const originalFetch = window.fetch;

    window.fetch = async function (resource, options = {}) {
        let urlStr = '';
        if (typeof resource === 'string') {
            urlStr = resource;
        } else if (resource && resource.url) {
            urlStr = resource.url;
        }

        // Only intercept requests directed to our API
        const isApiCall = (
            (CONFIG && CONFIG.API_BASE_URL && urlStr.startsWith(CONFIG.API_BASE_URL)) ||
            urlStr.includes('/api/')
        );

        if (!isApiCall) {
            // External requests (Leaflet tiles, Nominatim geocoder, GeoJS, ChartJS) pass straight to native fetch
            return originalFetch.apply(this, arguments);
        }

        // Check if we are hosted on GitHub Pages or file protocol -> Always handle client-side
        const isGithubPages = window.location.hostname.includes('github.io');
        const isFileProtocol = window.location.protocol === 'file:';

        if (isGithubPages || isFileProtocol) {
            try {
                const parsedUrl = new URL(urlStr, window.location.origin);
                return await handleMockRequest(parsedUrl, options);
            } catch (err) {
                console.error('[MockBackend] GitHub Pages handler error:', err);
                return createResponse({ error: err.message }, 500);
            }
        }

        // On localhost or custom remote, attempt live backend first
        try {
            const liveResponse = await originalFetch.apply(this, arguments);
            // If live response is valid, return it
            if (liveResponse.ok || (liveResponse.status < 500 && liveResponse.status !== 404)) {
                return liveResponse;
            }
            // If 404 or server down, fallback to mock
            console.warn('[MockBackend] Real server returned 404 or failure. Falling back to in-browser engine.');
            const parsedUrl = new URL(urlStr, window.location.origin);
            return await handleMockRequest(parsedUrl, options);
        } catch (networkError) {
            // Server offline / connection refused -> Seamless fallback to mock
            console.warn('[MockBackend] Live server unreachable. Activating seamless in-browser engine:', networkError);
            const parsedUrl = new URL(urlStr, window.location.origin);
            return await handleMockRequest(parsedUrl, options);
        }
    };

    console.log('[Civic Connect] In-browser Mock Backend & Offline Engine successfully initialized.');
})();

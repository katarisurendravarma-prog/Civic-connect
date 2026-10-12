// Global Configuration Settings for frontend clients
const CONFIG = {
    // Dynamic API URL: Automatically adapts to deployed server origin, localhost, or file:// protocol
    API_BASE_URL: (function() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:5000/api';
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `${window.location.protocol}//${window.location.hostname}:5000/api`;
        }
        // When deployed to production cloud (Render, Railway, etc.)
        return `${window.location.origin}/api`;
    })(),

    // Generate direct Google Street View (360° panorama) URL
    getStreetViewUrl: function(lat, lng) {
        if (!lat || !lng) return 'https://www.google.com/maps';
        return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
    },

    // Open Google Street View in a new tab
    openStreetView: function(lat, lng) {
        const url = this.getStreetViewUrl(lat, lng);
        window.open(url, '_blank', 'noopener,noreferrer');
    },

    // Attach high-definition Street View, Satellite Hybrid, and CartoDB base layers
    addSatelliteOption: function(mapInstance) {
        if (!mapInstance) return;

        // 1. Google Maps Street View / Road layer (Detailed road names, buildings, lane lines)
        const googleStreetLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            attribution: '&copy; Google Maps'
        });

        // 2. Google Satellite Hybrid (High-res satellite photo + street labels overlay)
        const googleHybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            attribution: '&copy; Google Maps Satellite'
        });

        // 3. CartoDB Clean Street View (Lightweight, crisp vector-styled street map)
        const cartoStreetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            subdomains: ['a', 'b', 'c', 'd'],
            maxZoom: 20,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        });

        // 4. OpenStreetMap Standard
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        });

        // 5. Esri World Imagery (Pure satellite)
        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri'
        });

        // Default to Google Street View layer
        googleStreetLayer.addTo(mapInstance);

        // Layer switcher control
        L.control.layers({
            "🗺️ Google Street View": googleStreetLayer,
            "🛰️ Satellite Hybrid (Aerial + Streets)": googleHybridLayer,
            "🏙️ CartoDB Street View": cartoStreetLayer,
            "🌐 OpenStreetMap": osmLayer,
            "📸 Esri Satellite": esriSatellite
        }, null, { position: 'topright' }).addTo(mapInstance);

        // Auto-fix grey tiles / hidden tab sizing using ResizeObserver
        try {
            const container = mapInstance.getContainer();
            if (container && window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(() => {
                    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                        mapInstance.invalidateSize();
                    }
                });
                resizeObserver.observe(container);
            }
        } catch (e) {
            console.warn('Map resize observer init skipped:', e);
        }

        // Delayed size check for transitions
        setTimeout(() => {
            try { mapInstance.invalidateSize(); } catch (e) {}
        }, 200);
        setTimeout(() => {
            try { mapInstance.invalidateSize(); } catch (e) {}
        }, 600);
    }
};

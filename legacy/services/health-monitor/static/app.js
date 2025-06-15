// Global state
let ws = null;
let devices = {};
let charts = {};
let filters = {
    type: '',
    status: '',
    search: ''
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    initializeFilters();
    initializeCharts();
    initializeModal();
});

// WebSocket connection
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        // Reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'initial':
        case 'update':
            updateDashboard(message.data);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

// Update dashboard with new data
function updateDashboard(data) {
    devices = data.devices || {};
    
    // Update summary cards
    updateSummaryCards(data);
    
    // Update device grid
    updateDeviceGrid();
    
    // Update charts
    updateCharts(data);
    
    // Update last update time
    updateLastUpdateTime();
}

// Update summary cards
function updateSummaryCards(data) {
    document.getElementById('total-devices').textContent = data.total_devices || 0;
    document.getElementById('online-devices').textContent = data.online_devices || 0;
    document.getElementById('offline-devices').textContent = data.offline_devices || 0;
    document.getElementById('battery-warnings').textContent = data.battery_warnings || 0;
}

// Update device grid
function updateDeviceGrid() {
    const grid = document.getElementById('devices-grid');
    grid.innerHTML = '';
    
    // Filter devices
    const filteredDevices = Object.values(devices).filter(device => {
        // Type filter
        if (filters.type && device.device_type !== filters.type) {
            return false;
        }
        
        // Status filter
        if (filters.status) {
            switch (filters.status) {
                case 'online':
                    if (!device.online) return false;
                    break;
                case 'offline':
                    if (device.online) return false;
                    break;
                case 'battery':
                    if (!device.battery || device.battery > 20) return false;
                    break;
                case 'alerts':
                    if (!device.alerts || device.alerts.length === 0) return false;
                    break;
            }
        }
        
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = 
                device.device_id.toLowerCase().includes(searchLower) ||
                device.device_type.toLowerCase().includes(searchLower) ||
                (device.manufacturer && device.manufacturer.toLowerCase().includes(searchLower)) ||
                (device.model && device.model.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }
        
        return true;
    });
    
    // Sort devices (offline first, then by name)
    filteredDevices.sort((a, b) => {
        if (a.online !== b.online) {
            return a.online ? 1 : -1;
        }
        return a.device_id.localeCompare(b.device_id);
    });
    
    // Create device cards
    filteredDevices.forEach(device => {
        const card = createDeviceCard(device);
        grid.appendChild(card);
    });
}

// Create device card element
function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = `device-card ${device.online ? 'online' : 'offline'}`;
    card.onclick = () => showDeviceDetails(device);
    
    // Header
    const header = document.createElement('div');
    header.className = 'device-header';
    
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'device-name';
    name.textContent = device.device_id;
    
    const type = document.createElement('div');
    type.className = 'device-type';
    type.textContent = `${device.device_type} • ${device.manufacturer || 'Unknown'} ${device.model || ''}`;
    
    info.appendChild(name);
    info.appendChild(type);
    
    const status = document.createElement('div');
    status.className = 'device-status';
    const statusDot = document.createElement('span');
    statusDot.className = `status-dot ${device.online ? 'online' : 'offline'}`;
    const statusText = document.createElement('span');
    statusText.textContent = device.online ? 'Online' : 'Offline';
    status.appendChild(statusDot);
    status.appendChild(statusText);
    
    header.appendChild(info);
    header.appendChild(status);
    
    // Metrics
    const metrics = document.createElement('div');
    metrics.className = 'device-metrics';
    
    // Battery
    if (device.battery !== null && device.battery !== undefined) {
        const batteryMetric = createMetric('Battery', `${device.battery}%`, device.battery < 20);
        metrics.appendChild(batteryMetric);
    }
    
    // Link Quality
    if (device.link_quality !== null && device.link_quality !== undefined) {
        const linkMetric = createMetric('Link', `${device.link_quality}/255`);
        metrics.appendChild(linkMetric);
    }
    
    // Temperature
    if (device.temperature !== null && device.temperature !== undefined) {
        const tempMetric = createMetric('Temp', `${device.temperature.toFixed(1)}°C`);
        metrics.appendChild(tempMetric);
    }
    
    // Humidity
    if (device.humidity !== null && device.humidity !== undefined) {
        const humidityMetric = createMetric('Humidity', `${device.humidity.toFixed(1)}%`);
        metrics.appendChild(humidityMetric);
    }
    
    // Last seen
    const lastSeen = new Date(device.last_seen);
    const timeDiff = Date.now() - lastSeen.getTime();
    const timeAgo = formatTimeAgo(timeDiff);
    const lastSeenMetric = createMetric('Last Seen', timeAgo);
    metrics.appendChild(lastSeenMetric);
    
    card.appendChild(header);
    card.appendChild(metrics);
    
    // Alerts indicator
    if (device.alerts && device.alerts.length > 0) {
        const alertsIndicator = document.createElement('div');
        alertsIndicator.className = 'alerts-indicator';
        alertsIndicator.textContent = device.alerts.length;
        card.appendChild(alertsIndicator);
    }
    
    return card;
}

// Create metric element
function createMetric(label, value, isWarning = false) {
    const metric = document.createElement('div');
    metric.className = 'metric';
    
    const labelEl = document.createElement('span');
    labelEl.className = 'metric-label';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('span');
    valueEl.className = 'metric-value';
    if (isWarning) {
        valueEl.classList.add('battery-low');
    }
    valueEl.textContent = value;
    
    metric.appendChild(labelEl);
    metric.appendChild(valueEl);
    
    return metric;
}

// Initialize filters
function initializeFilters() {
    document.getElementById('type-filter').addEventListener('change', (e) => {
        filters.type = e.target.value;
        updateDeviceGrid();
    });
    
    document.getElementById('status-filter').addEventListener('change', (e) => {
        filters.status = e.target.value;
        updateDeviceGrid();
    });
    
    document.getElementById('search-filter').addEventListener('input', (e) => {
        filters.search = e.target.value;
        updateDeviceGrid();
    });
}

// Initialize charts
function initializeCharts() {
    // Device types chart
    const typesCtx = document.getElementById('types-chart').getContext('2d');
    charts.types = new Chart(typesCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c',
                    '#9b59b6',
                    '#1abc9c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // System health chart
    const healthCtx = document.getElementById('health-chart').getContext('2d');
    charts.health = new Chart(healthCtx, {
        type: 'bar',
        data: {
            labels: ['Online', 'Offline', 'Low Battery', 'Has Alerts'],
            datasets: [{
                label: 'Device Count',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12',
                    '#e74c3c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update charts
function updateCharts(data) {
    // Count device types
    const typeCounts = {};
    let onlineCount = 0;
    let offlineCount = 0;
    let lowBatteryCount = 0;
    let alertCount = 0;
    
    Object.values(devices).forEach(device => {
        // Count by type
        typeCounts[device.device_type] = (typeCounts[device.device_type] || 0) + 1;
        
        // Count by status
        if (device.online) {
            onlineCount++;
        } else {
            offlineCount++;
        }
        
        // Count low battery
        if (device.battery && device.battery < 20) {
            lowBatteryCount++;
        }
        
        // Count alerts
        if (device.alerts && device.alerts.length > 0) {
            alertCount++;
        }
    });
    
    // Update types chart
    charts.types.data.labels = Object.keys(typeCounts);
    charts.types.data.datasets[0].data = Object.values(typeCounts);
    charts.types.update();
    
    // Update health chart
    charts.health.data.datasets[0].data = [onlineCount, offlineCount, lowBatteryCount, alertCount];
    charts.health.update();
}

// Initialize modal
function initializeModal() {
    const modal = document.getElementById('device-modal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Show device details
function showDeviceDetails(device) {
    const modal = document.getElementById('device-modal');
    const title = document.getElementById('modal-device-name');
    const content = document.getElementById('modal-device-content');
    
    title.textContent = device.device_id;
    
    let html = `
        <div class="detail-section">
            <h4>Device Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span>Type</span>
                    <span>${device.device_type}</span>
                </div>
                <div class="detail-item">
                    <span>Manufacturer</span>
                    <span>${device.manufacturer || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <span>Model</span>
                    <span>${device.model || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <span>Status</span>
                    <span>${device.online ? 'Online' : 'Offline'}</span>
                </div>
                <div class="detail-item">
                    <span>First Seen</span>
                    <span>${new Date(device.first_seen).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span>Last Seen</span>
                    <span>${new Date(device.last_seen).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span>Update Count</span>
                    <span>${device.update_count}</span>
                </div>
            </div>
        </div>
    `;
    
    // Metrics
    if (device.battery !== null || device.link_quality !== null) {
        html += `
            <div class="detail-section">
                <h4>Metrics</h4>
                <div class="detail-grid">
        `;
        
        if (device.battery !== null) {
            html += `
                <div class="detail-item">
                    <span>Battery Level</span>
                    <span>${device.battery}%</span>
                </div>
            `;
        }
        
        if (device.link_quality !== null) {
            html += `
                <div class="detail-item">
                    <span>Link Quality</span>
                    <span>${device.link_quality}/255</span>
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    // State
    if (device.state && Object.keys(device.state).length > 0) {
        html += `
            <div class="detail-section">
                <h4>Current State</h4>
                <div class="detail-grid">
        `;
        
        Object.entries(device.state).forEach(([key, value]) => {
            if (typeof value !== 'object') {
                html += `
                    <div class="detail-item">
                        <span>${key}</span>
                        <span>${value}</span>
                    </div>
                `;
            }
        });
        
        html += `</div></div>`;
    }
    
    // Alerts
    if (device.alerts && device.alerts.length > 0) {
        html += `
            <div class="detail-section">
                <h4>Alerts</h4>
                <div class="alerts-list">
        `;
        
        device.alerts.forEach(alert => {
            const alertClass = alert.severity === 'error' ? 'error' : 'warning';
            html += `
                <div class="alert-item ${alertClass}">
                    <strong>${alert.type}</strong>
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    content.innerHTML = html;
    modal.style.display = 'block';
}

// Utility functions
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('nats-status');
    const dot = statusEl.querySelector('.dot');
    const text = statusEl.querySelector('.status-text');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

function updateLastUpdateTime() {
    const el = document.getElementById('last-update');
    el.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
}

function formatTimeAgo(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}
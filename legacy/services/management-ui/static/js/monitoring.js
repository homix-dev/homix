// Device Monitoring Component
class DeviceMonitoring {
    constructor() {
        this.devices = new Map();
        this.charts = {};
        this.filters = {
            type: '',
            status: '',
            search: ''
        };
        this.updateInterval = null;
    }

    init() {
        this.render();
        this.initializeCharts();
        this.startMonitoring();
    }

    render() {
        const container = document.getElementById('monitoring-page');
        
        container.innerHTML = `
            <div class="monitoring-container">
                <div class="monitoring-header">
                    <h2>Device Health Monitoring</h2>
                    <div class="monitoring-controls">
                        <button class="btn btn-secondary" onclick="monitoring.exportData()">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                        <button class="btn btn-secondary" onclick="monitoring.refreshAll()">
                            <i class="fas fa-sync-alt"></i> Refresh All
                        </button>
                    </div>
                </div>

                <div class="monitoring-stats">
                    <div class="stat-card monitoring">
                        <div class="stat-icon monitoring">
                            <i class="fas fa-server"></i>
                        </div>
                        <div class="stat-content">
                            <h3>System Health</h3>
                            <p class="stat-value" id="system-health">Good</p>
                            <span class="stat-change" id="system-uptime">Uptime: 0h</span>
                        </div>
                    </div>
                    
                    <div class="stat-card monitoring">
                        <div class="stat-icon monitoring">
                            <i class="fas fa-network-wired"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Network Status</h3>
                            <p class="stat-value" id="network-status">Connected</p>
                            <span class="stat-change" id="network-latency">Latency: 0ms</span>
                        </div>
                    </div>
                    
                    <div class="stat-card monitoring">
                        <div class="stat-icon monitoring">
                            <i class="fas fa-battery-three-quarters"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Battery Alerts</h3>
                            <p class="stat-value" id="battery-alerts">0</p>
                            <span class="stat-change">Devices with low battery</span>
                        </div>
                    </div>
                    
                    <div class="stat-card monitoring">
                        <div class="stat-icon monitoring">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Active Alerts</h3>
                            <p class="stat-value" id="active-alerts">0</p>
                            <span class="stat-change">Requiring attention</span>
                        </div>
                    </div>
                </div>

                <div class="monitoring-content">
                    <div class="monitoring-sidebar">
                        <div class="filter-section">
                            <h3>Filters</h3>
                            <div class="filter-group">
                                <label>Device Type</label>
                                <select class="form-control" id="monitor-type-filter" onchange="monitoring.applyFilters()">
                                    <option value="">All Types</option>
                                    <option value="sensor">Sensors</option>
                                    <option value="binary_sensor">Binary Sensors</option>
                                    <option value="switch">Switches</option>
                                    <option value="light">Lights</option>
                                    <option value="climate">Climate</option>
                                    <option value="lock">Locks</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Status</label>
                                <select class="form-control" id="monitor-status-filter" onchange="monitoring.applyFilters()">
                                    <option value="">All Status</option>
                                    <option value="online">Online Only</option>
                                    <option value="offline">Offline Only</option>
                                    <option value="battery">Low Battery</option>
                                    <option value="alerts">Has Alerts</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Search</label>
                                <input type="text" class="form-control" id="monitor-search-filter" 
                                       placeholder="Search devices..." oninput="monitoring.applyFilters()">
                            </div>
                        </div>

                        <div class="alert-section">
                            <h3>Recent Alerts</h3>
                            <div id="recent-alerts" class="alert-list">
                                <!-- Alerts will be populated here -->
                            </div>
                        </div>
                    </div>

                    <div class="monitoring-main">
                        <div class="chart-section">
                            <div class="chart-container">
                                <h3>Device Status Overview</h3>
                                <canvas id="status-chart"></canvas>
                            </div>
                            <div class="chart-container">
                                <h3>Device Types Distribution</h3>
                                <canvas id="types-chart"></canvas>
                            </div>
                        </div>

                        <div class="devices-health-grid" id="monitoring-devices-grid">
                            <!-- Device health cards will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initializeCharts() {
        // Status Overview Chart
        const statusCtx = document.getElementById('status-chart').getContext('2d');
        this.charts.status = new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['Online', 'Offline', 'Low Battery', 'Has Alerts'],
                datasets: [{
                    label: 'Device Count',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(243, 156, 18, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ],
                    borderColor: [
                        '#2ecc71',
                        '#e74c3c',
                        '#f39c12',
                        '#e74c3c'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
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

        // Device Types Chart
        const typesCtx = document.getElementById('types-chart').getContext('2d');
        this.charts.types = new Chart(typesCtx, {
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
                        '#1abc9c',
                        '#34495e',
                        '#f1c40f'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    startMonitoring() {
        // Initial load
        this.updateDevices();
        
        // Set up periodic updates
        this.updateInterval = setInterval(() => {
            this.updateDevices();
        }, 5000); // Update every 5 seconds
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateDevices() {
        // Get devices from app state
        if (window.app && window.app.devices) {
            this.devices = new Map(window.app.devices);
            this.updateDisplay();
        }
    }

    updateDisplay() {
        // Update stats
        this.updateStats();
        
        // Update charts
        this.updateCharts();
        
        // Update device grid
        this.updateDeviceGrid();
        
        // Update alerts
        this.updateAlerts();
        
        // Update system info
        this.updateSystemInfo();
    }

    updateStats() {
        let onlineCount = 0;
        let offlineCount = 0;
        let batteryWarnings = 0;
        let activeAlerts = 0;

        this.devices.forEach(device => {
            if (device.online) {
                onlineCount++;
            } else {
                offlineCount++;
            }
            
            if (device.battery && device.battery < 20) {
                batteryWarnings++;
            }
            
            if (device.alerts && device.alerts.length > 0) {
                activeAlerts += device.alerts.length;
            }
        });

        document.getElementById('battery-alerts').textContent = batteryWarnings;
        document.getElementById('active-alerts').textContent = activeAlerts;
    }

    updateCharts() {
        // Count device statuses and types
        const typeCounts = {};
        let onlineCount = 0;
        let offlineCount = 0;
        let lowBatteryCount = 0;
        let alertCount = 0;

        this.devices.forEach(device => {
            // Count by type
            typeCounts[device.type] = (typeCounts[device.type] || 0) + 1;
            
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

        // Update status chart
        this.charts.status.data.datasets[0].data = [onlineCount, offlineCount, lowBatteryCount, alertCount];
        this.charts.status.update();

        // Update types chart
        this.charts.types.data.labels = Object.keys(typeCounts);
        this.charts.types.data.datasets[0].data = Object.values(typeCounts);
        this.charts.types.update();
    }

    updateDeviceGrid() {
        const grid = document.getElementById('monitoring-devices-grid');
        grid.innerHTML = '';

        // Filter devices
        const filteredDevices = this.filterDevices();

        // Sort devices (offline and alerts first)
        filteredDevices.sort((a, b) => {
            // Prioritize devices with alerts
            if (a.alerts?.length && !b.alerts?.length) return -1;
            if (!a.alerts?.length && b.alerts?.length) return 1;
            
            // Then offline devices
            if (!a.online && b.online) return -1;
            if (a.online && !b.online) return 1;
            
            // Then low battery
            const aBattery = a.battery || 100;
            const bBattery = b.battery || 100;
            if (aBattery < 20 && bBattery >= 20) return -1;
            if (aBattery >= 20 && bBattery < 20) return 1;
            
            return a.id.localeCompare(b.id);
        });

        // Create device health cards
        filteredDevices.forEach(device => {
            const card = this.createDeviceHealthCard(device);
            grid.appendChild(card);
        });
    }

    createDeviceHealthCard(device) {
        const card = document.createElement('div');
        card.className = `device-health-card ${device.online ? 'online' : 'offline'}`;
        if (device.alerts?.length > 0) {
            card.classList.add('has-alerts');
        }
        
        const healthScore = this.calculateHealthScore(device);
        const healthClass = healthScore >= 80 ? 'good' : healthScore >= 50 ? 'warning' : 'critical';
        
        card.innerHTML = `
            <div class="health-card-header">
                <div class="device-info">
                    <h4>${device.name || device.id}</h4>
                    <span class="device-type">${device.type}</span>
                </div>
                <div class="health-score ${healthClass}">
                    <span class="score-value">${healthScore}</span>
                    <span class="score-label">Health</span>
                </div>
            </div>
            
            <div class="health-metrics">
                <div class="metric">
                    <i class="fas fa-wifi ${device.online ? 'online' : 'offline'}"></i>
                    <span>${device.online ? 'Online' : 'Offline'}</span>
                </div>
                ${device.battery !== undefined ? `
                    <div class="metric ${device.battery < 20 ? 'warning' : ''}">
                        <i class="fas fa-battery-${this.getBatteryIcon(device.battery)}"></i>
                        <span>${device.battery}%</span>
                    </div>
                ` : ''}
                ${device.link_quality !== undefined ? `
                    <div class="metric">
                        <i class="fas fa-signal"></i>
                        <span>${Math.round((device.link_quality / 255) * 100)}%</span>
                    </div>
                ` : ''}
                <div class="metric">
                    <i class="fas fa-clock"></i>
                    <span>${this.getLastSeenText(device.last_seen)}</span>
                </div>
            </div>
            
            ${device.alerts && device.alerts.length > 0 ? `
                <div class="health-alerts">
                    ${device.alerts.map(alert => `
                        <div class="alert-item ${alert.severity}">
                            <i class="fas fa-exclamation-circle"></i>
                            ${alert.message}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="health-actions">
                <button class="btn-sm" onclick="app.showDeviceDetails('${device.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                ${!device.online ? `
                    <button class="btn-sm" onclick="monitoring.troubleshootDevice('${device.id}')">
                        <i class="fas fa-wrench"></i> Troubleshoot
                    </button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    calculateHealthScore(device) {
        let score = 100;
        
        // Deduct for offline status
        if (!device.online) {
            score -= 50;
        }
        
        // Deduct for low battery
        if (device.battery !== undefined) {
            if (device.battery < 20) {
                score -= 30;
            } else if (device.battery < 50) {
                score -= 10;
            }
        }
        
        // Deduct for poor link quality
        if (device.link_quality !== undefined) {
            const linkPercent = (device.link_quality / 255) * 100;
            if (linkPercent < 30) {
                score -= 20;
            } else if (linkPercent < 60) {
                score -= 10;
            }
        }
        
        // Deduct for alerts
        if (device.alerts && device.alerts.length > 0) {
            score -= device.alerts.length * 10;
        }
        
        // Deduct for stale data (not updated in last hour)
        const lastSeen = new Date(device.last_seen);
        const hourAgo = new Date(Date.now() - 3600000);
        if (lastSeen < hourAgo) {
            score -= 20;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    filterDevices() {
        const typeFilter = document.getElementById('monitor-type-filter').value;
        const statusFilter = document.getElementById('monitor-status-filter').value;
        const searchFilter = document.getElementById('monitor-search-filter').value.toLowerCase();
        
        return Array.from(this.devices.values()).filter(device => {
            // Type filter
            if (typeFilter && device.type !== typeFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter) {
                switch (statusFilter) {
                    case 'online':
                        if (!device.online) return false;
                        break;
                    case 'offline':
                        if (device.online) return false;
                        break;
                    case 'battery':
                        if (!device.battery || device.battery >= 20) return false;
                        break;
                    case 'alerts':
                        if (!device.alerts || device.alerts.length === 0) return false;
                        break;
                }
            }
            
            // Search filter
            if (searchFilter) {
                const matchesSearch = 
                    device.id.toLowerCase().includes(searchFilter) ||
                    (device.name && device.name.toLowerCase().includes(searchFilter)) ||
                    device.type.toLowerCase().includes(searchFilter);
                if (!matchesSearch) return false;
            }
            
            return true;
        });
    }

    updateAlerts() {
        const alertsContainer = document.getElementById('recent-alerts');
        const allAlerts = [];
        
        // Collect all alerts from devices
        this.devices.forEach(device => {
            if (device.alerts && device.alerts.length > 0) {
                device.alerts.forEach(alert => {
                    allAlerts.push({
                        ...alert,
                        device_id: device.id,
                        device_name: device.name || device.id,
                        timestamp: alert.timestamp || new Date().toISOString()
                    });
                });
            }
            
            // Add offline alerts
            if (!device.online) {
                allAlerts.push({
                    type: 'device_offline',
                    severity: 'warning',
                    message: 'Device is offline',
                    device_id: device.id,
                    device_name: device.name || device.id,
                    timestamp: device.last_seen
                });
            }
            
            // Add low battery alerts
            if (device.battery && device.battery < 20) {
                allAlerts.push({
                    type: 'low_battery',
                    severity: device.battery < 10 ? 'error' : 'warning',
                    message: `Battery at ${device.battery}%`,
                    device_id: device.id,
                    device_name: device.name || device.id,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Sort by timestamp (newest first)
        allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Display recent alerts
        alertsContainer.innerHTML = allAlerts.slice(0, 10).map(alert => `
            <div class="alert-card ${alert.severity}">
                <div class="alert-header">
                    <span class="alert-device">${alert.device_name}</span>
                    <span class="alert-time">${this.getTimeAgo(alert.timestamp)}</span>
                </div>
                <div class="alert-message">${alert.message}</div>
                <div class="alert-actions">
                    <button class="btn-sm" onclick="app.showDeviceDetails('${alert.device_id}')">
                        View Device
                    </button>
                </div>
            </div>
        `).join('');
        
        if (allAlerts.length === 0) {
            alertsContainer.innerHTML = '<p class="no-alerts">No active alerts</p>';
        }
    }

    updateSystemInfo() {
        // Calculate system uptime (mock for now)
        const uptimeHours = Math.floor((Date.now() - window.app.startTime) / 3600000);
        document.getElementById('system-uptime').textContent = `Uptime: ${uptimeHours}h`;
        
        // Check WebSocket connection
        const wsConnected = window.wsManager && window.wsManager.isConnected;
        document.getElementById('network-status').textContent = wsConnected ? 'Connected' : 'Disconnected';
        
        // Mock latency (in real app, measure actual NATS latency)
        const latency = wsConnected ? Math.floor(Math.random() * 50) + 10 : 0;
        document.getElementById('network-latency').textContent = `Latency: ${latency}ms`;
        
        // Overall system health
        const offlineDevices = Array.from(this.devices.values()).filter(d => !d.online).length;
        const alertCount = Array.from(this.devices.values()).reduce((sum, d) => sum + (d.alerts?.length || 0), 0);
        
        let systemHealth = 'Good';
        if (offlineDevices > 5 || alertCount > 10) {
            systemHealth = 'Critical';
        } else if (offlineDevices > 2 || alertCount > 5) {
            systemHealth = 'Warning';
        }
        
        document.getElementById('system-health').textContent = systemHealth;
        document.getElementById('system-health').className = `stat-value ${systemHealth.toLowerCase()}`;
    }

    applyFilters() {
        this.updateDeviceGrid();
    }

    async refreshAll() {
        UI.showToast('Refreshing all devices...', 'info');
        
        // Refresh all devices
        for (const device of this.devices.values()) {
            try {
                const updated = await API.getDevice(device.id);
                this.devices.set(device.id, updated);
                
                // Update in app state too
                if (window.app && window.app.devices) {
                    window.app.devices.set(device.id, updated);
                }
            } catch (error) {
                console.error(`Failed to refresh device ${device.id}:`, error);
            }
        }
        
        this.updateDisplay();
        UI.showToast('Devices refreshed', 'success');
    }

    async troubleshootDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        UI.showToast(`Troubleshooting ${device.name || device.id}...`, 'info');
        
        // TODO: Implement actual troubleshooting steps
        // For now, just try to refresh the device
        try {
            await API.sendDeviceCommand(deviceId, 'ping');
            UI.showToast('Ping sent to device', 'success');
        } catch (error) {
            UI.showToast('Failed to ping device', 'error');
        }
    }

    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            devices: Array.from(this.devices.values()),
            stats: {
                total: this.devices.size,
                online: Array.from(this.devices.values()).filter(d => d.online).length,
                offline: Array.from(this.devices.values()).filter(d => !d.online).length,
                lowBattery: Array.from(this.devices.values()).filter(d => d.battery && d.battery < 20).length,
                withAlerts: Array.from(this.devices.values()).filter(d => d.alerts && d.alerts.length > 0).length
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device-health-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        UI.showToast('Data exported', 'success');
    }

    // Helper methods
    getBatteryIcon(level) {
        if (level > 75) return 'full';
        if (level > 50) return 'three-quarters';
        if (level > 25) return 'half';
        if (level > 10) return 'quarter';
        return 'empty';
    }

    getLastSeenText(timestamp) {
        const diff = Date.now() - new Date(timestamp).getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    getTimeAgo(timestamp) {
        const diff = Date.now() - new Date(timestamp).getTime();
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    destroy() {
        this.stopMonitoring();
        if (this.charts.status) this.charts.status.destroy();
        if (this.charts.types) this.charts.types.destroy();
    }
}

// Export globally
window.monitoring = new DeviceMonitoring();
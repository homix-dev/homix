// Main Application Logic
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.devices = new Map();
        this.automations = new Map();
        this.scenes = new Map();
        this.events = [];
        this.selectedDevice = null;
        this.selectedAutomation = null;
        this.selectedScene = null;
    }

    async init() {
        // Initialize UI event handlers
        this.initEventHandlers();
        
        // Connect WebSocket
        wsManager.connect();
        
        // Setup WebSocket event listeners
        this.setupWebSocketListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Show dashboard
        this.showPage('dashboard');
    }

    initEventHandlers() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.showPage(page);
            });
        });

        // Mobile menu toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshCurrentPage();
        });

        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    UI.hideModal(modal.id);
                }
            });
        });

        // Page-specific handlers
        this.initDashboardHandlers();
        this.initDeviceHandlers();
        this.initAutomationHandlers();
        this.initSceneHandlers();
        this.initSettingsHandlers();

        // Search and filter handlers
        document.getElementById('device-search').addEventListener('input', (e) => {
            this.filterDevices(e.target.value);
        });

        document.getElementById('device-type-filter').addEventListener('change', (e) => {
            this.filterDevices(document.getElementById('device-search').value, e.target.value);
        });
    }

    initDashboardHandlers() {
        // Quick action buttons
        document.getElementById('all-lights-off').addEventListener('click', () => {
            this.executeQuickAction('all_lights_off');
        });

        document.getElementById('activate-away').addEventListener('click', () => {
            this.executeQuickAction('away_mode');
        });

        document.getElementById('activate-night').addEventListener('click', () => {
            this.executeQuickAction('night_mode');
        });

        document.getElementById('run-discovery').addEventListener('click', () => {
            this.runDeviceDiscovery();
        });

        // View all links
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });
    }

    initDeviceHandlers() {
        document.getElementById('add-device-btn').addEventListener('click', () => {
            this.showAddDevice();
        });

        document.getElementById('save-device-btn').addEventListener('click', () => {
            this.saveDevice();
        });
    }

    initAutomationHandlers() {
        document.getElementById('create-automation-btn').addEventListener('click', () => {
            this.showCreateAutomation();
        });

        document.getElementById('save-automation-btn').addEventListener('click', () => {
            this.saveAutomation();
        });
    }

    initSceneHandlers() {
        document.getElementById('create-scene-btn').addEventListener('click', () => {
            this.showCreateScene();
        });

        document.getElementById('save-scene-btn').addEventListener('click', () => {
            this.saveScene();
        });
    }

    initSettingsHandlers() {
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('reset-settings-btn').addEventListener('click', () => {
            this.resetSettings();
        });
    }

    setupWebSocketListeners() {
        // Device updates
        wsManager.on('device_update', (data) => {
            this.handleDeviceUpdate(data);
        });

        // Initial data
        wsManager.on('devices_loaded', (devices) => {
            this.loadDevices(devices);
        });

        wsManager.on('automations_loaded', (automations) => {
            this.loadAutomations(automations);
        });

        wsManager.on('scenes_loaded', (scenes) => {
            this.loadScenes(scenes);
        });

        // Events
        wsManager.on('event', (event) => {
            this.handleEvent(event);
        });

        // Connection events
        wsManager.on('connected', () => {
            UI.showToast('Connected to server', 'success');
        });

        wsManager.on('disconnected', () => {
            UI.showToast('Disconnected from server', 'error');
        });

        wsManager.on('error', (error) => {
            UI.showToast(`Error: ${error.message || 'Unknown error'}`, 'error');
        });
    }

    async loadInitialData() {
        try {
            // Load devices
            const devices = await API.getDevices();
            this.loadDevices(devices);

            // Load automations
            const automations = await API.getAutomations();
            this.loadAutomations(automations);

            // Load scenes
            const scenes = await API.getScenes();
            this.loadScenes(scenes);

            // Load system info
            const systemInfo = await API.getSystemInfo();
            this.updateSystemInfo(systemInfo);

        } catch (error) {
            console.error('Failed to load initial data:', error);
            UI.showToast('Failed to load data', 'error');
        }
    }

    loadDevices(devices) {
        this.devices.clear();
        devices.forEach(device => {
            this.devices.set(device.id, device);
        });
        this.updateDeviceDisplays();
    }

    loadAutomations(automations) {
        this.automations.clear();
        automations.forEach(automation => {
            this.automations.set(automation.id, automation);
        });
        this.updateAutomationDisplays();
    }

    loadScenes(scenes) {
        this.scenes.clear();
        scenes.forEach(scene => {
            this.scenes.set(scene.id, scene);
        });
        this.updateSceneDisplays();
    }

    handleDeviceUpdate(data) {
        const { device_id, state } = data;
        const device = this.devices.get(device_id);
        
        if (device) {
            device.state = state;
            device.last_seen = new Date().toISOString();
            device.online = true;
            
            this.updateDeviceCard(device);
            
            // Update dashboard if visible
            if (this.currentPage === 'dashboard') {
                this.updateDashboardDevice(device);
            }
        }
    }

    handleEvent(event) {
        this.events.unshift(event);
        
        // Keep only last 1000 events
        if (this.events.length > 1000) {
            this.events = this.events.slice(0, 1000);
        }
        
        // Update event displays
        if (this.currentPage === 'dashboard') {
            this.updateRecentEvents();
        } else if (this.currentPage === 'events') {
            this.addEventToTable(event);
        }
    }

    showPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.style.display = 'block';
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            devices: 'Devices',
            automations: 'Automations',
            scenes: 'Scenes',
            events: 'Events',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        this.currentPage = page;

        // Load page-specific data
        this.loadPageData(page);
    }

    loadPageData(page) {
        switch (page) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'devices':
                this.updateDeviceGrid();
                break;
            case 'automations':
                this.updateAutomationList();
                break;
            case 'scenes':
                this.updateSceneGrid();
                break;
            case 'events':
                this.updateEventTable();
                break;
        }
    }

    updateDashboard() {
        // Update stats
        const stats = {
            totalDevices: this.devices.size,
            onlineDevices: Array.from(this.devices.values()).filter(d => d.online).length,
            totalAutomations: this.automations.size,
            activeAutomations: Array.from(this.automations.values()).filter(a => a.enabled).length,
            totalScenes: this.scenes.size,
            todayEvents: this.events.filter(e => {
                const today = new Date().toDateString();
                return new Date(e.timestamp).toDateString() === today;
            }).length
        };
        UI.updateStats(stats);

        // Update recent devices
        this.updateRecentDevices();

        // Update recent events
        this.updateRecentEvents();
    }

    updateRecentDevices() {
        const container = document.getElementById('recent-devices');
        container.innerHTML = '';

        // Get 5 most recently updated devices
        const recentDevices = Array.from(this.devices.values())
            .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
            .slice(0, 5);

        recentDevices.forEach(device => {
            const item = document.createElement('div');
            item.className = 'device-item';
            item.innerHTML = `
                <div class="device-info">
                    <div class="device-icon">
                        <i class="fas ${UI.getDeviceIcon(device.type)}"></i>
                    </div>
                    <div class="device-details">
                        <h4>${device.name || device.id}</h4>
                        <span>${device.type}</span>
                    </div>
                </div>
                <div class="device-status">
                    <span class="status-indicator ${device.online ? 'online' : ''}"></span>
                    <span>${device.online ? 'Online' : 'Offline'}</span>
                </div>
            `;
            item.onclick = () => this.showDeviceDetails(device.id);
            container.appendChild(item);
        });
    }

    updateRecentEvents() {
        const container = document.getElementById('recent-events');
        container.innerHTML = '';

        // Show last 10 events
        const recentEvents = this.events.slice(0, 10);

        recentEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = `event-item ${event.type}`;
            const time = new Date(event.timestamp).toLocaleTimeString();
            
            item.innerHTML = `
                <div class="event-time">${time}</div>
                <div class="event-content">
                    <div class="event-title">${event.type}</div>
                    <div class="event-description">${event.source || 'System'}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateDeviceGrid() {
        const grid = document.getElementById('devices-grid');
        grid.innerHTML = '';

        this.devices.forEach(device => {
            const card = UI.createDeviceCard(device);
            grid.appendChild(card);
        });
    }

    updateDeviceCard(device) {
        const card = document.querySelector(`.device-card[data-device-id="${device.id}"]`);
        if (card) {
            const newCard = UI.createDeviceCard(device);
            card.replaceWith(newCard);
        }
    }

    updateAutomationList() {
        const list = document.getElementById('automations-list');
        list.innerHTML = '';

        this.automations.forEach(automation => {
            const card = UI.createAutomationCard(automation);
            list.appendChild(card);
        });
    }

    updateSceneGrid() {
        const grid = document.getElementById('scenes-grid');
        grid.innerHTML = '';

        this.scenes.forEach(scene => {
            const card = UI.createSceneCard(scene);
            grid.appendChild(card);
        });
    }

    updateEventTable() {
        const tbody = document.getElementById('events-table-body');
        tbody.innerHTML = '';

        this.events.forEach(event => {
            const row = UI.createEventRow(event);
            tbody.appendChild(row);
        });
    }

    updateDeviceDisplays() {
        if (this.currentPage === 'dashboard') {
            this.updateDashboard();
        } else if (this.currentPage === 'devices') {
            this.updateDeviceGrid();
        }
    }

    updateAutomationDisplays() {
        if (this.currentPage === 'dashboard') {
            this.updateDashboard();
        } else if (this.currentPage === 'automations') {
            this.updateAutomationList();
        }
    }

    updateSceneDisplays() {
        if (this.currentPage === 'dashboard') {
            this.updateDashboard();
        } else if (this.currentPage === 'scenes') {
            this.updateSceneGrid();
        }
    }

    updateSystemInfo(info) {
        // Update system info displays
        console.log('System info:', info);
    }

    // Device actions
    async toggleDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        try {
            const command = device.state?.state === 'on' ? 'off' : 'on';
            await API.sendDeviceCommand(deviceId, command);
            UI.showToast(`Device ${command}`, 'success');
        } catch (error) {
            UI.showToast('Failed to toggle device', 'error');
        }
    }

    async showDeviceDetails(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        this.selectedDevice = device;

        const modalBody = document.getElementById('device-modal-body');
        modalBody.innerHTML = `
            <div class="device-details-form">
                <div class="form-group">
                    <label>Device Name</label>
                    <input type="text" id="device-name-input" class="form-control" value="${device.name || device.id}">
                </div>
                <div class="form-group">
                    <label>Device ID</label>
                    <input type="text" class="form-control" value="${device.id}" disabled>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <input type="text" class="form-control" value="${device.type}" disabled>
                </div>
                <div class="form-group">
                    <label>Manufacturer</label>
                    <input type="text" class="form-control" value="${device.manufacturer || 'Unknown'}" disabled>
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" class="form-control" value="${device.model || 'Unknown'}" disabled>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <input type="text" class="form-control" value="${device.online ? 'Online' : 'Offline'}" disabled>
                </div>
                <div class="form-group">
                    <label>Last Seen</label>
                    <input type="text" class="form-control" value="${new Date(device.last_seen).toLocaleString()}" disabled>
                </div>
                ${device.state ? `
                    <div class="form-group">
                        <label>Current State</label>
                        <pre class="state-display">${JSON.stringify(UI.formatDeviceState(device.state), null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('device-modal-title').textContent = `Device: ${device.name || device.id}`;
        document.getElementById('save-device-btn').style.display = 'inline-flex';
        UI.showModal('device-modal');
    }

    async saveDevice() {
        if (!this.selectedDevice) return;

        const name = document.getElementById('device-name-input').value;

        try {
            await API.updateDevice(this.selectedDevice.id, { name });
            this.selectedDevice.name = name;
            this.updateDeviceCard(this.selectedDevice);
            UI.hideModal('device-modal');
            UI.showToast('Device updated successfully', 'success');
        } catch (error) {
            UI.showToast('Failed to update device', 'error');
        }
    }

    // Automation actions
    async toggleAutomation(automationId, enable) {
        try {
            if (enable) {
                await API.enableAutomation(automationId);
            } else {
                await API.disableAutomation(automationId);
            }
            
            const automation = this.automations.get(automationId);
            if (automation) {
                automation.enabled = enable;
                this.updateAutomationDisplays();
            }
            
            UI.showToast(`Automation ${enable ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            UI.showToast('Failed to toggle automation', 'error');
        }
    }

    async editAutomation(automationId) {
        const automation = this.automations.get(automationId);
        if (!automation) return;

        this.selectedAutomation = automation;
        // TODO: Implement automation editor
        UI.showToast('Automation editor coming soon', 'info');
    }

    async testAutomation(automationId) {
        try {
            await API.testAutomation(automationId);
            UI.showToast('Automation test triggered', 'success');
        } catch (error) {
            UI.showToast('Failed to test automation', 'error');
        }
    }

    async deleteAutomation(automationId) {
        if (!confirm('Are you sure you want to delete this automation?')) {
            return;
        }

        try {
            await API.deleteAutomation(automationId);
            this.automations.delete(automationId);
            this.updateAutomationDisplays();
            UI.showToast('Automation deleted', 'success');
        } catch (error) {
            UI.showToast('Failed to delete automation', 'error');
        }
    }

    showCreateAutomation() {
        this.selectedAutomation = null;
        // TODO: Implement automation builder
        UI.showToast('Automation builder coming soon', 'info');
    }

    // Scene actions
    async activateScene(sceneId) {
        try {
            await API.activateScene(sceneId);
            UI.showToast('Scene activated', 'success');
        } catch (error) {
            UI.showToast('Failed to activate scene', 'error');
        }
    }

    showCreateScene() {
        this.selectedScene = null;
        // TODO: Implement scene editor
        UI.showToast('Scene editor coming soon', 'info');
    }

    // Quick actions
    async executeQuickAction(action) {
        try {
            let commandData = {};
            let targetDevices = [];
            
            switch (action) {
                case 'all_lights_off':
                    // Find all light devices
                    targetDevices = Array.from(this.devices.values())
                        .filter(d => d.type === 'light' && d.online);
                    commandData = { state: 'off' };
                    break;
                    
                case 'away_mode':
                    // Turn off all lights and switches, arm security
                    targetDevices = Array.from(this.devices.values())
                        .filter(d => (d.type === 'light' || d.type === 'switch') && d.online);
                    commandData = { state: 'off' };
                    
                    // Additionally, activate away scene if it exists
                    const awayScene = Array.from(this.scenes.values())
                        .find(s => s.name.toLowerCase().includes('away'));
                    if (awayScene) {
                        await this.activateScene(awayScene.id);
                    }
                    break;
                    
                case 'night_mode':
                    // Dim lights, turn off unnecessary devices
                    const nightScene = Array.from(this.scenes.values())
                        .find(s => s.name.toLowerCase().includes('night'));
                    if (nightScene) {
                        await this.activateScene(nightScene.id);
                        UI.showToast('Night mode activated', 'success');
                        return;
                    }
                    
                    // Fallback: turn off all lights except bedroom
                    targetDevices = Array.from(this.devices.values())
                        .filter(d => d.type === 'light' && d.online && 
                               !d.name.toLowerCase().includes('bedroom'));
                    commandData = { state: 'off' };
                    break;
                    
                default:
                    UI.showToast('Unknown quick action', 'error');
                    return;
            }
            
            // Execute commands on target devices
            if (targetDevices.length > 0) {
                UI.showToast(`Executing ${action.replace(/_/g, ' ')}...`, 'info');
                
                const promises = targetDevices.map(device => 
                    API.sendDeviceCommand(device.id, 'set', commandData)
                        .catch(err => console.error(`Failed to control ${device.id}:`, err))
                );
                
                await Promise.allSettled(promises);
                UI.showToast(`${action.replace(/_/g, ' ')} completed`, 'success');
            } else {
                UI.showToast('No devices found for this action', 'warning');
            }
        } catch (error) {
            console.error('Quick action error:', error);
            UI.showToast('Failed to execute quick action', 'error');
        }
    }

    async runDeviceDiscovery() {
        try {
            UI.showToast('Starting device discovery...', 'info');
            
            const response = await fetch('/api/v1/devices/discovery/start', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                UI.showToast('Device discovery started. This will take up to 30 seconds.', 'success');
                
                // Show progress
                this.showDiscoveryProgress();
                
                // Check status periodically
                const checkInterval = setInterval(async () => {
                    const statusResponse = await fetch('/api/v1/devices/discovery/status');
                    const status = await statusResponse.json();
                    
                    if (status.data && !status.data.active) {
                        clearInterval(checkInterval);
                        UI.hideModal('discovery-progress-modal');
                        UI.showToast('Device discovery completed', 'success');
                        
                        // Refresh device list
                        const devices = await API.getDevices();
                        this.loadDevices(devices);
                    }
                }, 2000);
                
                // Stop checking after 35 seconds as a failsafe
                setTimeout(() => {
                    clearInterval(checkInterval);
                    UI.hideModal('discovery-progress-modal');
                }, 35000);
            } else {
                UI.showToast('Failed to start device discovery', 'error');
            }
        } catch (error) {
            console.error('Device discovery error:', error);
            UI.showToast('Failed to start device discovery', 'error');
        }
    }
    
    showDiscoveryProgress() {
        const modalBody = document.getElementById('device-modal-body');
        modalBody.innerHTML = `
            <div class="discovery-progress">
                <div class="discovery-icon">
                    <i class="fas fa-search fa-spin"></i>
                </div>
                <h3>Discovering Devices...</h3>
                <p>Scanning for new devices on your network. This may take up to 30 seconds.</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="animation: progressFill 30s linear;"></div>
                </div>
                <p class="discovery-hint">Make sure your devices are powered on and in pairing mode.</p>
            </div>
        `;
        
        document.getElementById('device-modal-title').textContent = 'Device Discovery';
        document.getElementById('save-device-btn').style.display = 'none';
        UI.showModal('device-modal');
    }

    // Settings
    async saveSettings() {
        // TODO: Implement settings save
        UI.showToast('Settings saved', 'success');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            // TODO: Implement settings reset
            UI.showToast('Settings reset to defaults', 'success');
        }
    }

    // Utility methods
    filterDevices(search = '', type = '') {
        const searchLower = search.toLowerCase();
        const grid = document.getElementById('devices-grid');
        
        grid.innerHTML = '';
        
        this.devices.forEach(device => {
            // Apply filters
            if (type && device.type !== type) return;
            if (search && !device.id.toLowerCase().includes(searchLower) && 
                !(device.name && device.name.toLowerCase().includes(searchLower))) return;
            
            const card = UI.createDeviceCard(device);
            grid.appendChild(card);
        });
    }

    refreshCurrentPage() {
        this.loadPageData(this.currentPage);
        UI.showToast('Page refreshed', 'success');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    app.init();
});
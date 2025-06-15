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
        this.startTime = Date.now();
    }

    async init() {
        // Initialize UI event handlers
        this.initEventHandlers();
        
        // Update user avatar
        this.updateUserAvatar();
        
        // Connect WebSocket
        wsManager.connect();
        
        // Setup WebSocket event listeners
        this.setupWebSocketListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Show dashboard
        this.showPage('dashboard');
    }
    
    updateUserAvatar() {
        // Get user info from auth
        const user = auth.getUser();
        if (user && user.name) {
            // Update avatar
            const avatarImg = document.querySelector('.user-avatar');
            if (avatarImg) {
                avatarImg.src = avatarGenerator.generateDataURL(user.name, 32);
            }
            
            // Update user name displays
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = user.username || 'Admin';
            }
            
            const userFullname = document.getElementById('user-fullname');
            if (userFullname) {
                userFullname.textContent = user.name || 'Administrator';
            }
        }
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

        // User menu handler
        this.initUserMenu();

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

        document.getElementById('save-automation-btn').addEventListener('click', async () => {
            await this.saveAutomation();
        });
    }

    initSceneHandlers() {
        document.getElementById('create-scene-btn').addEventListener('click', () => {
            this.showCreateScene();
        });

        document.getElementById('save-scene-btn').addEventListener('click', async () => {
            await this.saveScene();
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
        // Handle both array and object formats
        if (Array.isArray(automations)) {
            automations.forEach(automation => {
                this.automations.set(automation.id, automation);
            });
        } else if (automations && typeof automations === 'object') {
            // If it's an object, convert to array
            Object.values(automations).forEach(automation => {
                this.automations.set(automation.id, automation);
            });
        }
        this.updateAutomationDisplays();
    }

    loadScenes(scenes) {
        this.scenes.clear();
        // Handle both array and object formats
        if (Array.isArray(scenes)) {
            scenes.forEach(scene => {
                this.scenes.set(scene.id, scene);
            });
        } else if (scenes && typeof scenes === 'object') {
            // If it's an object, convert to array
            Object.values(scenes).forEach(scene => {
                this.scenes.set(scene.id, scene);
            });
        }
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
            this.addEventToLiveTable(event);
        }
    }
    
    addEventToLiveTable(event) {
        const tbody = document.getElementById('events-table-body');
        if (!tbody) return;
        
        // Create new row for the event
        const row = UI.createEventRow(event);
        
        // Add to the beginning of the table (newest first)
        tbody.insertBefore(row, tbody.firstChild);
        
        // Keep only last 500 rows in the table for performance
        while (tbody.children.length > 500) {
            tbody.removeChild(tbody.lastChild);
        }
        
        // Add animation for new event
        row.classList.add('new-event');
        setTimeout(() => row.classList.remove('new-event'), 1000);
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
            monitoring: 'Health Monitor',
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
            case 'monitoring':
                if (!window.monitoring.updateInterval) {
                    window.monitoring.init();
                } else {
                    window.monitoring.updateDisplay();
                }
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

    updateDashboardDevice(device) {
        // Update recent devices list if this device is in it
        this.updateRecentDevices();
        
        // Update any device-specific stats on dashboard
        this.updateDashboard();
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

    async updateEventTable() {
        const tbody = document.getElementById('events-table-body');
        tbody.innerHTML = '';
        
        try {
            // Load events from API
            const response = await API.getSystemEvents();
            if (response && response.length > 0) {
                // Update local events array with API data
                this.events = response;
                
                // Populate table
                this.events.forEach(event => {
                    const row = UI.createEventRow(event);
                    tbody.appendChild(row);
                });
            } else {
                // Use local events if API returns empty
                this.events.forEach(event => {
                    const row = UI.createEventRow(event);
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Failed to load events from API:', error);
            // Fall back to local events
            this.events.forEach(event => {
                const row = UI.createEventRow(event);
                tbody.appendChild(row);
            });
        }
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
        
        // Use the enhanced device controls
        deviceControls.init(device);

        document.getElementById('device-modal-title').textContent = `Device: ${device.name || device.id}`;
        document.getElementById('save-device-btn').style.display = 'none'; // Hide save button for now
        UI.showModal('device-modal');
    }

    showAddDevice() {
        // Clear selected device
        this.selectedDevice = null;
        
        // Create form for new device
        const modalBody = document.getElementById('device-modal-body');
        modalBody.innerHTML = `
            <div class="form-group">
                <label>Device Name</label>
                <input type="text" id="new-device-name" class="form-control" placeholder="e.g., Living Room Light">
            </div>
            <div class="form-group">
                <label>Device Type</label>
                <select id="new-device-type" class="form-control">
                    <option value="">Select a type</option>
                    <option value="light">Light</option>
                    <option value="switch">Switch</option>
                    <option value="sensor">Sensor</option>
                    <option value="thermostat">Thermostat</option>
                    <option value="camera">Camera</option>
                    <option value="lock">Lock</option>
                </select>
            </div>
            <div class="form-group">
                <label>Room</label>
                <input type="text" id="new-device-room" class="form-control" placeholder="e.g., Living Room">
            </div>
            <div class="form-group">
                <label>Device ID (optional)</label>
                <input type="text" id="new-device-id" class="form-control" placeholder="Leave empty for auto-generated ID">
            </div>
        `;
        
        // Update modal title and show save button
        document.getElementById('device-modal-title').textContent = 'Add New Device';
        document.getElementById('save-device-btn').style.display = 'block';
        document.getElementById('save-device-btn').textContent = 'Add Device';
        
        // Update save button handler
        document.getElementById('save-device-btn').onclick = () => this.createDevice();
        
        UI.showModal('device-modal');
    }
    
    async createDevice() {
        const name = document.getElementById('new-device-name').value;
        const type = document.getElementById('new-device-type').value;
        const room = document.getElementById('new-device-room').value;
        const id = document.getElementById('new-device-id').value;
        
        if (!name || !type) {
            UI.showToast('Please provide device name and type', 'error');
            return;
        }
        
        const deviceData = {
            name,
            type,
            room: room || 'Unknown',
            config: {}
        };
        
        if (id) {
            deviceData.id = id;
        }
        
        try {
            const newDevice = await API.createDevice(deviceData);
            
            // Add to local devices map
            this.devices.set(newDevice.id, newDevice);
            
            // Update UI - convert map to array for loadDevices
            const devicesArray = Array.from(this.devices.values());
            this.loadDevices(devicesArray);
            
            UI.hideModal('device-modal');
            UI.showToast('Device added successfully', 'success');
        } catch (error) {
            console.error('Error creating device:', error);
            UI.showToast('Failed to add device', 'error');
        }
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
        // Always open in visual designer
        this.showReteDesigner(automation);
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
        // Go directly to visual designer
        this.showReteDesigner();
    }
    
    showBuilderChoice() {
        const modalBody = document.getElementById('automation-modal-body');
        modalBody.innerHTML = `
            <div class="builder-choice">
                <h3>Choose Automation Builder</h3>
                <div class="builder-options">
                    <div class="builder-option" id="visual-designer-option">
                        <i class="fas fa-project-diagram"></i>
                        <h4>Visual Designer</h4>
                        <p>Drag and drop nodes to create automation flows</p>
                    </div>
                    <div class="builder-option" id="form-builder-option">
                        <i class="fas fa-list-alt"></i>
                        <h4>Form Builder</h4>
                        <p>Step-by-step form to configure automation</p>
                    </div>
                </div>
            </div>
        `;
        
        // Attach click handlers after DOM is updated
        document.getElementById('visual-designer-option').onclick = () => this.showReteDesigner();
        document.getElementById('form-builder-option').onclick = () => this.showTraditionalBuilder();
        
        document.getElementById('automation-modal-title').textContent = 'Create Automation';
        const modalFooter = document.querySelector('#automation-modal .modal-footer');
        modalFooter.innerHTML = `<button class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>`;
        
        // Attach cancel handler
        document.getElementById('cancel-modal-btn').onclick = () => UI.hideModal('automation-modal');
        
        UI.showModal('automation-modal');
    }
    
    createAutomation() {
        this.showCreateAutomation();
    }
    
    showFlowDesigner(automation = null) {
        // Use the new Rete.js designer
        this.showReteDesigner(automation);
    }
    
    showReteDesigner(automation = null) {
        // Use the passed automation or the selected one
        const automationToEdit = automation || this.selectedAutomation;
        
        // Update modal title
        const modalTitle = automationToEdit ? 'Edit Automation - Visual Designer' : 'Create Automation - Visual Designer';
        document.getElementById('automation-modal-title').textContent = modalTitle;
        
        // Update modal content for full-screen designer
        const modalContent = document.querySelector('#automation-modal .modal-content');
        modalContent.classList.add('flow-designer-modal');
        
        const modalBody = document.getElementById('automation-modal-body');
        modalBody.classList.add('flow-designer-body');
        modalBody.innerHTML = '<div id="rete-designer-container" style="height: 100%;"></div>';
        
        // Initialize Rete designer with a slight delay to ensure DOM is ready
        setTimeout(() => {
            if (window.reteDesigner) {
                window.reteDesigner.init('rete-designer-container', automationToEdit);
            } else {
                console.error('Rete designer not loaded');
                this.showTraditionalBuilder(automationToEdit);
                return;
            }
        }, 100);
        
        // Update modal footer
        const modalFooter = document.querySelector('#automation-modal .modal-footer');
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="switch-to-form-btn">Switch to Form Builder</button>
            <button class="btn btn-secondary" id="cancel-rete-btn">Cancel</button>
            <button class="btn btn-primary" id="save-rete-btn">Save Automation</button>
        `;
        
        // Attach button handlers
        document.getElementById('switch-to-form-btn').onclick = () => this.showTraditionalBuilder();
        document.getElementById('cancel-rete-btn').onclick = () => UI.hideModal('automation-modal');
        document.getElementById('save-rete-btn').onclick = () => this.saveReteAutomation();
        
        // Show the modal
        UI.showModal('automation-modal');
    }
    
    async saveReteAutomation() {
        if (!window.reteDesigner) {
            UI.showToast('Visual designer not available', 'error');
            return;
        }
        
        // Get automation data from Rete designer (includes name, description, enabled)
        const automationData = window.reteDesigner.convertToAutomation();
        const finalData = automationData;
        
        if (!finalData.name) {
            UI.showToast('Please enter an automation name', 'error');
            return;
        }
        
        if (finalData.triggers.length === 0) {
            UI.showToast('Please add at least one trigger', 'error');
            return;
        }
        
        if (finalData.actions.length === 0) {
            UI.showToast('Please add at least one action', 'error');
            return;
        }
        
        try {
            if (this.selectedAutomation) {
                // Update existing automation
                await API.updateAutomation(this.selectedAutomation.id, finalData);
                Object.assign(this.selectedAutomation, finalData);
                UI.showToast('Automation updated successfully', 'success');
            } else {
                // Create new automation
                const newAutomation = await API.createAutomation(finalData);
                this.automations.set(newAutomation.id, newAutomation);
                UI.showToast('Automation created successfully', 'success');
            }
            
            this.updateAutomationDisplays();
            UI.hideModal('automation-modal');
        } catch (error) {
            console.error('Save automation error:', error);
            UI.showToast('Failed to save automation', 'error');
        }
    }

    waitForFlowy(callback, maxAttempts = 10, attempt = 0) {
        if (typeof flowy !== 'undefined') {
            callback();
            return;
        }
        
        if (attempt >= maxAttempts) {
            console.error('Flowy library failed to load after maximum attempts');
            this.showTraditionalBuilder();
            return;
        }
        
        setTimeout(() => {
            this.waitForFlowy(callback, maxAttempts, attempt + 1);
        }, 500);
    }

    showTraditionalBuilder(automation = null) {
        // Use the passed automation or the selected one
        const automationToEdit = automation || this.selectedAutomation;
        
        // Update modal title
        const modalTitle = automationToEdit ? 'Edit Automation' : 'Create Automation';
        document.getElementById('automation-modal-title').textContent = modalTitle;
        
        // Reset modal content classes
        const modalContent = document.querySelector('#automation-modal .modal-content');
        modalContent.classList.remove('flow-designer-modal');
        
        const modalBody = document.getElementById('automation-modal-body');
        modalBody.classList.remove('flow-designer-body');
        modalBody.innerHTML = ''; // Clear any existing content
        
        // Initialize automation builder
        automationBuilder.init(automationToEdit);
        
        // Reset modal footer
        const modalFooter = document.querySelector('#automation-modal .modal-footer');
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="cancel-form-btn">Cancel</button>
            <button class="btn btn-primary" id="save-automation-btn">Save Automation</button>
        `;
        
        // Ensure the button handlers are attached
        document.getElementById('save-automation-btn').onclick = () => this.saveAutomation();
        document.getElementById('cancel-form-btn').onclick = () => UI.hideModal('automation-modal');
        
        // Show the modal
        UI.showModal('automation-modal');
    }
    
    async saveFlowAutomation() {
        // Check if Flowy designer is available
        if (!window.flowyDesigner) {
            UI.showToast('Flow designer not available', 'error');
            return;
        }
        
        // Get flow data
        const automationData = flowyDesigner.getAutomationData();
        
        if (!automationData.name) {
            UI.showToast('Please enter an automation name', 'error');
            return;
        }
        
        if (automationData.triggers.length === 0) {
            UI.showToast('Please add at least one trigger node', 'error');
            return;
        }
        
        if (automationData.actions.length === 0) {
            UI.showToast('Please add at least one action node', 'error');
            return;
        }
        
        const finalAutomationData = automationData;
        
        try {
            if (this.selectedAutomation) {
                // Update existing automation
                await API.updateAutomation(this.selectedAutomation.id, finalAutomationData);
                Object.assign(this.selectedAutomation, finalAutomationData);
                UI.showToast('Automation updated successfully', 'success');
            } else {
                // Create new automation
                const newAutomation = await API.createAutomation(finalAutomationData);
                this.automations.set(newAutomation.id, newAutomation);
                UI.showToast('Automation created successfully', 'success');
            }
            
            this.updateAutomationDisplays();
            UI.hideModal('automation-modal');
        } catch (error) {
            UI.showToast('Failed to save automation', 'error');
        }
    }

    async saveAutomation() {
        const automationData = automationBuilder.getAutomationData();
        
        if (!automationData.name) {
            UI.showToast('Please enter an automation name', 'error');
            return;
        }
        
        if (automationData.triggers.length === 0) {
            UI.showToast('Please add at least one trigger', 'error');
            return;
        }
        
        if (automationData.actions.length === 0) {
            UI.showToast('Please add at least one action', 'error');
            return;
        }
        
        try {
            if (this.selectedAutomation) {
                // Update existing automation
                await API.updateAutomation(this.selectedAutomation.id, automationData);
                Object.assign(this.selectedAutomation, automationData);
                UI.showToast('Automation updated successfully', 'success');
            } else {
                // Create new automation
                const newAutomation = await API.createAutomation(automationData);
                this.automations.set(newAutomation.id, newAutomation);
                UI.showToast('Automation created successfully', 'success');
            }
            
            this.updateAutomationDisplays();
            UI.hideModal('automation-modal');
        } catch (error) {
            UI.showToast('Failed to save automation', 'error');
        }
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
        sceneEditor.init();
        document.getElementById('scene-modal-title').textContent = 'Create Scene';
        UI.showModal('scene-modal');
    }

    async editScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) return;

        this.selectedScene = scene;
        sceneEditor.init(scene);
        document.getElementById('scene-modal-title').textContent = 'Edit Scene';
        UI.showModal('scene-modal');
    }

    async saveScene() {
        const sceneData = sceneEditor.getSceneData();
        
        if (!sceneData.name) {
            UI.showToast('Please enter a scene name', 'error');
            return;
        }
        
        if (sceneData.devices.length === 0) {
            UI.showToast('Please add at least one device to the scene', 'error');
            return;
        }
        
        try {
            if (this.selectedScene) {
                // Update existing scene
                await API.updateScene(this.selectedScene.id, sceneData);
                Object.assign(this.selectedScene, sceneData);
                UI.showToast('Scene updated successfully', 'success');
            } else {
                // Create new scene
                const newScene = await API.createScene(sceneData);
                this.scenes.set(newScene.id, newScene);
                UI.showToast('Scene created successfully', 'success');
            }
            
            this.updateSceneDisplays();
            UI.hideModal('scene-modal');
        } catch (error) {
            UI.showToast('Failed to save scene', 'error');
        }
    }

    async deleteScene(sceneId) {
        if (!confirm('Are you sure you want to delete this scene?')) {
            return;
        }

        try {
            await API.deleteScene(sceneId);
            this.scenes.delete(sceneId);
            this.updateSceneDisplays();
            UI.showToast('Scene deleted', 'success');
        } catch (error) {
            UI.showToast('Failed to delete scene', 'error');
        }
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
            
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            console.log('Using auth token:', token);
            
            const response = await fetch('/api/v1/devices/discovery/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                // Session expired
                console.error('Authentication failed - status 401');
                console.error('Token was:', token);
                UI.showToast('Session expired. Please refresh the page and login again.', 'error');
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                UI.showToast('Device discovery started. This will take up to 30 seconds.', 'success');
                
                // Show progress
                this.showDiscoveryProgress();
                
                // Check status periodically
                const checkInterval = setInterval(async () => {
                    const statusResponse = await fetch('/api/v1/devices/discovery/status', {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`
                        }
                    });
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

    initUserMenu() {
        const userMenu = document.getElementById('user-menu');
        
        // Update user info from auth
        if (auth.user) {
            document.getElementById('user-name').textContent = auth.user.username;
            document.getElementById('user-fullname').textContent = auth.user.name || auth.user.username;
            document.getElementById('user-role').textContent = auth.user.role || 'User';
        }
        
        // Toggle dropdown on click
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userMenu.classList.remove('active');
        });
        
        // Prevent dropdown from closing when clicking inside
        document.getElementById('user-dropdown').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    showProfile() {
        UI.showToast('Profile page coming soon', 'info');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize authentication first
    await auth.init();
    
    // Only initialize app if authenticated
    if (auth.isAuthenticated) {
        window.app = new App();
        app.init();
    }
});
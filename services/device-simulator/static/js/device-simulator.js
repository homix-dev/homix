class DeviceSimulator {
    constructor() {
        this.devices = new Map();
        this.deviceTypes = [];
        this.ws = null;
        this.selectedFilters = new Set(['all']);
        this.editingDevice = null;
        
        this.init();
    }
    
    async init() {
        // Load device types
        await this.loadDeviceTypes();
        
        // Load devices
        await this.loadDevices();
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // Setup filter handlers
        this.setupFilterHandlers();
        
        // Update stats
        this.updateStats();
    }
    
    connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:${window.location.port}/ws`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.showToast('Connected to device simulator', 'success');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast('WebSocket connection error', 'error');
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.showToast('WebSocket disconnected', 'error');
            // Reconnect after 3 seconds
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'device_created':
            case 'device_updated':
            case 'state_updated':
                this.updateDevice(data.device);
                break;
                
            case 'device_deleted':
                this.removeDevice(data.device_id);
                break;
        }
    }
    
    async loadDeviceTypes() {
        try {
            const response = await fetch('/api/device-types');
            this.deviceTypes = await response.json();
            
            // Populate device type select
            const select = document.getElementById('device-type');
            select.innerHTML = '<option value="">Select a type...</option>';
            
            this.deviceTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.type;
                option.textContent = type.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load device types:', error);
            this.showToast('Failed to load device types', 'error');
        }
    }
    
    async loadDevices() {
        try {
            const response = await fetch('/api/devices');
            const devices = await response.json();
            
            this.devices.clear();
            devices.forEach(device => {
                this.devices.set(device.id, device);
            });
            
            this.renderDevices();
        } catch (error) {
            console.error('Failed to load devices:', error);
            this.showToast('Failed to load devices', 'error');
        }
    }
    
    renderDevices() {
        const grid = document.getElementById('devices-grid');
        grid.innerHTML = '';
        
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        
        Array.from(this.devices.values())
            .filter(device => this.filterDevice(device, searchTerm))
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(device => {
                grid.appendChild(this.createDeviceCard(device));
            });
        
        this.updateStats();
    }
    
    filterDevice(device, searchTerm) {
        // Type filter
        if (!this.selectedFilters.has('all') && !this.selectedFilters.has(device.type)) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            return device.name.toLowerCase().includes(searchTerm) ||
                   device.id.toLowerCase().includes(searchTerm) ||
                   (device.room && device.room.toLowerCase().includes(searchTerm));
        }
        
        return true;
    }
    
    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = `device-card ${device.type} ${device.online ? '' : 'offline'}`;
        
        const deviceType = this.deviceTypes.find(t => t.type === device.type) || {};
        const icon = deviceType.icon || 'fa-question';
        
        card.innerHTML = `
            <div class="device-header">
                <div class="device-info">
                    <h3>
                        <i class="fas ${icon} device-icon"></i>
                        ${device.name}
                    </h3>
                    <div class="device-type">${device.type}</div>
                    ${device.room ? `<div class="device-room">${device.room}</div>` : ''}
                </div>
                <div class="device-status">
                    <span class="status-indicator ${device.online ? 'online' : ''}"></span>
                    <small>${device.online ? 'Online' : 'Offline'}</small>
                </div>
            </div>
            
            <div class="device-state">
                ${this.renderDeviceState(device)}
            </div>
            
            <div class="device-actions">
                ${this.renderQuickActions(device)}
                <button class="btn btn-secondary btn-sm" onclick="deviceSimulator.showDeviceControls('${device.id}')">
                    <i class="fas fa-sliders-h"></i> Control
                </button>
                <button class="btn btn-icon btn-sm" onclick="deviceSimulator.editDevice('${device.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-sm" onclick="deviceSimulator.deleteDevice('${device.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }
    
    renderDeviceState(device) {
        const states = [];
        
        Object.entries(device.state || {}).forEach(([key, value]) => {
            const displayValue = this.formatStateValue(key, value);
            states.push(`
                <div class="state-item">
                    <span class="state-label">${key.replace(/_/g, ' ')}</span>
                    <span class="state-value">${displayValue}</span>
                </div>
            `);
        });
        
        return states.join('');
    }
    
    formatStateValue(key, value) {
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        if (key.includes('temperature')) {
            return `${value}°C`;
        }
        
        if (key.includes('humidity')) {
            return `${value}%`;
        }
        
        if (key.includes('brightness')) {
            return `${value}%`;
        }
        
        if (key === 'position') {
            return `${value}%`;
        }
        
        return value;
    }
    
    renderQuickActions(device) {
        switch (device.type) {
            case 'light':
            case 'switch':
            case 'fan':
                return `
                    <button class="btn btn-primary btn-sm" onclick="deviceSimulator.toggleDevice('${device.id}')">
                        <i class="fas fa-power-off"></i> Toggle
                    </button>
                `;
                
            case 'lock':
                const isLocked = device.state.state === 'locked';
                return `
                    <button class="btn btn-primary btn-sm" onclick="deviceSimulator.toggleLock('${device.id}')">
                        <i class="fas fa-${isLocked ? 'unlock' : 'lock'}"></i> 
                        ${isLocked ? 'Unlock' : 'Lock'}
                    </button>
                `;
                
            case 'cover':
                const isOpen = device.state.position > 0;
                return `
                    <button class="btn btn-primary btn-sm" onclick="deviceSimulator.toggleCover('${device.id}')">
                        <i class="fas fa-${isOpen ? 'arrow-down' : 'arrow-up'}"></i>
                        ${isOpen ? 'Close' : 'Open'}
                    </button>
                `;
                
            default:
                return '';
        }
    }
    
    showAddDevice() {
        this.editingDevice = null;
        document.getElementById('modal-title').textContent = 'Add Device';
        document.getElementById('device-form').reset();
        document.getElementById('device-id').value = '';
        document.getElementById('device-id').readOnly = false;
        document.getElementById('initial-state-fields').innerHTML = '';
        document.getElementById('device-modal').classList.add('active');
    }
    
    editDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        this.editingDevice = device;
        document.getElementById('modal-title').textContent = 'Edit Device';
        document.getElementById('device-type').value = device.type;
        document.getElementById('device-name').value = device.name;
        document.getElementById('device-room').value = device.room || '';
        document.getElementById('device-id').value = device.id;
        document.getElementById('device-id').readOnly = true;
        
        this.onDeviceTypeChange();
        document.getElementById('device-modal').classList.add('active');
    }
    
    onDeviceTypeChange() {
        const type = document.getElementById('device-type').value;
        const container = document.getElementById('initial-state-fields');
        
        if (!type) {
            container.innerHTML = '';
            return;
        }
        
        const deviceType = this.deviceTypes.find(t => t.type === type);
        if (!deviceType) return;
        
        let html = '<h3>Initial State</h3>';
        
        const currentState = this.editingDevice ? this.editingDevice.state : deviceType.default_state;
        
        // Generate form fields based on default state
        Object.entries(deviceType.default_state).forEach(([key, defaultValue]) => {
            const value = currentState[key] !== undefined ? currentState[key] : defaultValue;
            const fieldId = `state-${key}`;
            
            if (typeof defaultValue === 'boolean') {
                html += `
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="${fieldId}" ${value ? 'checked' : ''}>
                            ${key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                        </label>
                    </div>
                `;
            } else if (typeof defaultValue === 'number') {
                html += `
                    <div class="form-group">
                        <label for="${fieldId}">${key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}</label>
                        <input type="number" id="${fieldId}" class="form-control" value="${value}">
                    </div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        <label for="${fieldId}">${key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}</label>
                        <input type="text" id="${fieldId}" class="form-control" value="${value}">
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
    }
    
    async saveDevice(event) {
        event.preventDefault();
        
        const type = document.getElementById('device-type').value;
        const deviceType = this.deviceTypes.find(t => t.type === type);
        
        const deviceData = {
            type: type,
            name: document.getElementById('device-name').value,
            room: document.getElementById('device-room').value || undefined,
            state: {}
        };
        
        if (this.editingDevice) {
            deviceData.id = this.editingDevice.id;
        } else {
            const customId = document.getElementById('device-id').value;
            if (customId) deviceData.id = customId;
        }
        
        // Collect state values
        Object.keys(deviceType.default_state).forEach(key => {
            const fieldId = `state-${key}`;
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'checkbox') {
                    deviceData.state[key] = field.checked;
                } else if (field.type === 'number') {
                    deviceData.state[key] = parseFloat(field.value);
                } else {
                    deviceData.state[key] = field.value;
                }
            }
        });
        
        try {
            const url = this.editingDevice 
                ? `/api/devices/${this.editingDevice.id}` 
                : '/api/devices';
            const method = this.editingDevice ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceData)
            });
            
            if (!response.ok) throw new Error('Failed to save device');
            
            const device = await response.json();
            this.updateDevice(device);
            this.closeModal();
            this.showToast(`Device ${this.editingDevice ? 'updated' : 'created'} successfully`, 'success');
        } catch (error) {
            console.error('Failed to save device:', error);
            this.showToast('Failed to save device', 'error');
        }
    }
    
    async deleteDevice(deviceId) {
        if (!confirm('Are you sure you want to delete this device?')) return;
        
        try {
            const response = await fetch(`/api/devices/${deviceId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete device');
            
            this.removeDevice(deviceId);
            this.showToast('Device deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete device:', error);
            this.showToast('Failed to delete device', 'error');
        }
    }
    
    async toggleDevice(deviceId) {
        try {
            const response = await fetch(`/api/devices/${deviceId}/toggle`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to toggle device');
            
            const state = await response.json();
            const device = this.devices.get(deviceId);
            if (device) {
                device.state = state;
                this.renderDevices();
            }
        } catch (error) {
            console.error('Failed to toggle device:', error);
            this.showToast('Failed to toggle device', 'error');
        }
    }
    
    async toggleLock(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        const newState = device.state.state === 'locked' ? 'unlocked' : 'locked';
        await this.updateDeviceState(deviceId, { state: newState });
    }
    
    async toggleCover(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        const newPosition = device.state.position > 0 ? 0 : 100;
        await this.updateDeviceState(deviceId, { 
            position: newPosition,
            state: newPosition > 0 ? 'open' : 'closed'
        });
    }
    
    async updateDeviceState(deviceId, newState) {
        try {
            const response = await fetch(`/api/devices/${deviceId}/state`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newState)
            });
            
            if (!response.ok) throw new Error('Failed to update device state');
            
            const state = await response.json();
            const device = this.devices.get(deviceId);
            if (device) {
                device.state = state;
                this.renderDevices();
            }
        } catch (error) {
            console.error('Failed to update device state:', error);
            this.showToast('Failed to update device state', 'error');
        }
    }
    
    showDeviceControls(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;
        
        document.getElementById('control-modal-title').textContent = `${device.name} Controls`;
        document.getElementById('control-modal-body').innerHTML = this.renderDeviceControls(device);
        document.getElementById('control-modal').classList.add('active');
        
        // Setup control event handlers
        this.setupControlHandlers(device);
    }
    
    renderDeviceControls(device) {
        let html = '<div class="device-controls">';
        
        switch (device.type) {
            case 'light':
                html += this.renderLightControls(device);
                break;
                
            case 'thermostat':
                html += this.renderThermostatControls(device);
                break;
                
            case 'cover':
                html += this.renderCoverControls(device);
                break;
                
            case 'fan':
                html += this.renderFanControls(device);
                break;
                
            case 'sensor':
                html += this.renderSensorControls(device);
                break;
                
            default:
                html += this.renderGenericControls(device);
        }
        
        html += '</div>';
        return html;
    }
    
    renderLightControls(device) {
        const isOn = device.state.state === 'on';
        const brightness = device.state.brightness || 100;
        
        return `
            <div class="control-group">
                <h4>Power</h4>
                <div class="toggle-control">
                    <button class="power-toggle ${isOn ? 'on' : 'off'}" data-device-id="${device.id}" data-action="toggle">
                        <i class="fas fa-power-off"></i>
                    </button>
                </div>
            </div>
            
            <div class="control-group">
                <h4>Brightness</h4>
                <div class="slider-control">
                    <div class="slider-label">
                        <span>Brightness</span>
                        <span id="brightness-value">${brightness}%</span>
                    </div>
                    <input type="range" id="brightness-slider" min="0" max="100" value="${brightness}" 
                           data-device-id="${device.id}" data-action="brightness">
                </div>
            </div>
            
            ${device.state.color ? this.renderColorControls(device) : ''}
        `;
    }
    
    renderColorControls(device) {
        return `
            <div class="control-group">
                <h4>Color</h4>
                <div class="color-picker">
                    <div class="color-option" style="background-color: #ffffff" data-color="#ffffff"></div>
                    <div class="color-option" style="background-color: #ff0000" data-color="#ff0000"></div>
                    <div class="color-option" style="background-color: #00ff00" data-color="#00ff00"></div>
                    <div class="color-option" style="background-color: #0000ff" data-color="#0000ff"></div>
                    <div class="color-option" style="background-color: #ffff00" data-color="#ffff00"></div>
                    <div class="color-option" style="background-color: #ff00ff" data-color="#ff00ff"></div>
                    <div class="color-option" style="background-color: #00ffff" data-color="#00ffff"></div>
                    <div class="color-option" style="background-color: #ff8800" data-color="#ff8800"></div>
                </div>
            </div>
        `;
    }
    
    renderThermostatControls(device) {
        const current = device.state.current_temperature || 20;
        const target = device.state.target_temperature || 22;
        const mode = device.state.mode || 'heat';
        
        return `
            <div class="control-group">
                <h4>Temperature</h4>
                <div class="slider-control">
                    <div class="slider-label">
                        <span>Current: ${current}°C</span>
                        <span>Target: <span id="target-temp-value">${target}°C</span></span>
                    </div>
                    <input type="range" id="temperature-slider" min="16" max="30" value="${target}" step="0.5"
                           data-device-id="${device.id}" data-action="temperature">
                </div>
            </div>
            
            <div class="control-group">
                <h4>Mode</h4>
                <div class="button-group">
                    <button class="btn ${mode === 'off' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="mode" data-value="off">Off</button>
                    <button class="btn ${mode === 'heat' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="mode" data-value="heat">Heat</button>
                    <button class="btn ${mode === 'cool' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="mode" data-value="cool">Cool</button>
                    <button class="btn ${mode === 'auto' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="mode" data-value="auto">Auto</button>
                </div>
            </div>
        `;
    }
    
    renderCoverControls(device) {
        const position = device.state.position || 0;
        
        return `
            <div class="control-group">
                <h4>Position</h4>
                <div class="slider-control">
                    <div class="slider-label">
                        <span>Position</span>
                        <span id="position-value">${position}%</span>
                    </div>
                    <input type="range" id="position-slider" min="0" max="100" value="${position}"
                           data-device-id="${device.id}" data-action="position">
                </div>
            </div>
            
            <div class="control-group">
                <h4>Quick Controls</h4>
                <div class="button-group">
                    <button class="btn btn-primary" data-device-id="${device.id}" data-action="open">
                        <i class="fas fa-arrow-up"></i> Open
                    </button>
                    <button class="btn btn-primary" data-device-id="${device.id}" data-action="stop">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                    <button class="btn btn-primary" data-device-id="${device.id}" data-action="close">
                        <i class="fas fa-arrow-down"></i> Close
                    </button>
                </div>
            </div>
        `;
    }
    
    renderFanControls(device) {
        const isOn = device.state.state === 'on';
        const speed = device.state.speed || 'medium';
        
        return `
            <div class="control-group">
                <h4>Power</h4>
                <div class="toggle-control">
                    <button class="power-toggle ${isOn ? 'on' : 'off'}" data-device-id="${device.id}" data-action="toggle">
                        <i class="fas fa-fan"></i>
                    </button>
                </div>
            </div>
            
            <div class="control-group">
                <h4>Speed</h4>
                <div class="button-group">
                    <button class="btn ${speed === 'low' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="speed" data-value="low">Low</button>
                    <button class="btn ${speed === 'medium' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="speed" data-value="medium">Medium</button>
                    <button class="btn ${speed === 'high' ? 'btn-primary' : 'btn-secondary'}" 
                            data-device-id="${device.id}" data-action="speed" data-value="high">High</button>
                </div>
            </div>
        `;
    }
    
    renderSensorControls(device) {
        return `
            <div class="control-group">
                <h4>Sensor Values (Simulated)</h4>
                <p>Sensor values update automatically every 10 seconds with random variations.</p>
                ${this.renderDeviceState(device)}
            </div>
        `;
    }
    
    renderGenericControls(device) {
        return `
            <div class="control-group">
                <h4>Device State</h4>
                ${this.renderDeviceState(device)}
            </div>
        `;
    }
    
    setupControlHandlers(device) {
        // Power toggle
        document.querySelectorAll('.power-toggle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.currentTarget.dataset.deviceId;
                await this.toggleDevice(deviceId);
                this.closeControlModal();
            });
        });
        
        // Sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', async (e) => {
                const deviceId = e.target.dataset.deviceId;
                const action = e.target.dataset.action;
                const value = parseFloat(e.target.value);
                
                // Update display
                if (action === 'brightness') {
                    document.getElementById('brightness-value').textContent = `${value}%`;
                } else if (action === 'temperature') {
                    document.getElementById('target-temp-value').textContent = `${value}°C`;
                } else if (action === 'position') {
                    document.getElementById('position-value').textContent = `${value}%`;
                }
                
                // Update device state
                const newState = {};
                if (action === 'brightness') {
                    newState.brightness = value;
                    if (value > 0) newState.state = 'on';
                } else if (action === 'temperature') {
                    newState.target_temperature = value;
                } else if (action === 'position') {
                    newState.position = value;
                    newState.state = value > 0 ? 'open' : 'closed';
                }
                
                await this.updateDeviceState(deviceId, newState);
            });
        });
        
        // Buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn.tagName === 'INPUT') return; // Skip sliders
            
            btn.addEventListener('click', async (e) => {
                const deviceId = e.currentTarget.dataset.deviceId;
                const action = e.currentTarget.dataset.action;
                const value = e.currentTarget.dataset.value;
                
                const newState = {};
                
                switch (action) {
                    case 'mode':
                        newState.mode = value;
                        break;
                        
                    case 'speed':
                        newState.speed = value;
                        break;
                        
                    case 'open':
                        newState.state = 'open';
                        newState.position = 100;
                        break;
                        
                    case 'close':
                        newState.state = 'closed';
                        newState.position = 0;
                        break;
                        
                    case 'stop':
                        newState.state = 'stopped';
                        break;
                }
                
                await this.updateDeviceState(deviceId, newState);
                
                // Update button states for mode/speed
                if (action === 'mode' || action === 'speed') {
                    e.currentTarget.parentElement.querySelectorAll('.btn').forEach(b => {
                        b.classList.remove('btn-primary');
                        b.classList.add('btn-secondary');
                    });
                    e.currentTarget.classList.remove('btn-secondary');
                    e.currentTarget.classList.add('btn-primary');
                }
            });
        });
        
        // Color picker
        document.querySelectorAll('.color-option').forEach(colorBtn => {
            colorBtn.addEventListener('click', async (e) => {
                const color = e.currentTarget.dataset.color;
                // TODO: Implement color change
                this.showToast('Color control not yet implemented', 'info');
            });
        });
    }
    
    updateDevice(device) {
        this.devices.set(device.id, device);
        this.renderDevices();
    }
    
    removeDevice(deviceId) {
        this.devices.delete(deviceId);
        this.renderDevices();
    }
    
    updateStats() {
        const total = this.devices.size;
        const online = Array.from(this.devices.values()).filter(d => d.online).length;
        const active = Array.from(this.devices.values()).filter(d => {
            return d.state && (d.state.state === 'on' || d.state.motion === true || d.state.contact === 'open');
        }).length;
        
        document.getElementById('total-devices').textContent = total;
        document.getElementById('online-devices').textContent = online;
        document.getElementById('active-devices').textContent = active;
    }
    
    setupFilterHandlers() {
        const checkboxes = document.querySelectorAll('.device-type-filters input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const value = e.target.value;
                
                if (value === 'all') {
                    if (e.target.checked) {
                        // Check all
                        this.selectedFilters.clear();
                        this.selectedFilters.add('all');
                        checkboxes.forEach(cb => {
                            if (cb.value !== 'all') cb.checked = false;
                        });
                    } else {
                        // Can't uncheck "all" when it's the only one
                        if (this.selectedFilters.size === 1) {
                            e.target.checked = true;
                        }
                    }
                } else {
                    if (e.target.checked) {
                        this.selectedFilters.delete('all');
                        this.selectedFilters.add(value);
                        document.querySelector('input[value="all"]').checked = false;
                    } else {
                        this.selectedFilters.delete(value);
                        // If no filters selected, select "all"
                        if (this.selectedFilters.size === 0) {
                            this.selectedFilters.add('all');
                            document.querySelector('input[value="all"]').checked = true;
                        }
                    }
                }
                
                this.renderDevices();
            });
        });
    }
    
    filterDevices() {
        this.renderDevices();
    }
    
    searchDevices() {
        this.renderDevices();
    }
    
    async exportDevices() {
        try {
            const response = await fetch('/api/devices/export');
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `device-simulator-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showToast('Devices exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export devices:', error);
            this.showToast('Failed to export devices', 'error');
        }
    }
    
    async importDevices(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const response = await fetch('/api/devices/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('Failed to import devices');
            
            const result = await response.json();
            await this.loadDevices();
            
            this.showToast(`Imported ${result.imported} devices, skipped ${result.skipped}`, 'success');
        } catch (error) {
            console.error('Failed to import devices:', error);
            this.showToast('Failed to import devices', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    closeModal() {
        document.getElementById('device-modal').classList.remove('active');
        this.editingDevice = null;
    }
    
    closeControlModal() {
        document.getElementById('control-modal').classList.remove('active');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the device simulator
const deviceSimulator = new DeviceSimulator();
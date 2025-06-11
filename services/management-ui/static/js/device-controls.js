// Device Controls Component
class DeviceControls {
    constructor() {
        this.device = null;
        this.controlsContainer = null;
    }

    init(device) {
        this.device = device;
        this.render();
    }

    render() {
        const modalBody = document.getElementById('device-modal-body');
        
        modalBody.innerHTML = `
            <div class="device-controls-container">
                <div class="device-info-section">
                    <div class="device-header-info">
                        <div class="device-icon-large">
                            <i class="fas ${UI.getDeviceIcon(this.device.type)}"></i>
                        </div>
                        <div class="device-details">
                            <h3>${this.device.name || this.device.id}</h3>
                            <div class="device-meta">
                                <span class="device-type-badge">${this.device.type}</span>
                                <span class="device-status-badge ${this.device.online ? 'online' : 'offline'}">
                                    ${this.device.online ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <div class="device-attributes">
                                ${this.device.manufacturer ? `<span><i class="fas fa-industry"></i> ${this.device.manufacturer}</span>` : ''}
                                ${this.device.model ? `<span><i class="fas fa-microchip"></i> ${this.device.model}</span>` : ''}
                                <span><i class="fas fa-clock"></i> ${UI.formatTime(this.device.last_seen)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="device-controls-section">
                    <h4>Device Controls</h4>
                    <div id="device-controls" class="device-controls">
                        ${this.renderControls()}
                    </div>
                </div>

                <div class="device-state-section">
                    <h4>Current State</h4>
                    <div class="device-state-grid">
                        ${this.renderStateGrid()}
                    </div>
                </div>

                ${this.device.attributes ? `
                    <div class="device-attributes-section">
                        <h4>Attributes</h4>
                        <div class="attributes-list">
                            ${this.renderAttributes()}
                        </div>
                    </div>
                ` : ''}

                <div class="device-actions-section">
                    <button class="btn btn-secondary" onclick="deviceControls.refreshDevice()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button class="btn btn-secondary" onclick="deviceControls.showRawData()">
                        <i class="fas fa-code"></i> Raw Data
                    </button>
                    ${this.device.config?.configurable ? `
                        <button class="btn btn-secondary" onclick="deviceControls.showConfig()">
                            <i class="fas fa-cog"></i> Configure
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Initialize interactive controls
        this.initializeControls();
    }

    renderControls() {
        if (!this.device.online) {
            return '<p class="offline-message">Device is offline</p>';
        }

        switch (this.device.type) {
            case 'light':
                return this.renderLightControls();
            case 'switch':
                return this.renderSwitchControls();
            case 'climate':
                return this.renderClimateControls();
            case 'cover':
                return this.renderCoverControls();
            case 'fan':
                return this.renderFanControls();
            case 'lock':
                return this.renderLockControls();
            case 'media_player':
                return this.renderMediaControls();
            default:
                return this.renderGenericControls();
        }
    }

    renderLightControls() {
        const state = this.device.state || {};
        const isOn = state.state === 'on';
        
        let html = `
            <div class="control-row">
                <label>Power</label>
                <div class="power-toggle ${isOn ? 'on' : 'off'}" onclick="deviceControls.togglePower()">
                    <i class="fas fa-power-off"></i>
                </div>
            </div>
        `;

        if (isOn) {
            // Brightness control
            if (this.hasFeature('brightness')) {
                html += `
                    <div class="control-row">
                        <label>Brightness</label>
                        <div class="slider-control">
                            <i class="fas fa-sun dim"></i>
                            <input type="range" min="0" max="100" 
                                   value="${state.brightness || 100}" 
                                   oninput="deviceControls.setBrightness(this.value)"
                                   id="brightness-slider">
                            <i class="fas fa-sun bright"></i>
                            <span class="slider-value">${state.brightness || 100}%</span>
                        </div>
                    </div>
                `;
            }

            // Color control
            if (this.hasFeature('color')) {
                html += `
                    <div class="control-row">
                        <label>Color</label>
                        <div class="color-picker-control">
                            <input type="color" 
                                   value="${state.color || '#ffffff'}" 
                                   onchange="deviceControls.setColor(this.value)"
                                   id="color-picker">
                            <div class="color-presets">
                                ${this.renderColorPresets()}
                            </div>
                        </div>
                    </div>
                `;
            }

            // Color temperature control
            if (this.hasFeature('color_temp')) {
                html += `
                    <div class="control-row">
                        <label>Temperature</label>
                        <div class="slider-control">
                            <i class="fas fa-thermometer-empty cold"></i>
                            <input type="range" min="2700" max="6500" 
                                   value="${state.color_temp || 4000}" 
                                   oninput="deviceControls.setColorTemp(this.value)"
                                   id="temp-slider">
                            <i class="fas fa-thermometer-full warm"></i>
                            <span class="slider-value">${state.color_temp || 4000}K</span>
                        </div>
                    </div>
                `;
            }

            // Effects
            if (this.device.effects && this.device.effects.length > 0) {
                html += `
                    <div class="control-row">
                        <label>Effects</label>
                        <select class="form-control" onchange="deviceControls.setEffect(this.value)">
                            <option value="">No Effect</option>
                            ${this.device.effects.map(effect => 
                                `<option value="${effect}" ${state.effect === effect ? 'selected' : ''}>${effect}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }
        }

        return html;
    }

    renderSwitchControls() {
        const state = this.device.state || {};
        const isOn = state.state === 'on';
        
        return `
            <div class="control-row">
                <label>Power</label>
                <div class="power-toggle ${isOn ? 'on' : 'off'}" onclick="deviceControls.togglePower()">
                    <i class="fas fa-power-off"></i>
                </div>
            </div>
            ${state.power ? `
                <div class="control-row">
                    <label>Power Usage</label>
                    <div class="metric-display">
                        <span class="metric-value">${state.power}</span>
                        <span class="metric-unit">W</span>
                    </div>
                </div>
            ` : ''}
            ${state.energy ? `
                <div class="control-row">
                    <label>Energy Today</label>
                    <div class="metric-display">
                        <span class="metric-value">${state.energy.toFixed(2)}</span>
                        <span class="metric-unit">kWh</span>
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderClimateControls() {
        const state = this.device.state || {};
        const modes = ['off', 'auto', 'heat', 'cool', 'fan_only'];
        const fanModes = ['auto', 'low', 'medium', 'high'];
        
        return `
            <div class="control-row">
                <label>Mode</label>
                <div class="mode-selector">
                    ${modes.map(mode => `
                        <button class="mode-btn ${state.mode === mode ? 'active' : ''}" 
                                onclick="deviceControls.setClimateMode('${mode}')"
                                title="${mode}">
                            <i class="fas ${this.getClimateModeIcon(mode)}"></i>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            ${state.mode !== 'off' ? `
                <div class="control-row">
                    <label>Target Temperature</label>
                    <div class="temperature-control">
                        <button class="temp-btn" onclick="deviceControls.adjustTemperature(-0.5)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <div class="temp-display">
                            <span class="temp-value">${state.temperature || 22}</span>
                            <span class="temp-unit">°C</span>
                        </div>
                        <button class="temp-btn" onclick="deviceControls.adjustTemperature(0.5)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <div class="control-row">
                    <label>Fan Speed</label>
                    <select class="form-control" onchange="deviceControls.setFanMode(this.value)">
                        ${fanModes.map(mode => 
                            `<option value="${mode}" ${state.fan_mode === mode ? 'selected' : ''}>${mode}</option>`
                        ).join('')}
                    </select>
                </div>
            ` : ''}
            
            ${state.current_temperature ? `
                <div class="control-row">
                    <label>Current Temperature</label>
                    <div class="metric-display">
                        <span class="metric-value">${state.current_temperature.toFixed(1)}</span>
                        <span class="metric-unit">°C</span>
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderCoverControls() {
        const state = this.device.state || {};
        const position = state.position || 0;
        
        return `
            <div class="control-row">
                <label>Position</label>
                <div class="position-controls">
                    <button class="position-btn" onclick="deviceControls.setCoverPosition(0)">
                        <i class="fas fa-window-minimize"></i> Close
                    </button>
                    <button class="position-btn" onclick="deviceControls.stopCover()">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                    <button class="position-btn" onclick="deviceControls.setCoverPosition(100)">
                        <i class="fas fa-window-maximize"></i> Open
                    </button>
                </div>
            </div>
            
            <div class="control-row">
                <label>Position Control</label>
                <div class="slider-control">
                    <i class="fas fa-window-minimize"></i>
                    <input type="range" min="0" max="100" 
                           value="${position}" 
                           oninput="deviceControls.setCoverPosition(this.value)"
                           id="position-slider">
                    <i class="fas fa-window-maximize"></i>
                    <span class="slider-value">${position}%</span>
                </div>
            </div>
            
            ${state.tilt !== undefined ? `
                <div class="control-row">
                    <label>Tilt Control</label>
                    <div class="slider-control">
                        <i class="fas fa-grip-lines"></i>
                        <input type="range" min="0" max="100" 
                               value="${state.tilt}" 
                               oninput="deviceControls.setCoverTilt(this.value)"
                               id="tilt-slider">
                        <i class="fas fa-grip-lines-vertical"></i>
                        <span class="slider-value">${state.tilt}%</span>
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderFanControls() {
        const state = this.device.state || {};
        const isOn = state.state === 'on';
        const speeds = ['low', 'medium', 'high'];
        
        return `
            <div class="control-row">
                <label>Power</label>
                <div class="power-toggle ${isOn ? 'on' : 'off'}" onclick="deviceControls.togglePower()">
                    <i class="fas fa-power-off"></i>
                </div>
            </div>
            
            ${isOn ? `
                <div class="control-row">
                    <label>Speed</label>
                    <div class="speed-selector">
                        ${speeds.map(speed => `
                            <button class="speed-btn ${state.speed === speed ? 'active' : ''}" 
                                    onclick="deviceControls.setFanSpeed('${speed}')">
                                ${speed}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                ${this.hasFeature('oscillate') ? `
                    <div class="control-row">
                        <label>Oscillate</label>
                        <div class="toggle-switch ${state.oscillating ? 'active' : ''}" 
                             onclick="deviceControls.toggleOscillate()">
                        </div>
                    </div>
                ` : ''}
                
                ${this.hasFeature('direction') ? `
                    <div class="control-row">
                        <label>Direction</label>
                        <div class="direction-selector">
                            <button class="direction-btn ${state.direction === 'forward' ? 'active' : ''}" 
                                    onclick="deviceControls.setFanDirection('forward')">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <button class="direction-btn ${state.direction === 'reverse' ? 'active' : ''}" 
                                    onclick="deviceControls.setFanDirection('reverse')">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}
            ` : ''}
        `;
    }

    renderLockControls() {
        const state = this.device.state || {};
        const isLocked = state.state === 'locked';
        
        return `
            <div class="control-row">
                <label>Lock State</label>
                <div class="lock-control ${isLocked ? 'locked' : 'unlocked'}" 
                     onclick="deviceControls.toggleLock()">
                    <i class="fas ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
                    <span>${isLocked ? 'Locked' : 'Unlocked'}</span>
                </div>
            </div>
            
            ${state.battery ? `
                <div class="control-row">
                    <label>Battery</label>
                    <div class="battery-display ${state.battery < 20 ? 'low' : ''}">
                        <i class="fas fa-battery-${this.getBatteryIcon(state.battery)}"></i>
                        <span>${state.battery}%</span>
                    </div>
                </div>
            ` : ''}
            
            ${state.jammed ? `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Lock is jammed!
                </div>
            ` : ''}
        `;
    }

    renderMediaControls() {
        const state = this.device.state || {};
        const isPlaying = state.state === 'playing';
        
        return `
            <div class="control-row">
                <label>Playback</label>
                <div class="media-controls">
                    <button class="media-btn" onclick="deviceControls.mediaPrevious()">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="media-btn main" onclick="deviceControls.mediaPlayPause()">
                        <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="media-btn" onclick="deviceControls.mediaNext()">
                        <i class="fas fa-step-forward"></i>
                    </button>
                </div>
            </div>
            
            <div class="control-row">
                <label>Volume</label>
                <div class="slider-control">
                    <i class="fas fa-volume-down"></i>
                    <input type="range" min="0" max="100" 
                           value="${state.volume_level ? state.volume_level * 100 : 50}" 
                           oninput="deviceControls.setVolume(this.value)"
                           id="volume-slider">
                    <i class="fas fa-volume-up"></i>
                    <span class="slider-value">${state.volume_level ? Math.round(state.volume_level * 100) : 50}%</span>
                </div>
            </div>
            
            ${state.media_title ? `
                <div class="control-row">
                    <label>Now Playing</label>
                    <div class="media-info">
                        <div class="media-title">${state.media_title}</div>
                        ${state.media_artist ? `<div class="media-artist">${state.media_artist}</div>` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderGenericControls() {
        return `
            <div class="generic-controls">
                <p>This device type doesn't have specific controls.</p>
                <p>You can view its state and send custom commands.</p>
                <button class="btn btn-primary" onclick="deviceControls.showCommandDialog()">
                    <i class="fas fa-terminal"></i> Send Command
                </button>
            </div>
        `;
    }

    renderStateGrid() {
        const state = this.device.state || {};
        const items = [];

        // Add common state items
        if (state.state !== undefined) {
            items.push({ icon: 'fa-power-off', label: 'State', value: state.state });
        }
        if (state.brightness !== undefined) {
            items.push({ icon: 'fa-sun', label: 'Brightness', value: `${state.brightness}%` });
        }
        if (state.temperature !== undefined) {
            items.push({ icon: 'fa-thermometer-half', label: 'Temperature', value: `${state.temperature}°C` });
        }
        if (state.humidity !== undefined) {
            items.push({ icon: 'fa-tint', label: 'Humidity', value: `${state.humidity}%` });
        }
        if (state.battery !== undefined) {
            items.push({ icon: 'fa-battery-half', label: 'Battery', value: `${state.battery}%` });
        }
        if (state.power !== undefined) {
            items.push({ icon: 'fa-bolt', label: 'Power', value: `${state.power}W` });
        }

        return items.map(item => `
            <div class="state-item">
                <i class="fas ${item.icon}"></i>
                <div class="state-details">
                    <span class="state-label">${item.label}</span>
                    <span class="state-value">${item.value}</span>
                </div>
            </div>
        `).join('');
    }

    renderAttributes() {
        const attributes = this.device.attributes || {};
        return Object.entries(attributes).map(([key, value]) => `
            <div class="attribute-item">
                <span class="attribute-key">${key}:</span>
                <span class="attribute-value">${typeof value === 'object' ? JSON.stringify(value) : value}</span>
            </div>
        `).join('');
    }

    renderColorPresets() {
        const presets = [
            { color: '#ff0000', name: 'Red' },
            { color: '#00ff00', name: 'Green' },
            { color: '#0000ff', name: 'Blue' },
            { color: '#ffff00', name: 'Yellow' },
            { color: '#ff00ff', name: 'Magenta' },
            { color: '#00ffff', name: 'Cyan' },
            { color: '#ff8800', name: 'Orange' },
            { color: '#ff0088', name: 'Pink' }
        ];

        return presets.map(preset => `
            <button class="color-preset" 
                    style="background-color: ${preset.color}"
                    onclick="deviceControls.setColor('${preset.color}')"
                    title="${preset.name}">
            </button>
        `).join('');
    }

    initializeControls() {
        // Update slider values on input
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.slider-value');
                if (valueSpan) {
                    const value = e.target.value;
                    const unit = e.target.id.includes('temp') ? 'K' : '%';
                    valueSpan.textContent = value + unit;
                }
            });
        });
    }

    // Control actions
    async togglePower() {
        const currentState = this.device.state?.state || 'off';
        const newState = currentState === 'on' ? 'off' : 'on';
        await this.sendCommand('set_state', { state: newState });
    }

    async setBrightness(value) {
        await this.sendCommand('set_brightness', { brightness: parseInt(value) });
    }

    async setColor(color) {
        await this.sendCommand('set_color', { color: color });
    }

    async setColorTemp(value) {
        await this.sendCommand('set_color_temp', { color_temp: parseInt(value) });
    }

    async setEffect(effect) {
        await this.sendCommand('set_effect', { effect: effect });
    }

    async setClimateMode(mode) {
        await this.sendCommand('set_climate_mode', { mode: mode });
    }

    async adjustTemperature(delta) {
        const current = this.device.state?.temperature || 22;
        const newTemp = Math.max(16, Math.min(30, current + delta));
        await this.sendCommand('set_temperature', { temperature: newTemp });
    }

    async setFanMode(mode) {
        await this.sendCommand('set_fan_mode', { fan_mode: mode });
    }

    async setCoverPosition(position) {
        await this.sendCommand('set_position', { position: parseInt(position) });
    }

    async stopCover() {
        await this.sendCommand('stop');
    }

    async setCoverTilt(tilt) {
        await this.sendCommand('set_tilt', { tilt: parseInt(tilt) });
    }

    async setFanSpeed(speed) {
        await this.sendCommand('set_speed', { speed: speed });
    }

    async toggleOscillate() {
        const current = this.device.state?.oscillating || false;
        await this.sendCommand('set_oscillation', { oscillating: !current });
    }

    async setFanDirection(direction) {
        await this.sendCommand('set_direction', { direction: direction });
    }

    async toggleLock() {
        const currentState = this.device.state?.state || 'unlocked';
        const command = currentState === 'locked' ? 'unlock' : 'lock';
        await this.sendCommand(command);
    }

    async mediaPlayPause() {
        const isPlaying = this.device.state?.state === 'playing';
        await this.sendCommand(isPlaying ? 'media_pause' : 'media_play');
    }

    async mediaPrevious() {
        await this.sendCommand('media_previous');
    }

    async mediaNext() {
        await this.sendCommand('media_next');
    }

    async setVolume(value) {
        await this.sendCommand('set_volume', { volume_level: value / 100 });
    }

    async sendCommand(command, data = {}) {
        try {
            await API.sendDeviceCommand(this.device.id, command, data);
            UI.showToast('Command sent', 'success');
            
            // Refresh device state after a short delay
            setTimeout(() => this.refreshDevice(), 500);
        } catch (error) {
            UI.showToast('Failed to send command', 'error');
        }
    }

    async refreshDevice() {
        try {
            const updatedDevice = await API.getDevice(this.device.id);
            this.device = updatedDevice;
            
            // Update device in app state
            if (window.app && window.app.devices) {
                window.app.devices.set(this.device.id, updatedDevice);
            }
            
            // Re-render controls
            this.render();
            UI.showToast('Device refreshed', 'success');
        } catch (error) {
            UI.showToast('Failed to refresh device', 'error');
        }
    }

    showRawData() {
        const modal = document.createElement('div');
        modal.className = 'dialog-overlay';
        modal.innerHTML = `
            <div class="dialog">
                <div class="dialog-content">
                    <h3>Device Raw Data</h3>
                    <pre class="raw-data">${JSON.stringify(this.device, null, 2)}</pre>
                    <div class="dialog-actions">
                        <button class="btn btn-primary" onclick="this.closest('.dialog-overlay').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showCommandDialog() {
        const modal = document.createElement('div');
        modal.className = 'dialog-overlay';
        modal.innerHTML = `
            <div class="dialog">
                <div class="dialog-content">
                    <h3>Send Custom Command</h3>
                    <div class="form-group">
                        <label>Command</label>
                        <input type="text" class="form-control" id="custom-command" placeholder="e.g., turn_on">
                    </div>
                    <div class="form-group">
                        <label>Data (JSON)</label>
                        <textarea class="form-control" id="custom-data" placeholder='{"key": "value"}'>{}</textarea>
                    </div>
                    <div class="dialog-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.dialog-overlay').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="deviceControls.sendCustomCommand()">Send</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async sendCustomCommand() {
        const command = document.getElementById('custom-command').value;
        const dataStr = document.getElementById('custom-data').value;
        
        if (!command) {
            UI.showToast('Please enter a command', 'error');
            return;
        }
        
        try {
            const data = JSON.parse(dataStr);
            await this.sendCommand(command, data);
            document.querySelector('.dialog-overlay').remove();
        } catch (error) {
            UI.showToast('Invalid JSON data', 'error');
        }
    }

    showConfig() {
        // TODO: Implement device configuration dialog
        UI.showToast('Device configuration coming soon', 'info');
    }

    // Helper methods
    getClimateModeIcon(mode) {
        const icons = {
            'off': 'fa-power-off',
            'auto': 'fa-sync-alt',
            'heat': 'fa-fire',
            'cool': 'fa-snowflake',
            'fan_only': 'fa-fan'
        };
        return icons[mode] || 'fa-question';
    }

    getBatteryIcon(level) {
        if (level > 75) return 'full';
        if (level > 50) return 'three-quarters';
        if (level > 25) return 'half';
        if (level > 10) return 'quarter';
        return 'empty';
    }

    hasFeature(feature) {
        // Check if device has a specific feature
        if (this.device.features && Array.isArray(this.device.features)) {
            return this.device.features.includes(feature);
        }
        
        // Fallback: infer features from device type and state
        switch (this.device.type) {
            case 'light':
                if (feature === 'brightness') return true; // Most lights have brightness
                if (feature === 'color' && this.device.state?.color !== undefined) return true;
                if (feature === 'color_temp' && this.device.state?.color_temp !== undefined) return true;
                break;
            case 'fan':
                if (feature === 'oscillate' && this.device.state?.oscillating !== undefined) return true;
                if (feature === 'direction' && this.device.state?.direction !== undefined) return true;
                break;
        }
        
        return false;
    }
}

// Export globally
window.deviceControls = new DeviceControls();
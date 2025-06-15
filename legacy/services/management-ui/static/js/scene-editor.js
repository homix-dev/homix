// Scene Editor Component
class SceneEditor {
    constructor() {
        this.devices = new Map();
        this.currentScene = null;
        this.deviceStates = new Map();
    }

    init(scene = null) {
        this.currentScene = scene || {
            id: null,
            name: '',
            description: '',
            icon: 'fa-home',
            devices: []
        };

        // Initialize device states from scene
        this.deviceStates.clear();
        if (scene) {
            if (scene.devices) {
                // Frontend format
                scene.devices.forEach(device => {
                    this.deviceStates.set(device.device_id, device.state);
                });
            } else if (scene.entities) {
                // Backend format - convert to frontend format
                this.currentScene.devices = [];
                scene.entities.forEach(entity => {
                    this.deviceStates.set(entity.device_id, entity.state);
                    this.currentScene.devices.push({
                        device_id: entity.device_id,
                        state: entity.state
                    });
                });
            }
        }

        this.render();
    }

    render() {
        const container = document.getElementById('scene-modal-body');
        
        container.innerHTML = `
            <div class="scene-editor">
                <div class="scene-header">
                    <div class="form-group">
                        <label>Scene Name</label>
                        <input type="text" class="form-control" id="scene-name" 
                               value="${this.currentScene.name}" 
                               placeholder="e.g., Movie Night">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" id="scene-description" 
                                  placeholder="Optional description">${this.currentScene.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Icon</label>
                        <div class="icon-selector">
                            ${this.renderIconOptions()}
                        </div>
                    </div>
                </div>

                <div class="scene-devices">
                    <h3>Device States <span class="help-text">Configure how devices should be set when this scene is activated</span></h3>
                    
                    <div class="device-filters">
                        <input type="text" class="search-input" id="scene-device-search" 
                               placeholder="Search devices..." 
                               oninput="sceneEditor.filterDevices()">
                        <select class="filter-select" id="scene-device-type" 
                                onchange="sceneEditor.filterDevices()">
                            <option value="">All Types</option>
                            <option value="light">Lights</option>
                            <option value="switch">Switches</option>
                            <option value="climate">Climate</option>
                            <option value="cover">Covers</option>
                        </select>
                    </div>

                    <div id="scene-devices-list" class="scene-devices-list">
                        ${this.renderDevicesList()}
                    </div>
                </div>

                <div class="scene-preview">
                    <h4>Preview</h4>
                    <div class="preview-content" id="scene-preview">
                        <!-- Preview will be generated after render -->
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('scene-name').addEventListener('input', () => this.updatePreview());
        document.getElementById('scene-description').addEventListener('input', () => this.updatePreview());
        
        // Initialize icon selection
        this.initIconSelector();
        
        // Generate initial preview now that DOM is ready
        this.updatePreview();
    }

    renderIconOptions() {
        const icons = [
            { value: 'fa-home', label: 'Home', icon: 'fas fa-home' },
            { value: 'fa-moon', label: 'Night', icon: 'fas fa-moon' },
            { value: 'fa-sun', label: 'Day', icon: 'fas fa-sun' },
            { value: 'fa-film', label: 'Movie', icon: 'fas fa-film' },
            { value: 'fa-book', label: 'Reading', icon: 'fas fa-book' },
            { value: 'fa-utensils', label: 'Dining', icon: 'fas fa-utensils' },
            { value: 'fa-bed', label: 'Sleep', icon: 'fas fa-bed' },
            { value: 'fa-briefcase', label: 'Work', icon: 'fas fa-briefcase' },
            { value: 'fa-gamepad', label: 'Gaming', icon: 'fas fa-gamepad' },
            { value: 'fa-music', label: 'Music', icon: 'fas fa-music' },
            { value: 'fa-users', label: 'Party', icon: 'fas fa-users' },
            { value: 'fa-door-open', label: 'Away', icon: 'fas fa-door-open' }
        ];

        return icons.map(icon => `
            <label class="icon-option ${icon.value === this.currentScene.icon ? 'selected' : ''}">
                <input type="radio" name="scene-icon" value="${icon.value}" 
                       ${icon.value === this.currentScene.icon ? 'checked' : ''}>
                <i class="${icon.icon}"></i>
                <span>${icon.label}</span>
            </label>
        `).join('');
    }

    initIconSelector() {
        document.querySelectorAll('input[name="scene-icon"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.currentScene.icon = e.target.value;
                document.querySelectorAll('.icon-option').forEach(option => {
                    option.classList.toggle('selected', option.querySelector('input').checked);
                });
                this.updatePreview();
            });
        });
    }

    renderDevicesList() {
        const devices = Array.from(window.app.devices.values());
        
        if (devices.length === 0) {
            return '<p class="empty-state">No devices available</p>';
        }

        return devices.map(device => {
            const isIncluded = this.deviceStates.has(device.id);
            const deviceState = this.deviceStates.get(device.id) || {};
            
            return `
                <div class="scene-device-item ${isIncluded ? 'included' : ''}" data-device-id="${device.id}">
                    <div class="device-header">
                        <label class="device-toggle">
                            <input type="checkbox" 
                                   onchange="sceneEditor.toggleDevice('${device.id}')" 
                                   ${isIncluded ? 'checked' : ''}>
                            <div class="device-info">
                                <div class="device-name">${device.name || device.id}</div>
                                <div class="device-type">${device.type}</div>
                            </div>
                        </label>
                    </div>
                    ${isIncluded ? this.renderDeviceControls(device, deviceState) : ''}
                </div>
            `;
        }).join('');
    }

    renderDeviceControls(device, state) {
        let html = '<div class="device-controls">';

        switch (device.type) {
            case 'light':
                html += `
                    <div class="control-group">
                        <label>State</label>
                        <select class="form-control" onchange="sceneEditor.updateDeviceState('${device.id}', 'state', this.value)">
                            <option value="on" ${state.state === 'on' ? 'selected' : ''}>On</option>
                            <option value="off" ${state.state === 'off' ? 'selected' : ''}>Off</option>
                        </select>
                    </div>
                    ${state.state === 'on' ? `
                        <div class="control-group">
                            <label>Brightness</label>
                            <div class="brightness-control">
                                <input type="range" min="0" max="100" 
                                       value="${state.brightness || 100}" 
                                       onchange="sceneEditor.updateDeviceState('${device.id}', 'brightness', this.value)"
                                       oninput="this.nextElementSibling.textContent = this.value + '%'">
                                <span>${state.brightness || 100}%</span>
                            </div>
                        </div>
                        ${device.features?.includes('color') ? `
                            <div class="control-group">
                                <label>Color</label>
                                <input type="color" class="form-control" 
                                       value="${state.color || '#ffffff'}"
                                       onchange="sceneEditor.updateDeviceState('${device.id}', 'color', this.value)">
                            </div>
                        ` : ''}
                        ${device.features?.includes('temperature') ? `
                            <div class="control-group">
                                <label>Color Temperature</label>
                                <select class="form-control" 
                                        onchange="sceneEditor.updateDeviceState('${device.id}', 'temperature', this.value)">
                                    <option value="warm" ${state.temperature === 'warm' ? 'selected' : ''}>Warm White</option>
                                    <option value="neutral" ${state.temperature === 'neutral' ? 'selected' : ''}>Neutral</option>
                                    <option value="cool" ${state.temperature === 'cool' ? 'selected' : ''}>Cool White</option>
                                </select>
                            </div>
                        ` : ''}
                    ` : ''}
                `;
                break;

            case 'switch':
                html += `
                    <div class="control-group">
                        <label>State</label>
                        <select class="form-control" onchange="sceneEditor.updateDeviceState('${device.id}', 'state', this.value)">
                            <option value="on" ${state.state === 'on' ? 'selected' : ''}>On</option>
                            <option value="off" ${state.state === 'off' ? 'selected' : ''}>Off</option>
                        </select>
                    </div>
                `;
                break;

            case 'climate':
                html += `
                    <div class="control-group">
                        <label>Mode</label>
                        <select class="form-control" onchange="sceneEditor.updateDeviceState('${device.id}', 'mode', this.value)">
                            <option value="off" ${state.mode === 'off' ? 'selected' : ''}>Off</option>
                            <option value="auto" ${state.mode === 'auto' ? 'selected' : ''}>Auto</option>
                            <option value="heat" ${state.mode === 'heat' ? 'selected' : ''}>Heat</option>
                            <option value="cool" ${state.mode === 'cool' ? 'selected' : ''}>Cool</option>
                        </select>
                    </div>
                    ${state.mode !== 'off' ? `
                        <div class="control-group">
                            <label>Temperature (°C)</label>
                            <input type="number" class="form-control" 
                                   min="16" max="30" step="0.5"
                                   value="${state.temperature || 22}"
                                   onchange="sceneEditor.updateDeviceState('${device.id}', 'temperature', this.value)">
                        </div>
                    ` : ''}
                `;
                break;

            case 'cover':
                html += `
                    <div class="control-group">
                        <label>Position</label>
                        <div class="position-control">
                            <input type="range" min="0" max="100" 
                                   value="${state.position || 0}" 
                                   onchange="sceneEditor.updateDeviceState('${device.id}', 'position', this.value)"
                                   oninput="this.nextElementSibling.textContent = this.value + '%'">
                            <span>${state.position || 0}%</span>
                        </div>
                    </div>
                `;
                break;

            default:
                html += `
                    <div class="control-group">
                        <label>Custom State (JSON)</label>
                        <textarea class="form-control" 
                                  placeholder='{"key": "value"}'
                                  onchange="sceneEditor.updateDeviceCustomState('${device.id}', this.value)">${JSON.stringify(state, null, 2)}</textarea>
                    </div>
                `;
        }

        html += '</div>';
        return html;
    }

    toggleDevice(deviceId) {
        const device = window.app.devices.get(deviceId);
        if (!device) return;

        if (this.deviceStates.has(deviceId)) {
            this.deviceStates.delete(deviceId);
        } else {
            // Add device with default state
            const defaultState = this.getDefaultState(device);
            this.deviceStates.set(deviceId, defaultState);
        }

        this.render();
    }

    getDefaultState(device) {
        switch (device.type) {
            case 'light':
                return { state: 'on', brightness: 100 };
            case 'switch':
                return { state: 'on' };
            case 'climate':
                return { mode: 'auto', temperature: 22 };
            case 'cover':
                return { position: 50 };
            default:
                return {};
        }
    }

    updateDeviceState(deviceId, key, value) {
        const state = this.deviceStates.get(deviceId) || {};
        
        // Convert numeric values
        if (key === 'brightness' || key === 'temperature' || key === 'position') {
            value = parseFloat(value);
        }
        
        state[key] = value;
        this.deviceStates.set(deviceId, state);
        
        // Re-render device controls if state changed
        if (key === 'state' || key === 'mode') {
            const deviceElement = document.querySelector(`[data-device-id="${deviceId}"]`);
            if (deviceElement) {
                const device = window.app.devices.get(deviceId);
                const controlsContainer = deviceElement.querySelector('.device-controls');
                if (controlsContainer && device) {
                    controlsContainer.outerHTML = this.renderDeviceControls(device, state);
                }
            }
        }
        
        this.updatePreview();
    }

    updateDeviceCustomState(deviceId, jsonString) {
        try {
            const state = JSON.parse(jsonString);
            this.deviceStates.set(deviceId, state);
            this.updatePreview();
        } catch (e) {
            UI.showToast('Invalid JSON format', 'error');
        }
    }

    filterDevices() {
        const search = document.getElementById('scene-device-search').value.toLowerCase();
        const type = document.getElementById('scene-device-type').value;
        
        const deviceItems = document.querySelectorAll('.scene-device-item');
        deviceItems.forEach(item => {
            const deviceId = item.dataset.deviceId;
            const device = window.app.devices.get(deviceId);
            
            if (!device) {
                item.style.display = 'none';
                return;
            }
            
            let show = true;
            
            // Type filter
            if (type && device.type !== type) {
                show = false;
            }
            
            // Search filter
            if (search && show) {
                const matchesSearch = 
                    device.id.toLowerCase().includes(search) ||
                    (device.name && device.name.toLowerCase().includes(search));
                if (!matchesSearch) {
                    show = false;
                }
            }
            
            item.style.display = show ? 'block' : 'none';
        });
    }

    generatePreview() {
        // Use current scene data if DOM elements don't exist yet
        const nameElement = document.getElementById('scene-name');
        const name = nameElement ? nameElement.value : (this.currentScene.name || 'Unnamed Scene');
        const icon = this.currentScene.icon || 'fa-home';
        
        if (this.deviceStates.size === 0) {
            return '<p class="preview-empty">Add devices to see preview</p>';
        }

        let preview = `
            <div class="scene-preview-header">
                <i class="fas ${icon}"></i>
                <h4>${name}</h4>
            </div>
            <div class="scene-preview-devices">
        `;

        this.deviceStates.forEach((state, deviceId) => {
            const device = window.app.devices.get(deviceId);
            if (!device) return;
            
            preview += `
                <div class="preview-device">
                    <span class="device-name">${device.name || device.id}</span>
                    <span class="device-state">${this.getStateDescription(device, state)}</span>
                </div>
            `;
        });

        preview += '</div>';
        
        return preview;
    }

    getStateDescription(device, state) {
        switch (device.type) {
            case 'light':
                if (state.state === 'off') return 'Off';
                let desc = `On`;
                if (state.brightness !== undefined && state.brightness !== 100) {
                    desc += ` (${state.brightness}%)`;
                }
                if (state.color) {
                    desc += ` ${state.color}`;
                }
                return desc;
                
            case 'switch':
                return state.state === 'on' ? 'On' : 'Off';
                
            case 'climate':
                if (state.mode === 'off') return 'Off';
                return `${state.mode} (${state.temperature}°C)`;
                
            case 'cover':
                return `${state.position}% open`;
                
            default:
                return JSON.stringify(state);
        }
    }

    updatePreview() {
        const preview = document.getElementById('scene-preview');
        if (preview) {
            preview.innerHTML = this.generatePreview();
        }
    }

    getSceneData() {
        const devices = [];
        this.deviceStates.forEach((state, deviceId) => {
            devices.push({
                device_id: deviceId,
                state: state
            });
        });

        return {
            name: document.getElementById('scene-name').value,
            description: document.getElementById('scene-description').value,
            icon: this.currentScene.icon,
            devices: devices
        };
    }
}

// Export globally
window.sceneEditor = new SceneEditor();
// UI Helper Functions
const UI = {
    // Toast notifications
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.remove();
        }, duration);
    },

    // Modal management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Format helpers
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleString();
        }
    },

    formatDeviceState(state) {
        // Format device state for display
        const formatted = {};
        for (const [key, value] of Object.entries(state)) {
            if (key === 'temperature' && typeof value === 'number') {
                formatted[key] = `${value.toFixed(1)}°C`;
            } else if (key === 'humidity' && typeof value === 'number') {
                formatted[key] = `${value.toFixed(1)}%`;
            } else if (key === 'battery' && typeof value === 'number') {
                formatted[key] = `${value}%`;
            } else if (typeof value === 'boolean') {
                formatted[key] = value ? 'On' : 'Off';
            } else {
                formatted[key] = value;
            }
        }
        return formatted;
    },

    // Device icon helper
    getDeviceIcon(deviceType) {
        const icons = {
            sensor: 'fa-thermometer-half',
            binary_sensor: 'fa-door-open',
            switch: 'fa-toggle-on',
            light: 'fa-lightbulb',
            climate: 'fa-temperature-high',
            lock: 'fa-lock',
            cover: 'fa-window-maximize',
            fan: 'fa-fan',
            camera: 'fa-camera',
            media_player: 'fa-tv'
        };
        return icons[deviceType] || 'fa-plug';
    },

    // Create device card element
    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.dataset.deviceId = device.id;
        
        const statusClass = device.online ? 'online' : 'offline';
        const icon = this.getDeviceIcon(device.type);
        
        // Extract key metrics from state
        const metrics = [];
        if (device.state) {
            if (device.state.temperature !== undefined) {
                metrics.push({ label: 'Temperature', value: `${device.state.temperature.toFixed(1)}°C` });
            }
            if (device.state.humidity !== undefined) {
                metrics.push({ label: 'Humidity', value: `${device.state.humidity.toFixed(1)}%` });
            }
            if (device.state.battery !== undefined) {
                metrics.push({ label: 'Battery', value: `${device.state.battery}%` });
            }
            if (device.state.state !== undefined) {
                metrics.push({ label: 'State', value: device.state.state });
            }
        }
        
        card.innerHTML = `
            <div class="device-card-status ${statusClass}"></div>
            <div class="device-card-header">
                <div>
                    <div class="device-card-title">${device.name || device.id}</div>
                    <div class="device-card-type">${device.type}</div>
                </div>
                <i class="fas ${icon}"></i>
            </div>
            <div class="device-card-info">
                ${metrics.map(m => `
                    <div class="device-metric">
                        <span class="metric-label">${m.label}</span>
                        <span class="metric-value">${m.value}</span>
                    </div>
                `).join('')}
                <div class="device-metric">
                    <span class="metric-label">Last Seen</span>
                    <span class="metric-value">${this.formatTime(device.last_seen)}</span>
                </div>
            </div>
            <div class="device-card-actions">
                ${device.type === 'switch' || device.type === 'light' ? `
                    <button class="device-action-btn" onclick="app.toggleDevice('${device.id}')">
                        Toggle
                    </button>
                ` : ''}
                <button class="device-action-btn" onclick="app.showDeviceDetails('${device.id}')">
                    Details
                </button>
            </div>
        `;
        
        return card;
    },

    // Create automation card element
    createAutomationCard(automation) {
        const card = document.createElement('div');
        card.className = 'automation-card';
        card.dataset.automationId = automation.id;
        
        const toggleClass = automation.enabled ? 'active' : '';
        
        card.innerHTML = `
            <div class="automation-info">
                <h3>${automation.name}</h3>
                <div class="automation-description">${automation.description || 'No description'}</div>
                <div class="automation-meta">
                    <span><i class="fas fa-play-circle"></i> ${automation.run_count || 0} runs</span>
                    ${automation.last_run ? `
                        <span><i class="fas fa-clock"></i> Last run: ${this.formatTime(automation.last_run)}</span>
                    ` : ''}
                </div>
            </div>
            <div class="automation-controls">
                <div class="toggle-switch ${toggleClass}" onclick="app.toggleAutomation('${automation.id}', ${!automation.enabled})">
                </div>
                <button class="icon-button" onclick="app.editAutomation('${automation.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-button" onclick="app.testAutomation('${automation.id}')">
                    <i class="fas fa-play"></i>
                </button>
                <button class="icon-button" onclick="app.deleteAutomation('${automation.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    },

    // Create scene card element
    createSceneCard(scene) {
        const card = document.createElement('div');
        card.className = 'scene-card';
        card.dataset.sceneId = scene.id;
        
        const icon = scene.icon || 'fa-palette';
        // Handle both devices (frontend) and entities (backend) formats
        const deviceCount = scene.devices ? scene.devices.length : (scene.entities ? scene.entities.length : 0);
        
        card.innerHTML = `
            <div class="scene-card-content" onclick="app.activateScene('${scene.id}')">
                <div class="scene-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="scene-name">${scene.name}</div>
                <div class="scene-devices">${deviceCount} device${deviceCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="scene-card-actions">
                <button class="icon-button" onclick="event.stopPropagation(); app.editScene('${scene.id}')" title="Edit Scene">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-button" onclick="event.stopPropagation(); app.deleteScene('${scene.id}')" title="Delete Scene">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    },

    // Create event row element
    createEventRow(event) {
        const row = document.createElement('tr');
        const time = new Date(event.timestamp).toLocaleTimeString();
        
        row.innerHTML = `
            <td>${time}</td>
            <td>${event.type}</td>
            <td>${event.source}</td>
            <td>${JSON.stringify(event.data)}</td>
        `;
        
        return row;
    },

    // Update stats display
    updateStats(stats) {
        const elements = {
            'stat-total-devices': stats.totalDevices || 0,
            'stat-online-devices': stats.onlineDevices || 0,
            'stat-automations': stats.totalAutomations || 0,
            'stat-active-automations': stats.activeAutomations || 0,
            'stat-scenes': stats.totalScenes || 0,
            'stat-events': stats.todayEvents || 0
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    },

    // Loading state
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="loading">Loading...</div>';
        }
    },

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.querySelector('.loading')) {
            element.innerHTML = '';
        }
    }
};

// Make UI globally available
window.UI = UI;
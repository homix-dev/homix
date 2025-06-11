// Automation Builder Component
class AutomationBuilder {
    constructor() {
        this.triggers = [];
        this.conditions = [];
        this.actions = [];
        this.currentAutomation = null;
        this.availableDevices = new Map();
    }

    init(automation = null) {
        this.currentAutomation = automation || {
            id: null,
            name: '',
            description: '',
            enabled: true,
            triggers: [],
            conditions: [],
            actions: []
        };

        if (automation) {
            this.triggers = [...automation.triggers];
            this.conditions = [...automation.conditions];
            this.actions = [...automation.actions];
        } else {
            this.triggers = [];
            this.conditions = [];
            this.actions = [];
        }

        this.render();
    }

    render() {
        const container = document.getElementById('automation-modal-body');
        
        container.innerHTML = `
            <div class="automation-builder">
                <div class="automation-header">
                    <div class="form-group">
                        <label>Automation Name</label>
                        <input type="text" class="form-control" id="automation-name" 
                               value="${this.currentAutomation.name}" 
                               placeholder="e.g., Turn on lights at sunset">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" id="automation-description" 
                                  placeholder="Optional description">${this.currentAutomation.description || ''}</textarea>
                    </div>
                </div>

                <div class="automation-section">
                    <h3>Triggers <span class="help-text">When should this automation run?</span></h3>
                    <div id="triggers-list" class="automation-items">
                        ${this.renderTriggers()}
                    </div>
                    <button class="btn btn-secondary" onclick="automationBuilder.addTrigger()">
                        <i class="fas fa-plus"></i> Add Trigger
                    </button>
                </div>

                <div class="automation-section">
                    <h3>Conditions <span class="help-text">Optional: Only run if these conditions are met</span></h3>
                    <div id="conditions-list" class="automation-items">
                        ${this.renderConditions()}
                    </div>
                    <button class="btn btn-secondary" onclick="automationBuilder.addCondition()">
                        <i class="fas fa-plus"></i> Add Condition
                    </button>
                </div>

                <div class="automation-section">
                    <h3>Actions <span class="help-text">What should happen?</span></h3>
                    <div id="actions-list" class="automation-items">
                        ${this.renderActions()}
                    </div>
                    <button class="btn btn-secondary" onclick="automationBuilder.addAction()">
                        <i class="fas fa-plus"></i> Add Action
                    </button>
                </div>

                <div class="automation-preview">
                    <h4>Preview</h4>
                    <div class="preview-content" id="automation-preview">
                        ${this.generatePreview()}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('automation-name').addEventListener('input', () => this.updatePreview());
        document.getElementById('automation-description').addEventListener('input', () => this.updatePreview());
    }

    renderTriggers() {
        if (this.triggers.length === 0) {
            return '<p class="empty-state">No triggers added yet</p>';
        }

        return this.triggers.map((trigger, index) => `
            <div class="automation-item" data-index="${index}">
                <div class="item-header">
                    <span class="item-type">${this.getTriggerTypeLabel(trigger.type)}</span>
                    <button class="btn-icon" onclick="automationBuilder.removeTrigger(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="item-details">
                    ${this.renderTriggerDetails(trigger)}
                </div>
            </div>
        `).join('');
    }

    renderConditions() {
        if (this.conditions.length === 0) {
            return '<p class="empty-state">No conditions added (automation will always run)</p>';
        }

        return this.conditions.map((condition, index) => `
            <div class="automation-item" data-index="${index}">
                <div class="item-header">
                    <span class="item-type">${this.getConditionTypeLabel(condition.type)}</span>
                    <button class="btn-icon" onclick="automationBuilder.removeCondition(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="item-details">
                    ${this.renderConditionDetails(condition)}
                </div>
            </div>
        `).join('');
    }

    renderActions() {
        if (this.actions.length === 0) {
            return '<p class="empty-state">No actions added yet</p>';
        }

        return this.actions.map((action, index) => `
            <div class="automation-item" data-index="${index}">
                <div class="item-header">
                    <span class="item-type">${this.getActionTypeLabel(action.type)}</span>
                    <button class="btn-icon" onclick="automationBuilder.removeAction(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="item-details">
                    ${this.renderActionDetails(action)}
                </div>
            </div>
        `).join('');
    }

    addTrigger() {
        const dialog = this.createTriggerDialog();
        this.showDialog(dialog);
    }

    addCondition() {
        const dialog = this.createConditionDialog();
        this.showDialog(dialog);
    }

    addAction() {
        const dialog = this.createActionDialog();
        this.showDialog(dialog);
    }

    createTriggerDialog() {
        return `
            <div class="dialog-content">
                <h3>Add Trigger</h3>
                <div class="form-group">
                    <label>Trigger Type</label>
                    <select class="form-control" id="trigger-type" onchange="automationBuilder.onTriggerTypeChange()">
                        <option value="">Select trigger type...</option>
                        <option value="device_state">Device State Change</option>
                        <option value="time">Time</option>
                        <option value="sunrise">Sunrise</option>
                        <option value="sunset">Sunset</option>
                        <option value="interval">Interval</option>
                        <option value="event">System Event</option>
                    </select>
                </div>
                <div id="trigger-config"></div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="automationBuilder.closeDialog()">Cancel</button>
                    <button class="btn btn-primary" onclick="automationBuilder.saveTrigger()">Add Trigger</button>
                </div>
            </div>
        `;
    }

    createConditionDialog() {
        return `
            <div class="dialog-content">
                <h3>Add Condition</h3>
                <div class="form-group">
                    <label>Condition Type</label>
                    <select class="form-control" id="condition-type" onchange="automationBuilder.onConditionTypeChange()">
                        <option value="">Select condition type...</option>
                        <option value="device_state">Device State</option>
                        <option value="time_range">Time Range</option>
                        <option value="day_of_week">Day of Week</option>
                        <option value="sun_position">Sun Position</option>
                    </select>
                </div>
                <div id="condition-config"></div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="automationBuilder.closeDialog()">Cancel</button>
                    <button class="btn btn-primary" onclick="automationBuilder.saveCondition()">Add Condition</button>
                </div>
            </div>
        `;
    }

    createActionDialog() {
        return `
            <div class="dialog-content">
                <h3>Add Action</h3>
                <div class="form-group">
                    <label>Action Type</label>
                    <select class="form-control" id="action-type" onchange="automationBuilder.onActionTypeChange()">
                        <option value="">Select action type...</option>
                        <option value="device_control">Control Device</option>
                        <option value="scene_activate">Activate Scene</option>
                        <option value="notification">Send Notification</option>
                        <option value="delay">Wait</option>
                        <option value="event">Trigger Event</option>
                    </select>
                </div>
                <div id="action-config"></div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="automationBuilder.closeDialog()">Cancel</button>
                    <button class="btn btn-primary" onclick="automationBuilder.saveAction()">Add Action</button>
                </div>
            </div>
        `;
    }

    onTriggerTypeChange() {
        const type = document.getElementById('trigger-type').value;
        const configDiv = document.getElementById('trigger-config');

        switch (type) {
            case 'device_state':
                configDiv.innerHTML = this.getDeviceStateConfig('trigger');
                break;
            case 'time':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Time</label>
                        <input type="time" class="form-control" id="trigger-time">
                    </div>
                `;
                break;
            case 'sunrise':
            case 'sunset':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Offset (minutes)</label>
                        <input type="number" class="form-control" id="trigger-offset" 
                               placeholder="e.g., -30 for 30 minutes before">
                    </div>
                `;
                break;
            case 'interval':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Every</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="trigger-interval-value" min="1">
                            <select class="form-control" id="trigger-interval-unit">
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                    </div>
                `;
                break;
            case 'event':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Event Type</label>
                        <input type="text" class="form-control" id="trigger-event-type" 
                               placeholder="e.g., alarm_triggered">
                    </div>
                `;
                break;
            default:
                configDiv.innerHTML = '';
        }
    }

    onConditionTypeChange() {
        const type = document.getElementById('condition-type').value;
        const configDiv = document.getElementById('condition-config');

        switch (type) {
            case 'device_state':
                configDiv.innerHTML = this.getDeviceStateConfig('condition');
                break;
            case 'time_range':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Between</label>
                        <div class="time-range">
                            <input type="time" class="form-control" id="condition-time-start">
                            <span>and</span>
                            <input type="time" class="form-control" id="condition-time-end">
                        </div>
                    </div>
                `;
                break;
            case 'day_of_week':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Days</label>
                        <div class="checkbox-group">
                            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                                <label>
                                    <input type="checkbox" name="day" value="${day.toLowerCase()}">
                                    ${day}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
                break;
            case 'sun_position':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Sun is</label>
                        <select class="form-control" id="condition-sun-position">
                            <option value="above_horizon">Above Horizon (Day)</option>
                            <option value="below_horizon">Below Horizon (Night)</option>
                        </select>
                    </div>
                `;
                break;
            default:
                configDiv.innerHTML = '';
        }
    }

    onActionTypeChange() {
        const type = document.getElementById('action-type').value;
        const configDiv = document.getElementById('action-config');

        switch (type) {
            case 'device_control':
                configDiv.innerHTML = this.getDeviceControlConfig();
                break;
            case 'scene_activate':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Scene</label>
                        <select class="form-control" id="action-scene">
                            <option value="">Select scene...</option>
                            ${Array.from(window.app.scenes.values()).map(scene => 
                                `<option value="${scene.id}">${scene.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
                break;
            case 'notification':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Message</label>
                        <textarea class="form-control" id="action-notification-message" 
                                  placeholder="Notification message"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select class="form-control" id="action-notification-priority">
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                `;
                break;
            case 'delay':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Wait for</label>
                        <div class="input-group">
                            <input type="number" class="form-control" id="action-delay-value" min="1">
                            <select class="form-control" id="action-delay-unit">
                                <option value="seconds">Seconds</option>
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                            </select>
                        </div>
                    </div>
                `;
                break;
            case 'event':
                configDiv.innerHTML = `
                    <div class="form-group">
                        <label>Event Type</label>
                        <input type="text" class="form-control" id="action-event-type" 
                               placeholder="e.g., custom_event">
                    </div>
                    <div class="form-group">
                        <label>Event Data (JSON)</label>
                        <textarea class="form-control" id="action-event-data" 
                                  placeholder='{"key": "value"}'></textarea>
                    </div>
                `;
                break;
            default:
                configDiv.innerHTML = '';
        }
    }

    getDeviceStateConfig(prefix) {
        const devices = Array.from(window.app.devices.values());
        return `
            <div class="form-group">
                <label>Device</label>
                <select class="form-control" id="${prefix}-device">
                    <option value="">Select device...</option>
                    ${devices.map(device => 
                        `<option value="${device.id}">${device.name || device.id} (${device.type})</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Attribute</label>
                <select class="form-control" id="${prefix}-attribute">
                    <option value="state">State</option>
                    <option value="brightness">Brightness</option>
                    <option value="temperature">Temperature</option>
                    <option value="humidity">Humidity</option>
                    <option value="battery">Battery</option>
                    <option value="custom">Custom</option>
                </select>
            </div>
            <div class="form-group" id="${prefix}-custom-attribute" style="display: none;">
                <label>Custom Attribute</label>
                <input type="text" class="form-control" id="${prefix}-custom-attr-name">
            </div>
            <div class="form-group">
                <label>Condition</label>
                <div class="input-group">
                    <select class="form-control" id="${prefix}-operator">
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                        <option value="contains">Contains</option>
                    </select>
                    <input type="text" class="form-control" id="${prefix}-value" placeholder="Value">
                </div>
            </div>
        `;
    }

    getDeviceControlConfig() {
        const devices = Array.from(window.app.devices.values());
        return `
            <div class="form-group">
                <label>Device</label>
                <select class="form-control" id="action-device" onchange="automationBuilder.onActionDeviceChange()">
                    <option value="">Select device...</option>
                    ${devices.map(device => 
                        `<option value="${device.id}" data-type="${device.type}">${device.name || device.id} (${device.type})</option>`
                    ).join('')}
                </select>
            </div>
            <div id="device-control-options"></div>
        `;
    }

    onActionDeviceChange() {
        const select = document.getElementById('action-device');
        const deviceId = select.value;
        const deviceType = select.selectedOptions[0]?.dataset.type;
        const optionsDiv = document.getElementById('device-control-options');

        if (!deviceId) {
            optionsDiv.innerHTML = '';
            return;
        }

        let html = '<div class="form-group"><label>Action</label>';

        switch (deviceType) {
            case 'light':
                html += `
                    <select class="form-control" id="device-action" onchange="automationBuilder.onDeviceActionChange()">
                        <option value="turn_on">Turn On</option>
                        <option value="turn_off">Turn Off</option>
                        <option value="toggle">Toggle</option>
                        <option value="set_brightness">Set Brightness</option>
                        <option value="set_color">Set Color</option>
                    </select></div>
                    <div id="device-action-params"></div>
                `;
                break;
            case 'switch':
                html += `
                    <select class="form-control" id="device-action">
                        <option value="turn_on">Turn On</option>
                        <option value="turn_off">Turn Off</option>
                        <option value="toggle">Toggle</option>
                    </select></div>
                `;
                break;
            case 'climate':
                html += `
                    <select class="form-control" id="device-action" onchange="automationBuilder.onDeviceActionChange()">
                        <option value="set_temperature">Set Temperature</option>
                        <option value="set_mode">Set Mode</option>
                        <option value="turn_on">Turn On</option>
                        <option value="turn_off">Turn Off</option>
                    </select></div>
                    <div id="device-action-params"></div>
                `;
                break;
            default:
                html += `
                    <select class="form-control" id="device-action">
                        <option value="custom">Custom Command</option>
                    </select></div>
                    <div class="form-group">
                        <label>Command Data (JSON)</label>
                        <textarea class="form-control" id="device-command-data" placeholder='{"command": "value"}'></textarea>
                    </div>
                `;
        }

        optionsDiv.innerHTML = html;
    }

    onDeviceActionChange() {
        const action = document.getElementById('device-action').value;
        const paramsDiv = document.getElementById('device-action-params');

        switch (action) {
            case 'set_brightness':
                paramsDiv.innerHTML = `
                    <div class="form-group">
                        <label>Brightness (%)</label>
                        <input type="range" class="form-control" id="brightness-value" 
                               min="0" max="100" value="50" oninput="this.nextElementSibling.textContent = this.value + '%'">
                        <span>50%</span>
                    </div>
                `;
                break;
            case 'set_color':
                paramsDiv.innerHTML = `
                    <div class="form-group">
                        <label>Color</label>
                        <input type="color" class="form-control" id="color-value">
                    </div>
                `;
                break;
            case 'set_temperature':
                paramsDiv.innerHTML = `
                    <div class="form-group">
                        <label>Temperature (°C)</label>
                        <input type="number" class="form-control" id="temperature-value" 
                               min="16" max="30" step="0.5">
                    </div>
                `;
                break;
            case 'set_mode':
                paramsDiv.innerHTML = `
                    <div class="form-group">
                        <label>Mode</label>
                        <select class="form-control" id="climate-mode">
                            <option value="auto">Auto</option>
                            <option value="heat">Heat</option>
                            <option value="cool">Cool</option>
                            <option value="off">Off</option>
                        </select>
                    </div>
                `;
                break;
            default:
                paramsDiv.innerHTML = '';
        }
    }

    saveTrigger() {
        const type = document.getElementById('trigger-type').value;
        if (!type) {
            UI.showToast('Please select a trigger type', 'error');
            return;
        }

        const trigger = { type };

        switch (type) {
            case 'device_state':
                trigger.device_id = document.getElementById('trigger-device').value;
                trigger.attribute = document.getElementById('trigger-attribute').value;
                trigger.operator = document.getElementById('trigger-operator').value;
                trigger.value = document.getElementById('trigger-value').value;
                
                if (trigger.attribute === 'custom') {
                    trigger.attribute = document.getElementById('trigger-custom-attr-name').value;
                }
                break;
            case 'time':
                trigger.time = document.getElementById('trigger-time').value;
                break;
            case 'sunrise':
            case 'sunset':
                trigger.offset = parseInt(document.getElementById('trigger-offset').value) || 0;
                break;
            case 'interval':
                trigger.interval = {
                    value: parseInt(document.getElementById('trigger-interval-value').value),
                    unit: document.getElementById('trigger-interval-unit').value
                };
                break;
            case 'event':
                trigger.event_type = document.getElementById('trigger-event-type').value;
                break;
        }

        this.triggers.push(trigger);
        this.closeDialog();
        this.render();
    }

    saveCondition() {
        const type = document.getElementById('condition-type').value;
        if (!type) {
            UI.showToast('Please select a condition type', 'error');
            return;
        }

        const condition = { type };

        switch (type) {
            case 'device_state':
                condition.device_id = document.getElementById('condition-device').value;
                condition.attribute = document.getElementById('condition-attribute').value;
                condition.operator = document.getElementById('condition-operator').value;
                condition.value = document.getElementById('condition-value').value;
                
                if (condition.attribute === 'custom') {
                    condition.attribute = document.getElementById('condition-custom-attr-name').value;
                }
                break;
            case 'time_range':
                condition.start_time = document.getElementById('condition-time-start').value;
                condition.end_time = document.getElementById('condition-time-end').value;
                break;
            case 'day_of_week':
                condition.days = Array.from(document.querySelectorAll('input[name="day"]:checked'))
                    .map(cb => cb.value);
                break;
            case 'sun_position':
                condition.position = document.getElementById('condition-sun-position').value;
                break;
        }

        this.conditions.push(condition);
        this.closeDialog();
        this.render();
    }

    saveAction() {
        const type = document.getElementById('action-type').value;
        if (!type) {
            UI.showToast('Please select an action type', 'error');
            return;
        }

        const action = { type };

        switch (type) {
            case 'device_control':
                action.device_id = document.getElementById('action-device').value;
                action.command = document.getElementById('device-action').value;
                
                // Get additional parameters based on command
                switch (action.command) {
                    case 'set_brightness':
                        action.data = { brightness: parseInt(document.getElementById('brightness-value').value) };
                        break;
                    case 'set_color':
                        action.data = { color: document.getElementById('color-value').value };
                        break;
                    case 'set_temperature':
                        action.data = { temperature: parseFloat(document.getElementById('temperature-value').value) };
                        break;
                    case 'set_mode':
                        action.data = { mode: document.getElementById('climate-mode').value };
                        break;
                    case 'custom':
                        try {
                            action.data = JSON.parse(document.getElementById('device-command-data').value);
                        } catch (e) {
                            UI.showToast('Invalid JSON in command data', 'error');
                            return;
                        }
                        break;
                }
                break;
            case 'scene_activate':
                action.scene_id = document.getElementById('action-scene').value;
                break;
            case 'notification':
                action.message = document.getElementById('action-notification-message').value;
                action.priority = document.getElementById('action-notification-priority').value;
                break;
            case 'delay':
                action.delay = {
                    value: parseInt(document.getElementById('action-delay-value').value),
                    unit: document.getElementById('action-delay-unit').value
                };
                break;
            case 'event':
                action.event_type = document.getElementById('action-event-type').value;
                try {
                    action.data = JSON.parse(document.getElementById('action-event-data').value || '{}');
                } catch (e) {
                    UI.showToast('Invalid JSON in event data', 'error');
                    return;
                }
                break;
        }

        this.actions.push(action);
        this.closeDialog();
        this.render();
    }

    removeTrigger(index) {
        this.triggers.splice(index, 1);
        this.render();
    }

    removeCondition(index) {
        this.conditions.splice(index, 1);
        this.render();
    }

    removeAction(index) {
        this.actions.splice(index, 1);
        this.render();
    }

    showDialog(content) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.id = 'automation-dialog';
        overlay.innerHTML = `<div class="dialog">${content}</div>`;
        document.body.appendChild(overlay);
    }

    closeDialog() {
        const dialog = document.getElementById('automation-dialog');
        if (dialog) {
            dialog.remove();
        }
    }

    generatePreview() {
        // Get name from current automation or from input if it exists
        let name = 'Unnamed Automation';
        if (this.currentAutomation && this.currentAutomation.name) {
            name = this.currentAutomation.name;
        }
        const nameInput = document.getElementById('automation-name');
        if (nameInput && nameInput.value) {
            name = nameInput.value;
        }
        
        if (this.triggers.length === 0 || this.actions.length === 0) {
            return '<p class="preview-empty">Add triggers and actions to see preview</p>';
        }

        let preview = '<div class="preview-flow">';
        
        // Triggers
        preview += '<div class="preview-section"><strong>WHEN</strong> ';
        preview += this.triggers.map(t => this.getTriggerDescription(t)).join(' <em>OR</em> ');
        preview += '</div>';
        
        // Conditions
        if (this.conditions.length > 0) {
            preview += '<div class="preview-section"><strong>AND IF</strong> ';
            preview += this.conditions.map(c => this.getConditionDescription(c)).join(' <em>AND</em> ');
            preview += '</div>';
        }
        
        // Actions
        preview += '<div class="preview-section"><strong>THEN</strong> ';
        preview += this.actions.map(a => this.getActionDescription(a)).join(', <em>then</em> ');
        preview += '</div>';
        
        preview += '</div>';
        
        return preview;
    }

    getTriggerDescription(trigger) {
        switch (trigger.type) {
            case 'device_state':
                const device = window.app.devices.get(trigger.device_id);
                const deviceName = device?.name || trigger.device_id;
                const operator = trigger.operator ? trigger.operator.replace('_', ' ') : 'is';
                return `${deviceName} ${trigger.attribute} ${operator} ${trigger.value}`;
            case 'time':
                return `time is ${trigger.time}`;
            case 'sunrise':
                return trigger.offset ? `${Math.abs(trigger.offset)} minutes ${trigger.offset < 0 ? 'before' : 'after'} sunrise` : 'sunrise';
            case 'sunset':
                return trigger.offset ? `${Math.abs(trigger.offset)} minutes ${trigger.offset < 0 ? 'before' : 'after'} sunset` : 'sunset';
            case 'interval':
                return `every ${trigger.interval.value} ${trigger.interval.unit}`;
            case 'event':
                return `${trigger.event_type} event occurs`;
            default:
                return trigger.type;
        }
    }

    getConditionDescription(condition) {
        switch (condition.type) {
            case 'device_state':
                const device = window.app.devices.get(condition.device_id);
                return `${device?.name || condition.device_id} ${condition.attribute} is ${condition.value}`;
            case 'time_range':
                return `time is between ${condition.start_time} and ${condition.end_time}`;
            case 'day_of_week':
                return `day is ${condition.days.join(', ')}`;
            case 'sun_position':
                return condition.position === 'above_horizon' ? 'sun is up' : 'sun is down';
            default:
                return condition.type;
        }
    }

    getActionDescription(action) {
        switch (action.type) {
            case 'device_control':
            case 'device_command':  // Support both naming conventions
                const device = window.app.devices.get(action.device_id);
                const deviceName = device?.name || action.device_id;
                switch (action.command) {
                    case 'turn_on':
                        return `turn on ${deviceName}`;
                    case 'turn_off':
                        return `turn off ${deviceName}`;
                    case 'toggle':
                        return `toggle ${deviceName}`;
                    case 'set_brightness':
                        return `set ${deviceName} brightness to ${action.data.brightness}%`;
                    case 'set_color':
                        return `set ${deviceName} color to ${action.data.color}`;
                    case 'set_temperature':
                        return `set ${deviceName} to ${action.data.temperature}°C`;
                    default:
                        return `control ${deviceName}`;
                }
            case 'scene_activate':
                const scene = window.app.scenes.get(action.scene_id);
                return `activate "${scene?.name || action.scene_id}" scene`;
            case 'notification':
                return `send notification: "${action.message}"`;
            case 'delay':
                return `wait ${action.delay.value} ${action.delay.unit}`;
            case 'event':
                return `trigger ${action.event_type} event`;
            default:
                return action.type;
        }
    }

    updatePreview() {
        const preview = document.getElementById('automation-preview');
        if (preview) {
            preview.innerHTML = this.generatePreview();
        }
    }

    getTriggerTypeLabel(type) {
        const labels = {
            'device_state': 'Device State',
            'time': 'Specific Time',
            'sunrise': 'Sunrise',
            'sunset': 'Sunset',
            'interval': 'Interval',
            'event': 'System Event'
        };
        return labels[type] || type;
    }

    getConditionTypeLabel(type) {
        const labels = {
            'device_state': 'Device State',
            'time_range': 'Time Range',
            'day_of_week': 'Day of Week',
            'sun_position': 'Sun Position'
        };
        return labels[type] || type;
    }

    getActionTypeLabel(type) {
        const labels = {
            'device_control': 'Control Device',
            'scene_activate': 'Activate Scene',
            'notification': 'Send Notification',
            'delay': 'Delay',
            'event': 'Trigger Event'
        };
        return labels[type] || type;
    }

    renderTriggerDetails(trigger) {
        switch (trigger.type) {
            case 'device_state':
                const device = window.app.devices.get(trigger.device_id);
                return `${device?.name || trigger.device_id} - ${trigger.attribute} ${trigger.operator} ${trigger.value}`;
            case 'time':
                return `At ${trigger.time}`;
            case 'sunrise':
            case 'sunset':
                return trigger.offset ? `${trigger.offset} minutes offset` : 'No offset';
            case 'interval':
                return `Every ${trigger.interval.value} ${trigger.interval.unit}`;
            case 'event':
                return `Event: ${trigger.event_type}`;
            default:
                return '';
        }
    }

    renderConditionDetails(condition) {
        switch (condition.type) {
            case 'device_state':
                const device = window.app.devices.get(condition.device_id);
                return `${device?.name || condition.device_id} - ${condition.attribute} ${condition.operator} ${condition.value}`;
            case 'time_range':
                return `Between ${condition.start_time} and ${condition.end_time}`;
            case 'day_of_week':
                return `Days: ${condition.days.join(', ')}`;
            case 'sun_position':
                return condition.position === 'above_horizon' ? 'Daytime' : 'Nighttime';
            default:
                return '';
        }
    }

    renderActionDetails(action) {
        return this.getActionDescription(action);
    }

    getAutomationData() {
        return {
            name: document.getElementById('automation-name').value,
            description: document.getElementById('automation-description').value,
            enabled: true,
            triggers: this.triggers,
            conditions: this.conditions,
            actions: this.actions
        };
    }
}

// Export globally
window.automationBuilder = new AutomationBuilder();
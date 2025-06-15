// Simple Flow Designer for NATS Home Automation (without Rete.js)
class SimpleFlowDesigner {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.selectedNode = null;
        this.selectedConnection = null;
        this.draggedNode = null;
        this.connectingFrom = null;
        this.canvas = null;
        this.ctx = null;
        this.currentAutomation = null;
        this.nextNodeId = 1;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.draggedPaletteNode = null;
        this.componentCategories = this.initializeComponents();
    }

    init(containerId, automation = null) {
        this.currentAutomation = automation || {
            id: null,
            name: '',
            description: '',
            enabled: true,
            flow: { nodes: [], connections: [] }
        };

        const container = document.getElementById(containerId);
        // Ensure container has height
        if (!container.style.height && container.offsetHeight === 0) {
            container.style.height = '100%';
        }
        container.innerHTML = `
            <div class="simple-flow-designer" style="height: 100%; display: flex; flex-direction: column;">
                <div class="automation-header" style="padding: 15px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div style="flex: 1;">
                            <input type="text" id="automation-name" placeholder="Automation Name" 
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 16px; font-weight: 500;"
                                   value="${this.currentAutomation.name || ''}">
                        </div>
                        <div style="flex: 2;">
                            <input type="text" id="automation-description" placeholder="Description (optional)" 
                                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                                   value="${this.currentAutomation.description || ''}">
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-size: 14px; color: #495057;">
                                <input type="checkbox" id="automation-enabled" ${this.currentAutomation.enabled ? 'checked' : ''}>
                                Enabled
                            </label>
                        </div>
                    </div>
                </div>
                <div class="designer-main" style="flex: 1; display: flex; position: relative; overflow: hidden;">
                    <div class="component-sidebar" style="width: 250px; background: white; border-right: 1px solid #dee2e6; overflow-y: auto; padding: 10px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Components</h3>
                        ${this.renderComponentPalette()}
                    </div>
                    <div class="canvas-container" style="flex: 1; position: relative; display: flex; flex-direction: column;">
                        <div class="designer-toolbar" style="background: white; border-bottom: 1px solid #dee2e6; padding: 10px;">
                            <div class="toolbar-group" style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button class="btn btn-sm" data-action="zoomIn">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                                <button class="btn btn-sm" data-action="zoomOut">
                                    <i class="fas fa-search-minus"></i>
                                </button>
                                <button class="btn btn-sm" data-action="resetView">
                                    <i class="fas fa-compress"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" data-action="clearAll">
                                    <i class="fas fa-trash"></i> Clear
                                </button>
                            </div>
                        </div>
                        <canvas id="flow-canvas" class="flow-canvas" style="flex: 1; display: block;"></canvas>
                    </div>
                </div>
                <div id="node-editor" class="node-editor" style="display: none;">
                    <h4>Edit Node</h4>
                    <div id="node-editor-content"></div>
                    <button class="btn btn-sm btn-primary" data-action="saveNodeEdit">Save</button>
                    <button class="btn btn-sm" data-action="closeNodeEditor">Cancel</button>
                </div>
            </div>
        `;

        // Setup canvas
        this.canvas = document.getElementById('flow-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Debug logging
        console.log('SimpleFlowDesigner init complete');
        console.log('Container:', container);
        console.log('Canvas:', this.canvas);
        console.log('Toolbar:', container.querySelector('.designer-toolbar'));
        
        this.resizeCanvas();

        // Setup event listeners
        this.setupEventListeners();

        // Load existing flow if provided
        if (automation && automation.flow) {
            this.loadFlow(automation.flow);
        }

        // Start render loop
        this.render();
    }

    initializeComponents() {
        return {
            triggers: {
                name: 'Triggers',
                icon: 'fa-bolt',
                color: '#3498db',
                components: [
                    { type: 'deviceStateTrigger', label: 'Device State Changed', icon: 'fa-plug', description: 'Triggers when device state changes' },
                    { type: 'natsEventTrigger', label: 'NATS Event', icon: 'fa-stream', description: 'Listen for NATS events on a subject' },
                    { type: 'timeTrigger', label: 'Time', icon: 'fa-clock', description: 'Triggers at specific time' },
                    { type: 'scheduleTrigger', label: 'Schedule', icon: 'fa-calendar', description: 'Triggers on schedule (cron)' },
                    { type: 'sunriseTrigger', label: 'Sunrise', icon: 'fa-sun', description: 'Triggers at sunrise' },
                    { type: 'sunsetTrigger', label: 'Sunset', icon: 'fa-moon', description: 'Triggers at sunset' },
                    { type: 'intervalTrigger', label: 'Interval', icon: 'fa-redo', description: 'Triggers at regular intervals' },
                    { type: 'stateChangeTrigger', label: 'State Changed', icon: 'fa-database', description: 'Triggers when KV state changes' }
                ]
            },
            conditions: {
                name: 'Conditions',
                icon: 'fa-code-branch',
                color: '#f39c12',
                components: [
                    { type: 'deviceStateCondition', label: 'Device State Is', icon: 'fa-plug', description: 'Check device state' },
                    { type: 'timeCondition', label: 'Time Between', icon: 'fa-clock', description: 'Check if time is in range' },
                    { type: 'dayOfWeekCondition', label: 'Day of Week', icon: 'fa-calendar-day', description: 'Check day of week' },
                    { type: 'numericCondition', label: 'Numeric Compare', icon: 'fa-greater-than-equal', description: 'Compare numeric values' },
                    { type: 'sunCondition', label: 'Sun Position', icon: 'fa-sun', description: 'Check if sun is up/down' },
                    { type: 'presenceCondition', label: 'Presence', icon: 'fa-user-check', description: 'Check if someone is home' },
                    { type: 'zoneCondition', label: 'Zone', icon: 'fa-map-marker-alt', description: 'Check if in zone' }
                ]
            },
            actions: {
                name: 'Actions',
                icon: 'fa-play',
                color: '#27ae60',
                components: [
                    { type: 'deviceAction', label: 'Control Device', icon: 'fa-play', description: 'Control a device' },
                    { type: 'publishEventAction', label: 'Publish NATS Event', icon: 'fa-paper-plane', description: 'Publish event to NATS subject' },
                    { type: 'updateStateAction', label: 'Update State', icon: 'fa-database', description: 'Update KV state store' },
                    { type: 'sceneAction', label: 'Activate Scene', icon: 'fa-palette', description: 'Activate a scene' },
                    { type: 'notificationAction', label: 'Send Notification', icon: 'fa-bell', description: 'Send a notification' },
                    { type: 'delayAction', label: 'Delay', icon: 'fa-hourglass-half', description: 'Wait for specified time' },
                    { type: 'scriptAction', label: 'Run Script', icon: 'fa-code', description: 'Execute a script' }
                ]
            },
            logic: {
                name: 'Logic',
                icon: 'fa-microchip',
                color: '#9b59b6',
                components: [
                    { type: 'andGate', label: 'AND Gate', icon: 'fa-align-center', description: 'All inputs must be true' },
                    { type: 'orGate', label: 'OR Gate', icon: 'fa-align-justify', description: 'Any input must be true' },
                    { type: 'notGate', label: 'NOT Gate', icon: 'fa-exclamation', description: 'Inverts the input' },
                    { type: 'switchNode', label: 'Switch', icon: 'fa-random', description: 'Route based on value' },
                    { type: 'counterNode', label: 'Counter', icon: 'fa-sort-numeric-up', description: 'Count events' },
                    { type: 'timerNode', label: 'Timer', icon: 'fa-stopwatch', description: 'Time-based logic' }
                ]
            },
            state: {
                name: 'State Management',
                icon: 'fa-database',
                color: '#e74c3c',
                components: [
                    { type: 'getStateNode', label: 'Get State', icon: 'fa-download', description: 'Read value from KV store' },
                    { type: 'setStateNode', label: 'Set State', icon: 'fa-upload', description: 'Write value to KV store' },
                    { type: 'watchStateNode', label: 'Watch State', icon: 'fa-eye', description: 'Monitor state changes' },
                    { type: 'compareStateNode', label: 'Compare State', icon: 'fa-balance-scale', description: 'Compare state values' },
                    { type: 'incrementStateNode', label: 'Increment State', icon: 'fa-plus-circle', description: 'Increment numeric state' },
                    { type: 'appendStateNode', label: 'Append to List', icon: 'fa-list-ul', description: 'Append to state list' }
                ]
            }
        };
    }

    renderComponentPalette() {
        let html = '';
        
        for (const [categoryKey, category] of Object.entries(this.componentCategories)) {
            html += `
                <div class="component-category" style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #666; display: flex; align-items: center; gap: 8px;">
                        <i class="fas ${category.icon}"></i>
                        ${category.name}
                    </h4>
                    <div class="component-list">
            `;
            
            for (const component of category.components) {
                html += `
                    <div class="palette-component" 
                         draggable="true"
                         data-type="${component.type}"
                         data-category="${categoryKey}"
                         style="
                            background: #f8f9fa;
                            border: 1px solid #dee2e6;
                            border-radius: 4px;
                            padding: 8px;
                            margin-bottom: 8px;
                            cursor: move;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            transition: all 0.2s;
                         "
                         onmouseover="this.style.background='#e9ecef'; this.style.transform='translateX(2px)';"
                         onmouseout="this.style.background='#f8f9fa'; this.style.transform='translateX(0)';">
                        <i class="fas ${component.icon}" style="color: ${category.color}; width: 20px; text-align: center;"></i>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; font-weight: 500;">${component.label}</div>
                            <div style="font-size: 11px; color: #6c757d;">${component.description}</div>
                        </div>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    setupEventListeners() {
        // Component palette drag events
        const paletteComponents = document.querySelectorAll('.palette-component');
        paletteComponents.forEach(comp => {
            comp.addEventListener('dragstart', this.onPaletteDragStart.bind(this));
            comp.addEventListener('dragend', this.onPaletteDragEnd.bind(this));
        });
        
        // Canvas drop events
        this.canvas.addEventListener('dragover', this.onCanvasDragOver.bind(this));
        this.canvas.addEventListener('drop', this.onCanvasDrop.bind(this));
        
        // Toolbar button events using delegation
        const toolbar = document.querySelector('.designer-toolbar');
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                
                const action = btn.dataset.action;
                const type = btn.dataset.type;
                
                switch(action) {
                    case 'addNode':
                        this.addNode(type);
                        break;
                    case 'zoomIn':
                        this.zoomIn();
                        break;
                    case 'zoomOut':
                        this.zoomOut();
                        break;
                    case 'resetView':
                        this.resetView();
                        break;
                    case 'clearAll':
                        this.clearAll();
                        break;
                }
            });
        }
        
        // Canvas events
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));

        // Window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Node editor button events
        const nodeEditor = document.getElementById('node-editor');
        if (nodeEditor) {
            nodeEditor.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                
                const action = btn.dataset.action;
                if (action === 'saveNodeEdit') {
                    this.saveNodeEdit();
                } else if (action === 'closeNodeEditor') {
                    this.closeNodeEditor();
                }
            });
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        this.canvas.width = containerRect.width || container.clientWidth || 800;
        this.canvas.height = containerRect.height || container.clientHeight || 600;
        
        // Force minimum size
        if (this.canvas.width < 400) this.canvas.width = 400;
        if (this.canvas.height < 300) this.canvas.height = 300;
        
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }

    onPaletteDragStart(e) {
        const type = e.target.closest('.palette-component').dataset.type;
        const category = e.target.closest('.palette-component').dataset.category;
        this.draggedPaletteNode = { type, category };
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', type);
    }
    
    onPaletteDragEnd(e) {
        this.draggedPaletteNode = null;
    }
    
    onCanvasDragOver(e) {
        if (this.draggedPaletteNode) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }
    
    onCanvasDrop(e) {
        e.preventDefault();
        if (!this.draggedPaletteNode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        
        this.addNode(this.draggedPaletteNode.type, x, y);
        this.draggedPaletteNode = null;
    }

    getNodeConfig(type) {
        // Find the component in categories
        for (const [categoryKey, category] of Object.entries(this.componentCategories)) {
            const component = category.components.find(c => c.type === type);
            if (component) {
                // Determine inputs/outputs based on category and type
                let inputs = 1, outputs = 1;
                
                if (categoryKey === 'triggers') {
                    inputs = 0;
                    outputs = 1;
                } else if (categoryKey === 'actions') {
                    inputs = 1;
                    outputs = 0;
                } else if (categoryKey === 'conditions') {
                    inputs = 1;
                    outputs = 2; // True/False outputs
                } else if (categoryKey === 'logic') {
                    // Logic gates have different configurations
                    switch(type) {
                        case 'andGate':
                        case 'orGate':
                            inputs = 2;
                            outputs = 1;
                            break;
                        case 'notGate':
                            inputs = 1;
                            outputs = 1;
                            break;
                        case 'switchNode':
                            inputs = 1;
                            outputs = 3;
                            break;
                        default:
                            inputs = 1;
                            outputs = 1;
                    }
                }
                
                return {
                    label: component.label,
                    icon: component.icon,
                    color: category.color,
                    inputs: inputs,
                    outputs: outputs,
                    category: categoryKey
                };
            }
        }
        
        // Fallback for legacy types
        const legacyConfig = {
            deviceTrigger: { label: 'Device Trigger', icon: 'fa-plug', color: '#3498db', inputs: 0, outputs: 1 },
            timeTrigger: { label: 'Time Trigger', icon: 'fa-clock', color: '#9b59b6', inputs: 0, outputs: 1 },
            condition: { label: 'Condition', icon: 'fa-code-branch', color: '#f39c12', inputs: 1, outputs: 2 },
            deviceAction: { label: 'Device Action', icon: 'fa-play', color: '#27ae60', inputs: 1, outputs: 0 },
            notification: { label: 'Notification', icon: 'fa-bell', color: '#1abc9c', inputs: 1, outputs: 0 }
        };
        
        return legacyConfig[type] || null;
    }

    addNode(type, x = null, y = null) {
        const config = this.getNodeConfig(type);
        if (!config) {
            console.error('Unknown node type:', type);
            return;
        }

        const node = {
            id: `node_${this.nextNodeId++}`,
            type: type,
            label: config.label,
            icon: config.icon,
            x: x !== null ? x : 100 + Math.random() * 400,
            y: y !== null ? y : 100 + Math.random() * 300,
            width: 180,
            height: 80,
            color: config.color,
            inputs: config.inputs,
            outputs: config.outputs,
            category: config.category,
            data: {}
        };

        // Initialize default data based on type
        this.initializeNodeData(node);
        
        this.nodes.set(node.id, node);
    }
    
    initializeNodeData(node) {
        switch(node.type) {
            // Triggers
            case 'deviceStateTrigger':
                node.data.device = '';
                node.data.attribute = 'state';
                node.data.from = '';
                node.data.to = '';
                break;
            case 'natsEventTrigger':
                node.data.subject = 'events.';
                node.data.queue = '';
                break;
            case 'timeTrigger':
                node.data.time = '00:00';
                break;
            case 'scheduleTrigger':
                node.data.cron = '0 0 * * *';
                break;
            case 'sunriseTrigger':
            case 'sunsetTrigger':
                node.data.offset = 0;
                break;
            case 'intervalTrigger':
                node.data.interval = 60;
                node.data.unit = 'seconds';
                break;
            case 'stateChangeTrigger':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                break;
                
            // Conditions
            case 'deviceStateCondition':
                node.data.device = '';
                node.data.attribute = 'state';
                node.data.operator = 'equals';
                node.data.value = '';
                break;
            case 'timeCondition':
                node.data.after = '00:00';
                node.data.before = '23:59';
                break;
            case 'dayOfWeekCondition':
                node.data.days = [];
                break;
            case 'numericCondition':
                node.data.value1 = '';
                node.data.operator = '>';
                node.data.value2 = '';
                break;
            case 'sunCondition':
                node.data.condition = 'above_horizon';
                break;
                
            // Actions
            case 'deviceAction':
                node.data.device = '';
                node.data.command = 'turn_on';
                node.data.parameters = {};
                break;
            case 'sceneAction':
                node.data.scene = '';
                break;
            case 'notificationAction':
                node.data.title = 'Alert';
                node.data.message = '';
                node.data.priority = 'normal';
                break;
            case 'delayAction':
                node.data.delay = 5;
                node.data.unit = 'seconds';
                break;
            case 'webhookAction':
                node.data.url = '';
                node.data.method = 'POST';
                node.data.headers = {};
                node.data.body = '';
                break;
            case 'publishEventAction':
                node.data.subject = 'events.';
                node.data.payload = '{}';
                node.data.headers = {};
                break;
            case 'updateStateAction':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                node.data.value = '';
                node.data.ttl = 0;
                break;
            case 'scriptAction':
                node.data.script = '';
                break;
                
            // Logic
            case 'switchNode':
                node.data.property = '';
                node.data.rules = [];
                break;
            case 'counterNode':
                node.data.threshold = 5;
                node.data.reset = true;
                break;
            case 'timerNode':
                node.data.duration = 60;
                node.data.unit = 'seconds';
                break;
                
            // State Management
            case 'getStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                break;
            case 'setStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                node.data.value = '';
                break;
            case 'watchStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                break;
            case 'compareStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                node.data.operator = 'equals';
                node.data.value = '';
                break;
            case 'incrementStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                node.data.increment = 1;
                break;
            case 'appendStateNode':
                node.data.bucket = 'automation-state';
                node.data.key = '';
                node.data.value = '';
                break;
                
            // Legacy support
            case 'deviceTrigger':
                node.data.device = '';
                node.data.attribute = 'state';
                break;
            case 'notification':
                node.data.title = 'Alert';
                node.data.message = '';
                break;
        }
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        // Check if clicking on a node
        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            // Check if clicking on a port
            const port = this.getPortAt(clickedNode, x, y);
            if (port && port.type === 'output') {
                // Start connection
                this.connectingFrom = { node: clickedNode, port: port.index };
            } else {
                // Select and drag node
                this.selectedNode = clickedNode;
                this.draggedNode = clickedNode;
                this.dragOffset = {
                    x: x - clickedNode.x,
                    y: y - clickedNode.y
                };
            }
        } else {
            // Check if clicking on a connection
            const clickedConnection = this.getConnectionAt(x, y);
            if (clickedConnection) {
                this.selectedConnection = clickedConnection;
                this.selectedNode = null;
            } else {
                // Deselect
                this.selectedNode = null;
                this.selectedConnection = null;
            }
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left - this.panX) / this.zoom;
        this.mouseY = (e.clientY - rect.top - this.panY) / this.zoom;

        if (this.draggedNode) {
            this.draggedNode.x = this.mouseX - this.dragOffset.x;
            this.draggedNode.y = this.mouseY - this.dragOffset.y;
        }

        // Update cursor
        const node = this.getNodeAt(this.mouseX, this.mouseY);
        if (node) {
            const port = this.getPortAt(node, this.mouseX, this.mouseY);
            this.canvas.style.cursor = port ? 'crosshair' : 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    onMouseUp(e) {
        if (this.connectingFrom) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.panX) / this.zoom;
            const y = (e.clientY - rect.top - this.panY) / this.zoom;

            const targetNode = this.getNodeAt(x, y);
            if (targetNode && targetNode !== this.connectingFrom.node) {
                const port = this.getPortAt(targetNode, x, y);
                if (port && port.type === 'input') {
                    // Create connection
                    this.connections.push({
                        from: this.connectingFrom.node.id,
                        fromPort: this.connectingFrom.port,
                        to: targetNode.id,
                        toPort: port.index
                    });
                }
            }
            this.connectingFrom = null;
        }
        this.draggedNode = null;
    }

    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        const node = this.getNodeAt(x, y);
        if (node) {
            this.editNode(node);
        }
    }

    onContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        const node = this.getNodeAt(x, y);
        if (node) {
            this.deleteNode(node.id);
        } else {
            const connection = this.getConnectionAt(x, y);
            if (connection) {
                this.deleteConnection(connection);
            }
        }
    }

    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.5, Math.min(2, this.zoom * delta));
    }

    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            if (x >= node.x && x <= node.x + node.width &&
                y >= node.y && y <= node.y + node.height) {
                return node;
            }
        }
        return null;
    }

    getPortAt(node, x, y) {
        const portRadius = 8;
        
        // Check input ports
        for (let i = 0; i < node.inputs; i++) {
            const portX = node.x;
            const portY = node.y + node.height / 2;
            if (Math.abs(x - portX) < portRadius && Math.abs(y - portY) < portRadius) {
                return { type: 'input', index: i };
            }
        }

        // Check output ports
        for (let i = 0; i < node.outputs; i++) {
            const portX = node.x + node.width;
            const portY = node.y + node.height / 2;
            if (Math.abs(x - portX) < portRadius && Math.abs(y - portY) < portRadius) {
                return { type: 'output', index: i };
            }
        }

        return null;
    }

    getConnectionAt(x, y) {
        for (const conn of this.connections) {
            const fromNode = this.nodes.get(conn.from);
            const toNode = this.nodes.get(conn.to);
            if (!fromNode || !toNode) continue;

            const x1 = fromNode.x + fromNode.width;
            const y1 = fromNode.y + fromNode.height / 2;
            const x2 = toNode.x;
            const y2 = toNode.y + toNode.height / 2;

            // Simple distance check to line
            const dist = this.pointToLineDistance(x, y, x1, y1, x2, y2);
            if (dist < 5) {
                return conn;
            }
        }
        return null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    deleteNode(nodeId) {
        this.nodes.delete(nodeId);
        this.connections = this.connections.filter(conn => 
            conn.from !== nodeId && conn.to !== nodeId
        );
    }

    deleteConnection(connection) {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            this.connections.splice(index, 1);
        }
    }

    editNode(node) {
        this.editingNode = node;
        const editor = document.getElementById('node-editor');
        const content = document.getElementById('node-editor-content');

        let html = `<h5><i class="fas ${node.icon || 'fa-cube'}"></i> ${node.label}</h5>`;
        
        // Generate edit form based on node type
        switch(node.type) {
            // Triggers
            case 'deviceStateTrigger':
            case 'deviceTrigger':
                html += `
                    <div class="form-group">
                        <label>Device ID</label>
                        <input type="text" id="edit-device" class="form-control" value="${node.data.device || ''}" placeholder="e.g., light.living_room">
                    </div>
                    <div class="form-group">
                        <label>Attribute</label>
                        <input type="text" id="edit-attribute" class="form-control" value="${node.data.attribute || 'state'}">
                    </div>
                    <div class="form-group">
                        <label>From State (optional)</label>
                        <input type="text" id="edit-from" class="form-control" value="${node.data.from || ''}">
                    </div>
                    <div class="form-group">
                        <label>To State (optional)</label>
                        <input type="text" id="edit-to" class="form-control" value="${node.data.to || ''}">
                    </div>
                `;
                break;
                
            case 'timeTrigger':
                html += `
                    <div class="form-group">
                        <label>Time</label>
                        <input type="time" id="edit-time" class="form-control" value="${node.data.time || '00:00'}">
                    </div>
                `;
                break;
                
            case 'scheduleTrigger':
                html += `
                    <div class="form-group">
                        <label>Cron Expression</label>
                        <input type="text" id="edit-cron" class="form-control" value="${node.data.cron || '0 0 * * *'}" placeholder="0 0 * * *">
                        <small class="form-text text-muted">Minutes Hours Day Month Weekday</small>
                    </div>
                `;
                break;
                
            case 'sunriseTrigger':
            case 'sunsetTrigger':
                html += `
                    <div class="form-group">
                        <label>Offset (minutes)</label>
                        <input type="number" id="edit-offset" class="form-control" value="${node.data.offset || 0}">
                        <small class="form-text text-muted">Positive = after, Negative = before</small>
                    </div>
                `;
                break;
                
            case 'intervalTrigger':
                html += `
                    <div class="form-group">
                        <label>Interval</label>
                        <input type="number" id="edit-interval" class="form-control" value="${node.data.interval || 60}">
                    </div>
                    <div class="form-group">
                        <label>Unit</label>
                        <select id="edit-unit" class="form-control">
                            <option value="seconds" ${node.data.unit === 'seconds' ? 'selected' : ''}>Seconds</option>
                            <option value="minutes" ${node.data.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
                            <option value="hours" ${node.data.unit === 'hours' ? 'selected' : ''}>Hours</option>
                        </select>
                    </div>
                `;
                break;
                
            // Conditions
            case 'deviceStateCondition':
                html += `
                    <div class="form-group">
                        <label>Device ID</label>
                        <input type="text" id="edit-device" class="form-control" value="${node.data.device || ''}">
                    </div>
                    <div class="form-group">
                        <label>Attribute</label>
                        <input type="text" id="edit-attribute" class="form-control" value="${node.data.attribute || 'state'}">
                    </div>
                    <div class="form-group">
                        <label>Operator</label>
                        <select id="edit-operator" class="form-control">
                            <option value="equals" ${node.data.operator === 'equals' ? 'selected' : ''}>Equals</option>
                            <option value="not_equals" ${node.data.operator === 'not_equals' ? 'selected' : ''}>Not Equals</option>
                            <option value="greater" ${node.data.operator === 'greater' ? 'selected' : ''}>Greater Than</option>
                            <option value="less" ${node.data.operator === 'less' ? 'selected' : ''}>Less Than</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Value</label>
                        <input type="text" id="edit-value" class="form-control" value="${node.data.value || ''}">
                    </div>
                `;
                break;
                
            case 'timeCondition':
                html += `
                    <div class="form-group">
                        <label>After</label>
                        <input type="time" id="edit-after" class="form-control" value="${node.data.after || '00:00'}">
                    </div>
                    <div class="form-group">
                        <label>Before</label>
                        <input type="time" id="edit-before" class="form-control" value="${node.data.before || '23:59'}">
                    </div>
                `;
                break;
                
            case 'dayOfWeekCondition':
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                html += `<div class="form-group"><label>Days of Week</label><div>`;
                days.forEach((day, index) => {
                    const checked = (node.data.days || []).includes(index) ? 'checked' : '';
                    html += `
                        <label class="checkbox-inline">
                            <input type="checkbox" id="edit-day-${index}" value="${index}" ${checked}> ${day}
                        </label><br>
                    `;
                });
                html += `</div></div>`;
                break;
                
            // Actions
            case 'deviceAction':
                html += `
                    <div class="form-group">
                        <label>Device ID</label>
                        <input type="text" id="edit-device" class="form-control" value="${node.data.device || ''}">
                    </div>
                    <div class="form-group">
                        <label>Command</label>
                        <input type="text" id="edit-command" class="form-control" value="${node.data.command || 'turn_on'}">
                    </div>
                `;
                break;
                
            case 'sceneAction':
                html += `
                    <div class="form-group">
                        <label>Scene ID</label>
                        <input type="text" id="edit-scene" class="form-control" value="${node.data.scene || ''}" placeholder="e.g., evening_lights">
                    </div>
                `;
                break;
                
            case 'notificationAction':
            case 'notification':
                html += `
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" id="edit-title" class="form-control" value="${node.data.title || 'Alert'}">
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="edit-message" class="form-control" rows="3">${node.data.message || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="edit-priority" class="form-control">
                            <option value="low" ${node.data.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="normal" ${node.data.priority === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="high" ${node.data.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'delayAction':
                html += `
                    <div class="form-group">
                        <label>Delay</label>
                        <input type="number" id="edit-delay" class="form-control" value="${node.data.delay || 5}">
                    </div>
                    <div class="form-group">
                        <label>Unit</label>
                        <select id="edit-unit" class="form-control">
                            <option value="seconds" ${node.data.unit === 'seconds' ? 'selected' : ''}>Seconds</option>
                            <option value="minutes" ${node.data.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
                            <option value="hours" ${node.data.unit === 'hours' ? 'selected' : ''}>Hours</option>
                        </select>
                    </div>
                `;
                break;
                
            // NATS Events
            case 'natsEventTrigger':
                html += `
                    <div class="form-group">
                        <label>NATS Subject</label>
                        <input type="text" id="edit-subject" class="form-control" value="${node.data.subject || 'events.'}" placeholder="e.g., events.device.light">
                        <small class="form-text text-muted">Use wildcards: * (single token) or > (multiple tokens)</small>
                    </div>
                    <div class="form-group">
                        <label>Queue Group (optional)</label>
                        <input type="text" id="edit-queue" class="form-control" value="${node.data.queue || ''}" placeholder="e.g., automation-group">
                        <small class="form-text text-muted">For load balancing across multiple instances</small>
                    </div>
                `;
                break;
                
            case 'publishEventAction':
                html += `
                    <div class="form-group">
                        <label>NATS Subject</label>
                        <input type="text" id="edit-subject" class="form-control" value="${node.data.subject || 'events.'}" placeholder="e.g., events.automation.triggered">
                    </div>
                    <div class="form-group">
                        <label>Payload (JSON)</label>
                        <textarea id="edit-payload" class="form-control" rows="4">${node.data.payload || '{}'}</textarea>
                        <small class="form-text text-muted">Use {{variables}} for dynamic values</small>
                    </div>
                `;
                break;
                
            // State Management
            case 'stateChangeTrigger':
            case 'watchStateNode':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key to Watch</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}" placeholder="e.g., home.temperature">
                    </div>
                `;
                break;
                
            case 'getStateNode':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}" placeholder="e.g., home.temperature">
                    </div>
                `;
                break;
                
            case 'setStateNode':
            case 'updateStateAction':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}" placeholder="e.g., home.temperature">
                    </div>
                    <div class="form-group">
                        <label>Value</label>
                        <input type="text" id="edit-value" class="form-control" value="${node.data.value || ''}">
                        <small class="form-text text-muted">Use {{variables}} for dynamic values</small>
                    </div>
                    <div class="form-group">
                        <label>TTL (seconds, 0 = no expiry)</label>
                        <input type="number" id="edit-ttl" class="form-control" value="${node.data.ttl || 0}" min="0">
                    </div>
                `;
                break;
                
            case 'compareStateNode':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}">
                    </div>
                    <div class="form-group">
                        <label>Operator</label>
                        <select id="edit-operator" class="form-control">
                            <option value="equals" ${node.data.operator === 'equals' ? 'selected' : ''}>Equals</option>
                            <option value="not_equals" ${node.data.operator === 'not_equals' ? 'selected' : ''}>Not Equals</option>
                            <option value="greater" ${node.data.operator === 'greater' ? 'selected' : ''}>Greater Than</option>
                            <option value="less" ${node.data.operator === 'less' ? 'selected' : ''}>Less Than</option>
                            <option value="contains" ${node.data.operator === 'contains' ? 'selected' : ''}>Contains</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Compare Value</label>
                        <input type="text" id="edit-value" class="form-control" value="${node.data.value || ''}">
                    </div>
                `;
                break;
                
            case 'incrementStateNode':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}" placeholder="e.g., counter.visits">
                    </div>
                    <div class="form-group">
                        <label>Increment By</label>
                        <input type="number" id="edit-increment" class="form-control" value="${node.data.increment || 1}">
                    </div>
                `;
                break;
                
            case 'appendStateNode':
                html += `
                    <div class="form-group">
                        <label>KV Bucket</label>
                        <input type="text" id="edit-bucket" class="form-control" value="${node.data.bucket || 'automation-state'}">
                    </div>
                    <div class="form-group">
                        <label>Key</label>
                        <input type="text" id="edit-key" class="form-control" value="${node.data.key || ''}" placeholder="e.g., log.events">
                    </div>
                    <div class="form-group">
                        <label>Value to Append</label>
                        <input type="text" id="edit-value" class="form-control" value="${node.data.value || ''}">
                    </div>
                `;
                break;
                
            default:
                html += `
                    <div class="form-group">
                        <p class="text-muted">Configuration for this node type is not yet implemented.</p>
                    </div>
                `;
        }

        content.innerHTML = html;
        editor.style.display = 'block';
    }

    saveNodeEdit() {
        if (!this.editingNode) return;

        const node = this.editingNode;
        
        // Save based on node type
        switch(node.type) {
            case 'deviceStateTrigger':
            case 'deviceTrigger':
                node.data.device = document.getElementById('edit-device').value;
                node.data.attribute = document.getElementById('edit-attribute').value;
                const fromEl = document.getElementById('edit-from');
                const toEl = document.getElementById('edit-to');
                if (fromEl) node.data.from = fromEl.value;
                if (toEl) node.data.to = toEl.value;
                break;
                
            case 'timeTrigger':
                node.data.time = document.getElementById('edit-time').value;
                break;
                
            case 'scheduleTrigger':
                node.data.cron = document.getElementById('edit-cron').value;
                break;
                
            case 'sunriseTrigger':
            case 'sunsetTrigger':
                node.data.offset = parseInt(document.getElementById('edit-offset').value) || 0;
                break;
                
            case 'intervalTrigger':
                node.data.interval = parseInt(document.getElementById('edit-interval').value) || 60;
                node.data.unit = document.getElementById('edit-unit').value;
                break;
                
            case 'deviceStateCondition':
                node.data.device = document.getElementById('edit-device').value;
                node.data.attribute = document.getElementById('edit-attribute').value;
                node.data.operator = document.getElementById('edit-operator').value;
                node.data.value = document.getElementById('edit-value').value;
                break;
                
            case 'timeCondition':
                node.data.after = document.getElementById('edit-after').value;
                node.data.before = document.getElementById('edit-before').value;
                break;
                
            case 'dayOfWeekCondition':
                node.data.days = [];
                for (let i = 0; i < 7; i++) {
                    const checkbox = document.getElementById(`edit-day-${i}`);
                    if (checkbox && checkbox.checked) {
                        node.data.days.push(i);
                    }
                }
                break;
                
            case 'deviceAction':
                node.data.device = document.getElementById('edit-device').value;
                node.data.command = document.getElementById('edit-command').value;
                break;
                
            case 'sceneAction':
                node.data.scene = document.getElementById('edit-scene').value;
                break;
                
            case 'notificationAction':
            case 'notification':
                node.data.title = document.getElementById('edit-title').value;
                node.data.message = document.getElementById('edit-message').value;
                const priorityEl = document.getElementById('edit-priority');
                if (priorityEl) node.data.priority = priorityEl.value;
                break;
                
            case 'delayAction':
                node.data.delay = parseInt(document.getElementById('edit-delay').value) || 5;
                node.data.unit = document.getElementById('edit-unit').value;
                break;
                
            // NATS Events
            case 'natsEventTrigger':
                node.data.subject = document.getElementById('edit-subject').value;
                node.data.queue = document.getElementById('edit-queue').value;
                break;
                
            case 'publishEventAction':
                node.data.subject = document.getElementById('edit-subject').value;
                node.data.payload = document.getElementById('edit-payload').value;
                break;
                
            // State Management
            case 'stateChangeTrigger':
            case 'watchStateNode':
            case 'getStateNode':
                node.data.bucket = document.getElementById('edit-bucket').value;
                node.data.key = document.getElementById('edit-key').value;
                break;
                
            case 'setStateNode':
            case 'updateStateAction':
                node.data.bucket = document.getElementById('edit-bucket').value;
                node.data.key = document.getElementById('edit-key').value;
                node.data.value = document.getElementById('edit-value').value;
                const ttlEl = document.getElementById('edit-ttl');
                if (ttlEl) node.data.ttl = parseInt(ttlEl.value) || 0;
                break;
                
            case 'compareStateNode':
                node.data.bucket = document.getElementById('edit-bucket').value;
                node.data.key = document.getElementById('edit-key').value;
                node.data.operator = document.getElementById('edit-operator').value;
                node.data.value = document.getElementById('edit-value').value;
                break;
                
            case 'incrementStateNode':
                node.data.bucket = document.getElementById('edit-bucket').value;
                node.data.key = document.getElementById('edit-key').value;
                node.data.increment = parseInt(document.getElementById('edit-increment').value) || 1;
                break;
                
            case 'appendStateNode':
                node.data.bucket = document.getElementById('edit-bucket').value;
                node.data.key = document.getElementById('edit-key').value;
                node.data.value = document.getElementById('edit-value').value;
                break;
        }

        this.closeNodeEditor();
    }

    closeNodeEditor() {
        document.getElementById('node-editor').style.display = 'none';
        this.editingNode = null;
    }

    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context
        this.ctx.save();

        // Apply zoom and pan
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // Draw grid
        this.drawGrid();

        // Draw connections
        for (const conn of this.connections) {
            this.drawConnection(conn);
        }

        // Draw temporary connection
        if (this.connectingFrom) {
            const fromNode = this.connectingFrom.node;
            const x1 = fromNode.x + fromNode.width;
            const y1 = fromNode.y + fromNode.height / 2;
            
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(this.mouseX, this.mouseY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw nodes
        for (const node of this.nodes.values()) {
            this.drawNode(node);
        }

        // Restore context
        this.ctx.restore();

        // Continue render loop
        requestAnimationFrame(this.render.bind(this));
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        const gridSize = 20;

        const startX = Math.floor(-this.panX / this.zoom / gridSize) * gridSize;
        const endX = startX + this.canvas.width / this.zoom + gridSize;
        const startY = Math.floor(-this.panY / this.zoom / gridSize) * gridSize;
        const endY = startY + this.canvas.height / this.zoom + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    drawNode(node) {
        const isSelected = this.selectedNode === node;

        // Draw shadow
        if (isSelected) {
            this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
            this.ctx.shadowBlur = 10;
        }

        // Draw node background
        this.ctx.fillStyle = node.color;
        this.ctx.fillRect(node.x, node.y, node.width, node.height);

        // Reset shadow
        this.ctx.shadowBlur = 0;

        // Draw border
        this.ctx.strokeStyle = isSelected ? '#2c3e50' : '#34495e';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.strokeRect(node.x, node.y, node.width, node.height);

        // Draw icon if available
        if (node.icon) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px FontAwesome';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // Simple icon mapping for canvas (would need proper font icon rendering)
            const iconMap = {
                'fa-plug': '\uf1e6',
                'fa-clock': '\uf017',
                'fa-play': '\uf04b',
                'fa-bell': '\uf0f3',
                'fa-code-branch': '\uf126',
                'fa-sun': '\uf185',
                'fa-moon': '\uf186',
                'fa-calendar': '\uf133',
                'fa-globe': '\uf0ac',
                'fa-exchange-alt': '\uf362',
                'fa-redo': '\uf01e'
            };
            const iconChar = iconMap[node.icon] || '\uf128';
            this.ctx.fillText(iconChar, node.x + node.width / 2, node.y + 25);
        }
        
        // Draw label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Wrap long labels
        const maxWidth = node.width - 20;
        const words = node.label.split(' ');
        let line = '';
        let y = node.y + 45;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, node.x + node.width / 2, y);
                line = words[n] + ' ';
                y += 15;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, node.x + node.width / 2, y);

        // Draw data preview for some types
        if (node.data.device || node.data.time || node.data.scene) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            let preview = node.data.device || node.data.time || node.data.scene || '';
            if (preview.length > 20) preview = preview.substring(0, 17) + '...';
            this.ctx.fillText(preview, node.x + node.width / 2, node.y + node.height - 10);
        }

        // Draw ports
        const portRadius = 6;

        // Input ports
        for (let i = 0; i < node.inputs; i++) {
            const x = node.x;
            const y = node.y + node.height / 2;
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.beginPath();
            this.ctx.arc(x, y, portRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#34495e';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        // Output ports
        for (let i = 0; i < node.outputs; i++) {
            const x = node.x + node.width;
            const y = node.y + node.height / 2;
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.beginPath();
            this.ctx.arc(x, y, portRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#34495e';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    drawConnection(conn) {
        const fromNode = this.nodes.get(conn.from);
        const toNode = this.nodes.get(conn.to);
        if (!fromNode || !toNode) return;

        const x1 = fromNode.x + fromNode.width;
        const y1 = fromNode.y + fromNode.height / 2;
        const x2 = toNode.x;
        const y2 = toNode.y + toNode.height / 2;

        this.ctx.strokeStyle = this.selectedConnection === conn ? '#e74c3c' : '#34495e';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        
        // Draw bezier curve
        const cp1x = x1 + 50;
        const cp1y = y1;
        const cp2x = x2 - 50;
        const cp2y = y2;
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        
        this.ctx.stroke();
    }

    zoomIn() {
        this.zoom = Math.min(2, this.zoom * 1.2);
    }

    zoomOut() {
        this.zoom = Math.max(0.5, this.zoom / 1.2);
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    clearAll() {
        if (confirm('Clear all nodes and connections?')) {
            this.nodes.clear();
            this.connections = [];
            this.selectedNode = null;
            this.selectedConnection = null;
        }
    }

    getFlowData() {
        const nodes = Array.from(this.nodes.values());
        return { nodes, connections: this.connections };
    }

    loadFlow(flowData) {
        this.nodes.clear();
        this.connections = [];

        if (flowData.nodes) {
            for (const node of flowData.nodes) {
                this.nodes.set(node.id, node);
                this.nextNodeId = Math.max(this.nextNodeId, parseInt(node.id.split('_')[1]) + 1);
            }
        }

        if (flowData.connections) {
            this.connections = [...flowData.connections];
        }
    }

    getAutomationName() {
        const nameInput = document.getElementById('automation-name');
        return nameInput ? nameInput.value : this.currentAutomation.name;
    }

    getAutomationDescription() {
        const descInput = document.getElementById('automation-description');
        return descInput ? descInput.value : this.currentAutomation.description;
    }

    getAutomationEnabled() {
        const enabledInput = document.getElementById('automation-enabled');
        return enabledInput ? enabledInput.checked : this.currentAutomation.enabled;
    }

    convertToAutomation() {
        const triggers = [];
        const conditions = [];
        const actions = [];

        for (const node of this.nodes.values()) {
            const category = node.category || this.getCategoryForType(node.type);
            
            if (category === 'triggers') {
                switch(node.type) {
                    case 'deviceStateTrigger':
                    case 'deviceTrigger':
                        const trigger = {
                            type: 'device_state',
                            device_id: node.data.device,
                            attribute: node.data.attribute || 'state'
                        };
                        if (node.data.from) trigger.from = node.data.from;
                        if (node.data.to) trigger.to = node.data.to;
                        triggers.push(trigger);
                        break;
                        
                    case 'timeTrigger':
                        triggers.push({
                            type: 'time',
                            time: node.data.time
                        });
                        break;
                        
                    case 'scheduleTrigger':
                        triggers.push({
                            type: 'schedule',
                            cron: node.data.cron
                        });
                        break;
                        
                    case 'sunriseTrigger':
                        triggers.push({
                            type: 'sunrise',
                            offset: node.data.offset || 0
                        });
                        break;
                        
                    case 'sunsetTrigger':
                        triggers.push({
                            type: 'sunset',
                            offset: node.data.offset || 0
                        });
                        break;
                        
                    case 'intervalTrigger':
                        triggers.push({
                            type: 'interval',
                            interval: node.data.interval,
                            unit: node.data.unit
                        });
                        break;
                        
                    case 'natsEventTrigger':
                        triggers.push({
                            type: 'nats_event',
                            subject: node.data.subject,
                            queue: node.data.queue || undefined
                        });
                        break;
                        
                    case 'stateChangeTrigger':
                        triggers.push({
                            type: 'state_change',
                            bucket: node.data.bucket,
                            key: node.data.key
                        });
                        break;
                }
            } else if (category === 'conditions' || node.type === 'condition') {
                switch(node.type) {
                    case 'deviceStateCondition':
                        conditions.push({
                            type: 'device_state',
                            device_id: node.data.device,
                            attribute: node.data.attribute || 'state',
                            operator: node.data.operator || 'equals',
                            value: node.data.value
                        });
                        break;
                        
                    case 'timeCondition':
                        conditions.push({
                            type: 'time_between',
                            after: node.data.after,
                            before: node.data.before
                        });
                        break;
                        
                    case 'dayOfWeekCondition':
                        conditions.push({
                            type: 'day_of_week',
                            days: node.data.days || []
                        });
                        break;
                        
                    case 'condition':
                        // Legacy support
                        conditions.push({
                            type: 'device_state',
                            device_id: node.data.device,
                            attribute: node.data.attribute,
                            value: node.data.value
                        });
                        break;
                }
            } else if (category === 'state') {
                // State nodes can be both conditions and actions
                switch(node.type) {
                    case 'getStateNode':
                    case 'watchStateNode':
                        // These are typically used as conditions
                        conditions.push({
                            type: 'state_value',
                            bucket: node.data.bucket,
                            key: node.data.key
                        });
                        break;
                        
                    case 'compareStateNode':
                        conditions.push({
                            type: 'state_compare',
                            bucket: node.data.bucket,
                            key: node.data.key,
                            operator: node.data.operator,
                            value: node.data.value
                        });
                        break;
                        
                    case 'setStateNode':
                        actions.push({
                            type: 'set_state',
                            bucket: node.data.bucket,
                            key: node.data.key,
                            value: node.data.value
                        });
                        break;
                        
                    case 'incrementStateNode':
                        actions.push({
                            type: 'increment_state',
                            bucket: node.data.bucket,
                            key: node.data.key,
                            increment: node.data.increment
                        });
                        break;
                        
                    case 'appendStateNode':
                        actions.push({
                            type: 'append_state',
                            bucket: node.data.bucket,
                            key: node.data.key,
                            value: node.data.value
                        });
                        break;
                }
            } else if (category === 'actions') {
                switch(node.type) {
                    case 'deviceAction':
                        actions.push({
                            type: 'device_command',
                            device_id: node.data.device,
                            command: node.data.command || 'turn_on',
                            parameters: node.data.parameters || {}
                        });
                        break;
                        
                    case 'sceneAction':
                        actions.push({
                            type: 'activate_scene',
                            scene_id: node.data.scene
                        });
                        break;
                        
                    case 'notificationAction':
                    case 'notification':
                        actions.push({
                            type: 'notification',
                            title: node.data.title,
                            message: node.data.message,
                            priority: node.data.priority || 'normal'
                        });
                        break;
                        
                    case 'delayAction':
                        actions.push({
                            type: 'delay',
                            delay: node.data.delay,
                            unit: node.data.unit || 'seconds'
                        });
                        break;
                        
                    case 'publishEventAction':
                        actions.push({
                            type: 'publish_event',
                            subject: node.data.subject,
                            payload: node.data.payload
                        });
                        break;
                        
                    case 'updateStateAction':
                        actions.push({
                            type: 'update_state',
                            bucket: node.data.bucket,
                            key: node.data.key,
                            value: node.data.value,
                            ttl: node.data.ttl || 0
                        });
                        break;
                }
            }
        }

        return { 
            name: this.getAutomationName(),
            description: this.getAutomationDescription(),
            enabled: this.getAutomationEnabled(),
            triggers, 
            conditions, 
            actions, 
            flow: this.getFlowData() 
        };
    }
    
    getCategoryForType(type) {
        // Helper to determine category for legacy types
        if (type.includes('Trigger')) return 'triggers';
        if (type.includes('Action') || type === 'notification') return 'actions';
        if (type.includes('Condition') || type === 'condition') return 'conditions';
        return 'logic';
    }
}

// Create global instance
window.simpleFlowDesigner = new SimpleFlowDesigner();

// Also expose as reteDesigner for compatibility
window.reteDesigner = window.simpleFlowDesigner;
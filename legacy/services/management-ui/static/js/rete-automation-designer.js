// Rete.js-based Automation Designer for NATS Home Automation
import { NodeEditor, ClassicPreset } from "https://cdn.jsdelivr.net/npm/rete@2.0.2/+esm";
import { AreaPlugin, AreaExtensions } from "https://cdn.jsdelivr.net/npm/rete-area-plugin@2.0.3/+esm";
import { ConnectionPlugin, Presets as ConnectionPresets } from "https://cdn.jsdelivr.net/npm/rete-connection-plugin@2.0.1/+esm";
import { ReactPlugin, Presets as ReactPresets } from "https://cdn.jsdelivr.net/npm/rete-react-plugin@2.0.3/+esm";
import { ContextMenuPlugin } from "https://cdn.jsdelivr.net/npm/rete-context-menu-plugin@2.0.1/+esm";
import { createRoot } from "https://cdn.jsdelivr.net/npm/react-dom@18/+esm";
import React from "https://cdn.jsdelivr.net/npm/react@18/+esm";

// Custom socket types for home automation
class HomeAutomationSocket extends ClassicPreset.Socket {
    constructor(name, type = 'any') {
        super(name);
        this.type = type;
    }

    isCompatibleWith(socket) {
        return this.type === 'any' || socket.type === 'any' || this.type === socket.type;
    }
}

// Define custom nodes for home automation
class DeviceTriggerNode extends ClassicPreset.Node {
    constructor() {
        super('Device Trigger');
        const out = new ClassicPreset.Output(new HomeAutomationSocket('trigger', 'event'));
        const deviceSelect = new ClassicPreset.InputControl('select', {
            options: [],
            initial: ''
        });
        const attributeInput = new ClassicPreset.InputControl('text', {
            initial: 'state'
        });
        const operatorSelect = new ClassicPreset.InputControl('select', {
            options: [
                { value: 'eq', label: 'equals' },
                { value: 'ne', label: 'not equals' },
                { value: 'gt', label: 'greater than' },
                { value: 'lt', label: 'less than' }
            ],
            initial: 'eq'
        });
        const valueInput = new ClassicPreset.InputControl('text', {
            initial: ''
        });

        this.addOutput('trigger', out);
        this.addControl('device', deviceSelect);
        this.addControl('attribute', attributeInput);
        this.addControl('operator', operatorSelect);
        this.addControl('value', valueInput);
    }
}

class TimeTriggerNode extends ClassicPreset.Node {
    constructor() {
        super('Time Trigger');
        const out = new ClassicPreset.Output(new HomeAutomationSocket('trigger', 'event'));
        const timeInput = new ClassicPreset.InputControl('time', {
            initial: '00:00'
        });
        const daysSelect = new ClassicPreset.InputControl('select', {
            options: [
                { value: 'everyday', label: 'Every day' },
                { value: 'weekdays', label: 'Weekdays' },
                { value: 'weekends', label: 'Weekends' },
                { value: 'custom', label: 'Custom days' }
            ],
            initial: 'everyday'
        });

        this.addOutput('trigger', out);
        this.addControl('time', timeInput);
        this.addControl('days', daysSelect);
    }
}

class ConditionNode extends ClassicPreset.Node {
    constructor() {
        super('Condition');
        const inp = new ClassicPreset.Input(new HomeAutomationSocket('input', 'event'));
        const outTrue = new ClassicPreset.Output(new HomeAutomationSocket('true', 'event'));
        const outFalse = new ClassicPreset.Output(new HomeAutomationSocket('false', 'event'));
        
        const deviceSelect = new ClassicPreset.InputControl('select', {
            options: [],
            initial: ''
        });
        const attributeInput = new ClassicPreset.InputControl('text', {
            initial: 'state'
        });
        const operatorSelect = new ClassicPreset.InputControl('select', {
            options: [
                { value: 'eq', label: 'equals' },
                { value: 'ne', label: 'not equals' },
                { value: 'gt', label: 'greater than' },
                { value: 'lt', label: 'less than' }
            ],
            initial: 'eq'
        });
        const valueInput = new ClassicPreset.InputControl('text', {
            initial: ''
        });

        this.addInput('input', inp);
        this.addOutput('true', outTrue);
        this.addOutput('false', outFalse);
        this.addControl('device', deviceSelect);
        this.addControl('attribute', attributeInput);
        this.addControl('operator', operatorSelect);
        this.addControl('value', valueInput);
    }
}

class DeviceActionNode extends ClassicPreset.Node {
    constructor() {
        super('Device Action');
        const inp = new ClassicPreset.Input(new HomeAutomationSocket('trigger', 'event'));
        const deviceSelect = new ClassicPreset.InputControl('select', {
            options: [],
            initial: ''
        });
        const commandInput = new ClassicPreset.InputControl('text', {
            initial: 'turn_on'
        });
        const parametersInput = new ClassicPreset.InputControl('text', {
            initial: '{}'
        });

        this.addInput('trigger', inp);
        this.addControl('device', deviceSelect);
        this.addControl('command', commandInput);
        this.addControl('parameters', parametersInput);
    }
}

class SceneActionNode extends ClassicPreset.Node {
    constructor() {
        super('Activate Scene');
        const inp = new ClassicPreset.Input(new HomeAutomationSocket('trigger', 'event'));
        const sceneSelect = new ClassicPreset.InputControl('select', {
            options: [],
            initial: ''
        });

        this.addInput('trigger', inp);
        this.addControl('scene', sceneSelect);
    }
}

class NotificationNode extends ClassicPreset.Node {
    constructor() {
        super('Send Notification');
        const inp = new ClassicPreset.Input(new HomeAutomationSocket('trigger', 'event'));
        const titleInput = new ClassicPreset.InputControl('text', {
            initial: 'Automation Alert'
        });
        const messageInput = new ClassicPreset.InputControl('text', {
            initial: ''
        });
        const prioritySelect = new ClassicPreset.InputControl('select', {
            options: [
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' }
            ],
            initial: 'normal'
        });

        this.addInput('trigger', inp);
        this.addControl('title', titleInput);
        this.addControl('message', messageInput);
        this.addControl('priority', prioritySelect);
    }
}

class DelayNode extends ClassicPreset.Node {
    constructor() {
        super('Delay');
        const inp = new ClassicPreset.Input(new HomeAutomationSocket('input', 'event'));
        const out = new ClassicPreset.Output(new HomeAutomationSocket('output', 'event'));
        const delayInput = new ClassicPreset.InputControl('number', {
            initial: 5
        });

        this.addInput('input', inp);
        this.addOutput('output', out);
        this.addControl('delay', delayInput);
    }
}

class ReteAutomationDesigner {
    constructor() {
        this.editor = null;
        this.area = null;
        this.currentAutomation = null;
        this.container = null;
    }

    async init(containerId, automation = null) {
        this.currentAutomation = automation || {
            id: null,
            name: '',
            description: '',
            enabled: true,
            flow: { nodes: [], connections: [] }
        };

        // Create container structure
        const mainContainer = document.getElementById(containerId);
        mainContainer.innerHTML = `
            <div class="rete-automation-designer">
                <div class="designer-toolbar">
                    <div class="toolbar-group">
                        <button class="btn btn-sm" onclick="reteDesigner.zoomIn()">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.zoomOut()">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.fitToView()">
                            <i class="fas fa-compress"></i>
                        </button>
                    </div>
                    <div class="toolbar-group">
                        <button class="btn btn-sm btn-primary" onclick="reteDesigner.saveAutomation()">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button class="btn btn-sm btn-success" onclick="reteDesigner.testAutomation()">
                            <i class="fas fa-play"></i> Test
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="reteDesigner.clearEditor()">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>
                </div>
                <div id="rete-editor" class="rete-editor-container"></div>
            </div>
        `;

        // Initialize Rete editor
        this.container = document.getElementById('rete-editor');
        await this.setupEditor();

        // Load existing automation if provided
        if (automation && automation.flow) {
            await this.loadFlow(automation.flow);
        }
    }

    async setupEditor() {
        // Create editor instance
        this.editor = new NodeEditor();

        // Create and configure area plugin
        this.area = new AreaPlugin(this.container);
        const connection = new ConnectionPlugin();
        const render = new ReactPlugin({ createRoot });

        // Configure rendering
        render.addPreset(ReactPresets.classic.setup({
            customize: {
                node() {
                    return ({ emit, payload }) => {
                        const { id, label, inputs, outputs, controls, selected } = payload;
                        
                        // Custom node styling based on type
                        const nodeClass = label.includes('Trigger') ? 'trigger-node' : 
                                        label.includes('Condition') ? 'condition-node' : 
                                        label.includes('Action') || label.includes('Notification') ? 'action-node' : 
                                        'default-node';
                        
                        return React.createElement('div', {
                            className: `node ${nodeClass} ${selected ? 'selected' : ''}`,
                            'data-node-id': id
                        }, [
                            React.createElement('div', { className: 'node-title', key: 'title' }, label),
                            React.createElement('div', { className: 'node-inputs', key: 'inputs' }, 
                                Object.entries(inputs).map(([key, input]) => input)
                            ),
                            React.createElement('div', { className: 'node-controls', key: 'controls' }, 
                                Object.entries(controls).map(([key, control]) => control)
                            ),
                            React.createElement('div', { className: 'node-outputs', key: 'outputs' }, 
                                Object.entries(outputs).map(([key, output]) => output)
                            )
                        ]);
                    };
                }
            }
        }));

        // Configure connection plugin
        connection.addPreset(ConnectionPresets.classic.setup());

        // Add context menu
        const contextMenu = new ContextMenuPlugin({
            items: {
                'Device Trigger': () => this.addNode('deviceTrigger'),
                'Time Trigger': () => this.addNode('timeTrigger'),
                'Condition': () => this.addNode('condition'),
                'Device Action': () => this.addNode('deviceAction'),
                'Scene Action': () => this.addNode('sceneAction'),
                'Notification': () => this.addNode('notification'),
                'Delay': () => this.addNode('delay')
            }
        });

        // Apply plugins
        this.editor.use(this.area);
        this.area.use(connection);
        this.area.use(render);
        this.area.use(contextMenu);

        // Configure area extensions
        AreaExtensions.selectableNodes(this.area, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        // Update device and scene options
        await this.updateNodeOptions();
    }

    async addNode(type, position = null) {
        let node;
        switch(type) {
            case 'deviceTrigger':
                node = new DeviceTriggerNode();
                break;
            case 'timeTrigger':
                node = new TimeTriggerNode();
                break;
            case 'condition':
                node = new ConditionNode();
                break;
            case 'deviceAction':
                node = new DeviceActionNode();
                break;
            case 'sceneAction':
                node = new SceneActionNode();
                break;
            case 'notification':
                node = new NotificationNode();
                break;
            case 'delay':
                node = new DelayNode();
                break;
            default:
                console.error('Unknown node type:', type);
                return;
        }

        await this.editor.addNode(node);

        // Position the node
        if (position) {
            await this.area.translate(node.id, position);
        } else {
            // Random position if not specified
            await this.area.translate(node.id, {
                x: Math.random() * 500,
                y: Math.random() * 500
            });
        }

        return node;
    }

    async updateNodeOptions() {
        // Update device options in all device-related nodes
        if (window.app && window.app.devices) {
            const deviceOptions = Array.from(window.app.devices.entries()).map(([id, device]) => ({
                value: id,
                label: device.name
            }));

            // Update existing nodes
            for (const node of this.editor.getNodes()) {
                if (node.controls.device) {
                    node.controls.device.options = deviceOptions;
                }
            }
        }

        // Update scene options
        if (window.app && window.app.scenes) {
            const sceneOptions = Array.from(window.app.scenes.entries()).map(([id, scene]) => ({
                value: id,
                label: scene.name
            }));

            // Update existing nodes
            for (const node of this.editor.getNodes()) {
                if (node.controls.scene) {
                    node.controls.scene.options = sceneOptions;
                }
            }
        }
    }

    async loadFlow(flowData) {
        // Clear existing nodes and connections
        await this.clearEditor(false);

        // Load nodes
        if (flowData.nodes) {
            for (const nodeData of flowData.nodes) {
                const node = await this.addNode(nodeData.type);
                if (node) {
                    // Restore node position
                    await this.area.translate(node.id, { x: nodeData.x, y: nodeData.y });
                    
                    // Restore control values
                    for (const [key, value] of Object.entries(nodeData.controls || {})) {
                        if (node.controls[key]) {
                            node.controls[key].value = value;
                        }
                    }
                }
            }
        }

        // Load connections
        if (flowData.connections) {
            const nodes = this.editor.getNodes();
            for (const connData of flowData.connections) {
                const sourceNode = nodes.find(n => n.id === connData.source);
                const targetNode = nodes.find(n => n.id === connData.target);
                
                if (sourceNode && targetNode) {
                    const output = sourceNode.outputs[connData.sourceOutput];
                    const input = targetNode.inputs[connData.targetInput];
                    
                    if (output && input) {
                        await this.editor.addConnection(new ClassicPreset.Connection(sourceNode, output.key, targetNode, input.key));
                    }
                }
            }
        }
    }

    getFlowData() {
        const nodes = [];
        const connections = [];

        // Export nodes
        for (const node of this.editor.getNodes()) {
            const nodeData = {
                id: node.id,
                type: this.getNodeType(node),
                label: node.label,
                x: this.area.nodeViews.get(node.id)?.position.x || 0,
                y: this.area.nodeViews.get(node.id)?.position.y || 0,
                controls: {}
            };

            // Export control values
            for (const [key, control] of Object.entries(node.controls)) {
                nodeData.controls[key] = control.value;
            }

            nodes.push(nodeData);
        }

        // Export connections
        for (const conn of this.editor.getConnections()) {
            connections.push({
                source: conn.source,
                sourceOutput: conn.sourceOutput,
                target: conn.target,
                targetInput: conn.targetInput
            });
        }

        return { nodes, connections };
    }

    getNodeType(node) {
        const label = node.label;
        if (label === 'Device Trigger') return 'deviceTrigger';
        if (label === 'Time Trigger') return 'timeTrigger';
        if (label === 'Condition') return 'condition';
        if (label === 'Device Action') return 'deviceAction';
        if (label === 'Activate Scene') return 'sceneAction';
        if (label === 'Send Notification') return 'notification';
        if (label === 'Delay') return 'delay';
        return 'unknown';
    }

    convertToAutomation() {
        const flowData = this.getFlowData();
        const triggers = [];
        const conditions = [];
        const actions = [];

        for (const node of flowData.nodes) {
            const controls = node.controls;

            switch(node.type) {
                case 'deviceTrigger':
                    triggers.push({
                        type: 'device_state',
                        device_id: controls.device,
                        attribute: controls.attribute,
                        operator: controls.operator,
                        value: controls.value
                    });
                    break;
                case 'timeTrigger':
                    triggers.push({
                        type: 'time',
                        time: controls.time,
                        days: controls.days
                    });
                    break;
                case 'condition':
                    conditions.push({
                        type: 'device_state',
                        device_id: controls.device,
                        attribute: controls.attribute,
                        operator: controls.operator,
                        value: controls.value
                    });
                    break;
                case 'deviceAction':
                    actions.push({
                        type: 'device_command',
                        device_id: controls.device,
                        command: controls.command,
                        parameters: JSON.parse(controls.parameters || '{}')
                    });
                    break;
                case 'sceneAction':
                    actions.push({
                        type: 'scene_activate',
                        scene_id: controls.scene
                    });
                    break;
                case 'notification':
                    actions.push({
                        type: 'notification',
                        title: controls.title,
                        message: controls.message,
                        priority: controls.priority
                    });
                    break;
                case 'delay':
                    actions.push({
                        type: 'delay',
                        delay: controls.delay
                    });
                    break;
            }
        }

        return { triggers, conditions, actions, flow: flowData };
    }

    async saveAutomation() {
        const automationData = this.convertToAutomation();
        
        // Merge with current automation data
        this.currentAutomation.triggers = automationData.triggers;
        this.currentAutomation.conditions = automationData.conditions;
        this.currentAutomation.actions = automationData.actions;
        this.currentAutomation.flow = automationData.flow;

        // Emit save event
        if (window.automationBuilder && window.automationBuilder.saveAutomation) {
            await window.automationBuilder.saveAutomation();
        }
    }

    async testAutomation() {
        alert('Testing automation... (not yet implemented)');
    }

    async clearEditor(confirm = true) {
        if (confirm && !window.confirm('Are you sure you want to clear the editor?')) {
            return;
        }

        // Remove all nodes and connections
        const nodes = [...this.editor.getNodes()];
        const connections = [...this.editor.getConnections()];

        for (const conn of connections) {
            await this.editor.removeConnection(conn.id);
        }

        for (const node of nodes) {
            await this.editor.removeNode(node.id);
        }
    }

    zoomIn() {
        if (this.area) {
            const zoom = this.area.area.zoom.k * 1.2;
            this.area.area.zoom(zoom);
        }
    }

    zoomOut() {
        if (this.area) {
            const zoom = this.area.area.zoom.k / 1.2;
            this.area.area.zoom(zoom);
        }
    }

    async fitToView() {
        if (this.area) {
            await AreaExtensions.zoomAt(this.area, this.editor.getNodes());
        }
    }
}

// Create global instance
window.reteDesigner = new ReteAutomationDesigner();
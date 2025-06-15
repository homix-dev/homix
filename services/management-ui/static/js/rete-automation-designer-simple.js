// Simplified Rete.js-based Automation Designer for NATS Home Automation
import { NodeEditor, ClassicPreset } from "https://cdn.jsdelivr.net/npm/rete@2.0.2/+esm";
import { AreaPlugin, AreaExtensions } from "https://cdn.jsdelivr.net/npm/rete-area-plugin@2.0.3/+esm";
import { ConnectionPlugin, Presets as ConnectionPresets } from "https://cdn.jsdelivr.net/npm/rete-connection-plugin@2.0.1/+esm";

// Custom socket for home automation
class HASocket extends ClassicPreset.Socket {
    constructor(name) {
        super(name);
    }
}

// Custom node classes
class TriggerNode extends ClassicPreset.Node {
    constructor(type, label) {
        super(label);
        this.type = type;
        this.width = 180;
        this.height = 120;
        
        const out = new ClassicPreset.Output(new HASocket('trigger'));
        this.addOutput('trigger', out);
        
        // Add controls based on type
        if (type === 'deviceTrigger') {
            this.addControl('device', new ClassicPreset.InputControl('text', { initial: '' }));
            this.addControl('attribute', new ClassicPreset.InputControl('text', { initial: 'state' }));
        } else if (type === 'timeTrigger') {
            this.addControl('time', new ClassicPreset.InputControl('time', { initial: '00:00' }));
        }
    }
}

class ActionNode extends ClassicPreset.Node {
    constructor(type, label) {
        super(label);
        this.type = type;
        this.width = 180;
        this.height = 120;
        
        const inp = new ClassicPreset.Input(new HASocket('trigger'));
        this.addInput('trigger', inp);
        
        // Add controls based on type
        if (type === 'deviceAction') {
            this.addControl('device', new ClassicPreset.InputControl('text', { initial: '' }));
            this.addControl('command', new ClassicPreset.InputControl('text', { initial: 'turn_on' }));
        } else if (type === 'notification') {
            this.addControl('title', new ClassicPreset.InputControl('text', { initial: 'Alert' }));
            this.addControl('message', new ClassicPreset.InputControl('text', { initial: '' }));
        }
    }
}

class ConditionNode extends ClassicPreset.Node {
    constructor() {
        super('Condition');
        this.width = 180;
        this.height = 150;
        
        const inp = new ClassicPreset.Input(new HASocket('trigger'));
        const outTrue = new ClassicPreset.Output(new HASocket('trigger'));
        const outFalse = new ClassicPreset.Output(new HASocket('trigger'));
        
        this.addInput('input', inp);
        this.addOutput('true', outTrue);
        this.addOutput('false', outFalse);
        
        this.addControl('device', new ClassicPreset.InputControl('text', { initial: '' }));
        this.addControl('attribute', new ClassicPreset.InputControl('text', { initial: 'state' }));
        this.addControl('value', new ClassicPreset.InputControl('text', { initial: '' }));
    }
}

// Main designer class
class SimpleReteAutomationDesigner {
    constructor() {
        this.editor = null;
        this.area = null;
        this.connection = null;
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
                        <button class="btn btn-sm" onclick="reteDesigner.addNode('deviceTrigger', 100, 100)">
                            <i class="fas fa-plug"></i> Device Trigger
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.addNode('timeTrigger', 100, 100)">
                            <i class="fas fa-clock"></i> Time Trigger
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.addNode('condition', 100, 100)">
                            <i class="fas fa-code-branch"></i> Condition
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.addNode('deviceAction', 100, 100)">
                            <i class="fas fa-play"></i> Device Action
                        </button>
                        <button class="btn btn-sm" onclick="reteDesigner.addNode('notification', 100, 100)">
                            <i class="fas fa-bell"></i> Notification
                        </button>
                    </div>
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
        try {
            // Create editor instance
            this.editor = new NodeEditor();
            
            // Create area plugin
            this.area = new AreaPlugin(this.container);
            this.editor.use(this.area);
            
            // Create connection plugin
            this.connection = new ConnectionPlugin();
            this.connection.addPreset(ConnectionPresets.classic.setup());
            this.area.use(this.connection);
            
            // Enable node selection
            AreaExtensions.selectableNodes(this.area, AreaExtensions.selector(), {
                accumulating: AreaExtensions.accumulateOnCtrl()
            });
            
            // Add zoom functionality
            AreaExtensions.zoomAt(this.area, this.editor.getNodes());
            
        } catch (error) {
            console.error('Error setting up editor:', error);
            throw error;
        }
    }

    async addNode(type, x = null, y = null) {
        try {
            let node;
            
            // Random position if not specified
            if (x === null) x = Math.random() * 500 + 100;
            if (y === null) y = Math.random() * 300 + 100;
            
            switch(type) {
                case 'deviceTrigger':
                    node = new TriggerNode('deviceTrigger', 'Device Trigger');
                    break;
                case 'timeTrigger':
                    node = new TriggerNode('timeTrigger', 'Time Trigger');
                    break;
                case 'condition':
                    node = new ConditionNode();
                    break;
                case 'deviceAction':
                    node = new ActionNode('deviceAction', 'Device Action');
                    break;
                case 'notification':
                    node = new ActionNode('notification', 'Send Notification');
                    break;
                default:
                    console.error('Unknown node type:', type);
                    return;
            }

            await this.editor.addNode(node);
            await this.area.translate(node.id, { x, y });
            
            return node;
        } catch (error) {
            console.error('Error adding node:', error);
        }
    }

    async clearEditor(confirm = true) {
        if (confirm && !window.confirm('Clear all nodes?')) return;
        
        const nodes = [...this.editor.getNodes()];
        for (const node of nodes) {
            await this.editor.removeNode(node.id);
        }
    }

    zoomIn() {
        const zoom = this.area.area.transform.k * 1.2;
        this.area.area.zoom(zoom);
    }

    zoomOut() {
        const zoom = this.area.area.transform.k / 1.2;
        this.area.area.zoom(zoom);
    }

    async fitToView() {
        await AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }

    getFlowData() {
        const nodes = [];
        const connections = [];

        // Export nodes
        for (const node of this.editor.getNodes()) {
            const nodeData = {
                id: node.id,
                type: node.type || node.label.toLowerCase().replace(' ', ''),
                label: node.label,
                x: this.area.nodeViews.get(node.id)?.position.x || 0,
                y: this.area.nodeViews.get(node.id)?.position.y || 0,
                controls: {}
            };

            // Export control values
            for (const [key, control] of Object.entries(node.controls)) {
                nodeData.controls[key] = control.value || control.initial || '';
            }

            nodes.push(nodeData);
        }

        // Export connections
        for (const conn of this.editor.getConnections()) {
            connections.push({
                id: conn.id,
                source: conn.source,
                sourceOutput: conn.sourceOutput,
                target: conn.target,
                targetInput: conn.targetInput
            });
        }

        return { nodes, connections };
    }

    convertToAutomation() {
        const flowData = this.getFlowData();
        const triggers = [];
        const conditions = [];
        const actions = [];

        for (const node of flowData.nodes) {
            const controls = node.controls;

            if (node.type === 'deviceTrigger') {
                triggers.push({
                    type: 'device_state',
                    device_id: controls.device,
                    attribute: controls.attribute
                });
            } else if (node.type === 'timeTrigger') {
                triggers.push({
                    type: 'time',
                    time: controls.time
                });
            } else if (node.type === 'condition') {
                conditions.push({
                    type: 'device_state',
                    device_id: controls.device,
                    attribute: controls.attribute,
                    value: controls.value
                });
            } else if (node.type === 'deviceAction') {
                actions.push({
                    type: 'device_command',
                    device_id: controls.device,
                    command: controls.command
                });
            } else if (node.type === 'notification') {
                actions.push({
                    type: 'notification',
                    title: controls.title,
                    message: controls.message
                });
            }
        }

        return { triggers, conditions, actions, flow: flowData };
    }
}

// Create global instance
window.reteDesigner = new SimpleReteAutomationDesigner();
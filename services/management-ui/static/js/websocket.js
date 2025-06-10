// WebSocket Manager for real-time updates
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectTimer = null;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.subscriptions = new Set();
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Clear reconnect timer
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            // Resubscribe to topics
            this.subscriptions.forEach(topic => {
                this.subscribe(topic);
            });

            // Notify handlers
            this.emit('connected');
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.scheduleReconnect();
            this.emit('disconnected');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }

    handleMessage(message) {
        const { type, data } = message;

        switch (type) {
            case 'initial_data':
                this.handleInitialData(data);
                break;
            case 'device_update':
                this.emit('device_update', data);
                break;
            case 'event':
                this.emit('event', data.event);
                break;
            case 'command_sent':
                this.emit('command_sent', data);
                break;
            case 'error':
                this.emit('error', data);
                break;
            default:
                // Emit custom events
                this.emit(type, data);
        }
    }

    handleInitialData(data) {
        // Update UI with initial data
        if (data.devices) {
            this.emit('devices_loaded', data.devices);
        }
        if (data.automations) {
            this.emit('automations_loaded', data.automations);
        }
        if (data.scenes) {
            this.emit('scenes_loaded', data.scenes);
        }
    }

    subscribe(topic) {
        this.subscriptions.add(topic);
        if (this.isConnected) {
            this.send('subscribe', { topic });
        }
    }

    unsubscribe(topic) {
        this.subscriptions.delete(topic);
        if (this.isConnected) {
            this.send('unsubscribe', { topic });
        }
    }

    sendCommand(deviceId, command, data = {}) {
        this.send('command', {
            device_id: deviceId,
            command,
            data
        });
    }

    send(type, data = {}) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ type, ...data });
            this.ws.send(message);
        }
    }

    on(event, handler) {
        if (!this.messageHandlers.has(event)) {
            this.messageHandlers.set(event, []);
        }
        this.messageHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.messageHandlers.has(event)) {
            const handlers = this.messageHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.messageHandlers.has(event)) {
            this.messageHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in WebSocket event handler for ${event}:`, error);
                }
            });
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectInterval);
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('ws-status');
        const statusText = document.getElementById('ws-status-text');

        if (statusDot) {
            if (connected) {
                statusDot.classList.add('connected');
            } else {
                statusDot.classList.remove('connected');
            }
        }

        if (statusText) {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Create global WebSocket instance
window.wsManager = new WebSocketManager();
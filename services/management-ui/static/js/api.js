// API Client for Management UI
class APIClient {
    constructor(baseURL = '/api/v1') {
        this.baseURL = baseURL;
    }

    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'API request failed');
            }

            return result.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Device endpoints
    async getDevices() {
        return this.request('GET', '/devices');
    }

    async getDevice(id) {
        return this.request('GET', `/devices/${id}`);
    }

    async updateDevice(id, data) {
        return this.request('PUT', `/devices/${id}`, data);
    }

    async deleteDevice(id) {
        return this.request('DELETE', `/devices/${id}`);
    }

    async sendDeviceCommand(id, command, data = {}) {
        return this.request('POST', `/devices/${id}/command`, { command, data });
    }

    async getDeviceHistory(id) {
        return this.request('GET', `/devices/${id}/history`);
    }

    // Automation endpoints
    async getAutomations() {
        return this.request('GET', '/automations');
    }

    async createAutomation(data) {
        return this.request('POST', '/automations', data);
    }

    async getAutomation(id) {
        return this.request('GET', `/automations/${id}`);
    }

    async updateAutomation(id, data) {
        return this.request('PUT', `/automations/${id}`, data);
    }

    async deleteAutomation(id) {
        return this.request('DELETE', `/automations/${id}`);
    }

    async enableAutomation(id) {
        return this.request('POST', `/automations/${id}/enable`);
    }

    async disableAutomation(id) {
        return this.request('POST', `/automations/${id}/disable`);
    }

    async testAutomation(id, testData = {}) {
        return this.request('POST', `/automations/${id}/test`, { test_data: testData });
    }

    // Scene endpoints
    async getScenes() {
        return this.request('GET', '/scenes');
    }

    async createScene(data) {
        return this.request('POST', '/scenes', data);
    }

    async getScene(id) {
        return this.request('GET', `/scenes/${id}`);
    }

    async updateScene(id, data) {
        return this.request('PUT', `/scenes/${id}`, data);
    }

    async deleteScene(id) {
        return this.request('DELETE', `/scenes/${id}`);
    }

    async activateScene(id) {
        return this.request('POST', `/scenes/${id}/activate`);
    }

    // System endpoints
    async getSystemInfo() {
        return this.request('GET', '/system/info');
    }

    async getSystemHealth() {
        return this.request('GET', '/system/health');
    }

    async getConfig() {
        return this.request('GET', '/system/config');
    }

    async updateConfig(section, data) {
        return this.request('PUT', '/system/config', { section, data });
    }

    async getLogs(limit = 100) {
        return this.request('GET', `/system/logs?limit=${limit}`);
    }

    async getEvents(type = '') {
        const query = type ? `?type=${type}` : '';
        return this.request('GET', `/system/events${query}`);
    }

    // User/Auth endpoints
    async login(username, password) {
        return this.request('POST', '/auth/login', { username, password });
    }

    async logout() {
        return this.request('POST', '/auth/logout');
    }

    async getCurrentUser() {
        return this.request('GET', '/auth/user');
    }

    async getUsers() {
        return this.request('GET', '/users');
    }

    async createUser(data) {
        return this.request('POST', '/users', data);
    }

    async updateUser(id, data) {
        return this.request('PUT', `/users/${id}`, data);
    }

    async deleteUser(id) {
        return this.request('DELETE', `/users/${id}`);
    }

    // Dashboard endpoints
    async getDashboards() {
        return this.request('GET', '/dashboards');
    }

    async createDashboard(data) {
        return this.request('POST', '/dashboards', data);
    }

    async getDashboard(id) {
        return this.request('GET', `/dashboards/${id}`);
    }

    async updateDashboard(id, data) {
        return this.request('PUT', `/dashboards/${id}`, data);
    }

    async deleteDashboard(id) {
        return this.request('DELETE', `/dashboards/${id}`);
    }
}

// Export for use in other scripts
window.API = new APIClient();
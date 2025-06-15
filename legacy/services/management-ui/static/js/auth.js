// Authentication Module
class Auth {
    constructor() {
        this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        this.user = null;
        this.isAuthenticated = false;
    }

    async init() {
        // Check if we have a valid token
        if (this.token) {
            return await this.validateToken();
        } else {
            this.showLoginScreen();
            return false;
        }
    }

    async validateToken() {
        try {
            console.log('Validating token:', this.token);
            // Validate token with the server
            const response = await fetch('/api/v1/auth/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.user = result.data;
                    this.isAuthenticated = true;
                    this.setupAuthHeaders();
                    return true;
                }
            }
            
            // Token is invalid
            this.clearAuth();
            this.showLoginScreen();
            return false;
            
            /* Production code:
            const response = await fetch('/api/v1/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.isAuthenticated = true;
                this.setupAuthHeaders();
                return true;
            } else {
                this.clearAuth();
                this.showLoginScreen();
                return false;
            }
            */
        } catch (error) {
            console.error('Token validation failed:', error);
            this.clearAuth();
            this.showLoginScreen();
            return false;
        }
    }

    showLoginScreen() {
        document.body.innerHTML = `
            <div class="login-container">
                <div class="login-box">
                    <div class="login-header">
                        <h1>NATS Home Automation</h1>
                        <p>Please sign in to continue</p>
                    </div>
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" class="form-control" required 
                                   placeholder="Enter your username" autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" class="form-control" required 
                                   placeholder="Enter your password" autocomplete="current-password">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="remember-me">
                                Remember me
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </button>
                        <div id="login-error" class="login-error" style="display: none;"></div>
                    </form>
                    <div class="login-footer">
                        <p>Use your NATS credentials to login</p>
                        <small>Default users: home/changeme or admin/admin</small>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Focus username field
        document.getElementById('username').focus();
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        const errorDiv = document.getElementById('login-error');

        // Show loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        try {
            // Call the actual auth endpoint with NATS credentials
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token and user info
            this.token = data.token;
            this.user = data.user;
            this.isAuthenticated = true;

            // Store token
            if (rememberMe) {
                localStorage.setItem('auth_token', this.token);
            } else {
                sessionStorage.setItem('auth_token', this.token);
            }

            // Setup auth headers for API calls
            this.setupAuthHeaders();

            // Reload the page to show the main app
            window.location.reload();

            /* Production code would be:
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            this.token = data.token;
            this.user = data.user;
            this.isAuthenticated = true;

            if (rememberMe) {
                localStorage.setItem('auth_token', this.token);
            } else {
                sessionStorage.setItem('auth_token', this.token);
            }

            this.setupAuthHeaders();
            window.location.reload();
            */
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            
            // Shake the login box
            document.querySelector('.login-box').classList.add('shake');
            setTimeout(() => {
                document.querySelector('.login-box').classList.remove('shake');
            }, 500);

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    setupAuthHeaders() {
        // Override the API client's request method to include auth headers
        if (window.API) {
            const originalRequest = window.API.request.bind(window.API);
            window.API.request = async function(method, endpoint, data) {
                // Add auth header to options
                const options = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`
                    },
                };

                if (data && method !== 'GET') {
                    options.body = JSON.stringify(data);
                }

                try {
                    const response = await fetch(`${this.baseURL}${endpoint}`, options);
                    
                    // Check for 401 Unauthorized
                    if (response.status === 401) {
                        auth.handleUnauthorized();
                        throw new Error('Unauthorized');
                    }

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || 'API request failed');
                    }

                    return result.data;
                } catch (error) {
                    console.error('API Error:', error);
                    throw error;
                }
            };
        }
    }

    handleUnauthorized() {
        this.clearAuth();
        window.location.reload();
    }

    async logout() {
        try {
            // Call logout endpoint
            await fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.clearAuth();
        window.location.reload();
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
    }

    generateMockToken(username) {
        // Generate a mock JWT token for demo purposes
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: username,
            name: 'Administrator',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        }));
        const signature = btoa('mock-signature');
        return `${header}.${payload}.${signature}`;
    }

    getUser() {
        return this.user;
    }

    hasRole(role) {
        return this.user && this.user.role === role;
    }

    canAccess(resource) {
        // Implement role-based access control
        const permissions = {
            admin: ['devices', 'automations', 'scenes', 'events', 'monitoring', 'settings', 'users'],
            user: ['devices', 'automations', 'scenes', 'events', 'monitoring'],
            viewer: ['devices', 'events', 'monitoring']
        };

        const userRole = this.user?.role || 'viewer';
        return permissions[userRole]?.includes(resource) || false;
    }
}

// Create global auth instance
window.auth = new Auth();

// CSS for login page
if (!document.getElementById('auth-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-styles';
    style.textContent = `
        .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }

        .login-box {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            padding: 40px;
            width: 100%;
            max-width: 400px;
            transition: transform 0.3s ease;
        }

        .login-box.shake {
            animation: shake 0.5s ease;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h1 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .login-header p {
            color: #7f8c8d;
            font-size: 16px;
        }

        .login-form .form-group {
            margin-bottom: 20px;
        }

        .login-form label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }

        .login-form .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #dfe6e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .login-form .form-control:focus {
            outline: none;
            border-color: #667eea;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: normal;
        }

        .checkbox-label input[type="checkbox"] {
            margin-right: 8px;
        }

        .btn-block {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .login-error {
            margin-top: 20px;
            padding: 12px;
            background-color: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border-radius: 6px;
            text-align: center;
            font-size: 14px;
        }

        .login-footer {
            margin-top: 30px;
            text-align: center;
            color: #7f8c8d;
            font-size: 14px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
        }
    `;
    document.head.appendChild(style);
}
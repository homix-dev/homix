// Avatar Generator - Creates SVG avatars based on user names
class AvatarGenerator {
    constructor() {
        // Predefined color schemes for avatars
        this.colorSchemes = [
            { bg: '#667eea', text: '#ffffff' }, // Purple
            { bg: '#48bb78', text: '#ffffff' }, // Green
            { bg: '#ed8936', text: '#ffffff' }, // Orange
            { bg: '#4299e1', text: '#ffffff' }, // Blue
            { bg: '#ed64a6', text: '#ffffff' }, // Pink
            { bg: '#38b2ac', text: '#ffffff' }, // Teal
            { bg: '#f56565', text: '#ffffff' }, // Red
            { bg: '#a78bfa', text: '#ffffff' }, // Light Purple
            { bg: '#60a5fa', text: '#ffffff' }, // Light Blue
            { bg: '#34d399', text: '#ffffff' }  // Emerald
        ];
    }

    // Generate initials from name
    getInitials(name) {
        if (!name) return '?';
        
        const parts = name.trim().split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return '?';
        
        if (parts.length === 1) {
            // Single word - use first two letters
            return parts[0].substring(0, 2).toUpperCase();
        } else {
            // Multiple words - use first letter of first two words
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
    }

    // Generate a consistent color based on the name
    getColorScheme(name) {
        if (!name) return this.colorSchemes[0];
        
        // Simple hash function to get consistent color for same name
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const index = Math.abs(hash) % this.colorSchemes.length;
        return this.colorSchemes[index];
    }

    // Generate SVG avatar
    generateSVG(name, size = 40) {
        const initials = this.getInitials(name);
        const colorScheme = this.getColorScheme(name);
        
        const svg = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${colorScheme.bg}"/>
                <text x="${size/2}" y="${size/2}" 
                      font-family="Arial, sans-serif" 
                      font-size="${size * 0.4}" 
                      font-weight="600"
                      fill="${colorScheme.text}" 
                      text-anchor="middle" 
                      dy=".35em">
                    ${initials}
                </text>
            </svg>
        `;
        
        return svg.trim();
    }

    // Generate data URL for use in img src
    generateDataURL(name, size = 40) {
        const svg = this.generateSVG(name, size);
        const encoded = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${encoded}`;
    }

    // Create and return an img element with the avatar
    createAvatarElement(name, size = 40, className = '') {
        const img = document.createElement('img');
        img.src = this.generateDataURL(name, size);
        img.alt = `${name} avatar`;
        img.width = size;
        img.height = size;
        img.className = className;
        return img;
    }

    // Replace all avatar placeholders in the DOM
    replaceAvatarPlaceholders() {
        // Find all elements with data-avatar attribute
        const avatarElements = document.querySelectorAll('[data-avatar]');
        
        avatarElements.forEach(element => {
            const name = element.getAttribute('data-avatar');
            const size = parseInt(element.getAttribute('data-avatar-size') || '40');
            const className = element.className;
            
            if (element.tagName === 'IMG') {
                // If it's an img tag, update the src
                element.src = this.generateDataURL(name, size);
                element.onerror = null; // Remove error handler
            } else {
                // Otherwise, replace the element with an img
                const avatarImg = this.createAvatarElement(name, size, className);
                element.parentNode.replaceChild(avatarImg, element);
            }
        });
    }
}

// Create global instance
window.avatarGenerator = new AvatarGenerator();

// Auto-replace avatars when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.avatarGenerator.replaceAvatarPlaceholders();
    });
} else {
    window.avatarGenerator.replaceAvatarPlaceholders();
}
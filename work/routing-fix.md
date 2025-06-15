# Fixed: Installer Routing Issue

## Problem
When users ran `curl -sSL https://get.homix.dev | sh`, they were getting the main HTML page instead of the installer script.

## Solution
Added Next.js middleware to handle subdomain routing:

1. **get.homix.dev** → serves installer script at root
2. **app.homix.dev** → serves the app interface at root
3. **homix.dev** → serves the main landing page

## Implementation
- Created `middleware.ts` to detect subdomain and route accordingly
- When accessing `get.homix.dev/`, it now serves `/api/installer`
- When accessing `app.homix.dev/`, it serves `/app`

## Testing
After deployment completes (~1-2 minutes), test with:
```bash
# This should now work correctly
curl -sSL https://get.homix.dev | sh

# These also work
curl https://get.homix.dev/install.sh
curl https://get.homix.dev/
```

## Status
✅ Fix deployed to production
⏳ Waiting for CDN cache to clear (1-2 minutes)
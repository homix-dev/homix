# Homix Cloud Web Application

This is the cloud-based web application for Homix, providing:
- Marketing website (homix.dev)
- Installer endpoint (get.homix.dev)
- Cloud management UI (app.homix.dev)

## Architecture

Built with:
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **NATS.ws** - WebSocket connection to NATS
- **NextAuth** - Authentication
- **Vercel** - Hosting platform

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Deployment

### Vercel Setup

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link to Vercel project:
   ```bash
   vercel link
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

### Domain Configuration

Add these domains in Vercel:
- `homix.dev` - Main website
- `www.homix.dev` - Redirect to main
- `app.homix.dev` - Cloud UI
- `get.homix.dev` - Installer endpoint
- `docs.homix.dev` - Documentation (can point to GitBook/Docusaurus)

### Environment Variables

Set in Vercel dashboard:
- `NEXTAUTH_URL` - https://app.homix.dev
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `SYNADIA_CLOUD_URL` - Your Synadia Cloud URL
- `SYNADIA_CLOUD_CREDS` - Service account credentials

## API Endpoints

- `/api/installer` - Returns shell script for installation
- `/api/auth/*` - NextAuth endpoints
- `/api/homes` - List user's homes
- `/api/devices` - Device management
- `/api/automations` - Automation CRUD

## Project Structure

```
cloud/web/
├── pages/              # Next.js pages
│   ├── index.tsx      # Landing page
│   ├── app/           # Authenticated app
│   └── api/           # API routes
├── components/         # React components
├── lib/               # Utility functions
├── styles/            # Global styles
└── public/            # Static assets
```
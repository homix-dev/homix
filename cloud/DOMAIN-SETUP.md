# Homix Domain Setup Guide

## Overview

This guide helps you configure homix.dev with Vercel for the cloud application.

## Required DNS Records

### For Vercel

Add these records to your domain registrar:

```
# Main domain
homix.dev           A       76.76.21.21
homix.dev           AAAA    2606:4700:3000::ac43:b7c9

# Subdomains (CNAME to Vercel)
www.homix.dev       CNAME   cname.vercel-dns.com.
app.homix.dev       CNAME   cname.vercel-dns.com.
get.homix.dev       CNAME   cname.vercel-dns.com.
docs.homix.dev      CNAME   cname.vercel-dns.com.
```

## Vercel Configuration

### 1. Add Project to Vercel

```bash
cd cloud/web
vercel
```

Follow prompts to:
- Link to your Vercel account
- Create new project "homix-cloud"
- Deploy

### 2. Add Custom Domains

In Vercel Dashboard > Settings > Domains, add:
- `homix.dev`
- `www.homix.dev` (redirect to homix.dev)
- `app.homix.dev`
- `get.homix.dev`

### 3. Configure Redirects

Vercel will handle these automatically via vercel.json:
- `get.homix.dev/*` → `/api/installer`
- `www.homix.dev` → `homix.dev`

### 4. Environment Variables

Add in Vercel Dashboard > Settings > Environment Variables:

```env
# Production only
NODE_ENV=production
NEXTAUTH_URL=https://app.homix.dev

# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-here

# Synadia Cloud
SYNADIA_CLOUD_URL=tls://connect.ngs.global
SYNADIA_CLOUD_ACCOUNT=your-account-id

# Optional: Analytics
VERCEL_ANALYTICS_ID=your-analytics-id
```

## SSL Certificates

Vercel automatically provisions SSL certificates for all domains using Let's Encrypt.

## Testing

After DNS propagation (5-30 minutes):

```bash
# Test installer
curl -I https://get.homix.dev

# Test main site
curl -I https://homix.dev

# Test app
curl -I https://app.homix.dev
```

## Deployment

### Automatic (GitHub Integration)

1. Connect GitHub repo to Vercel
2. Every push to `main` auto-deploys

### Manual

```bash
cd cloud/web
vercel --prod
```

## Monitoring

- **Vercel Dashboard**: Monitor deployments, functions, analytics
- **Domain Health**: Use `dig` or online DNS checkers
- **SSL Status**: Check with SSL Labs

## Troubleshooting

### Domain Not Working
1. Check DNS propagation: `dig homix.dev`
2. Verify Vercel domain settings
3. Wait 24 hours for full propagation

### SSL Issues
- Vercel auto-renews certificates
- Force refresh: Remove and re-add domain

### 404 Errors
- Check vercel.json rewrites
- Verify file paths in pages/
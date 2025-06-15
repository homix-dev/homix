# Deploy Homix Cloud to Vercel

## Prerequisites
- Vercel account (free tier is sufficient)
- Node.js 18+ installed locally
- Access to homix.dev domain DNS settings

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Deploy the Application

Navigate to the cloud/web directory and deploy:
```bash
cd cloud/web
vercel
```

Follow the prompts:
- Link to existing project? **No** (first time)
- What's your project's name? **homix**
- In which directory is your code located? **./** 
- Want to override the settings? **No**

## Step 3: Configure Production Deployment
```bash
vercel --prod
```

Note the production URL (e.g., https://homix-xyz.vercel.app)

## Step 4: Add Custom Domains

### In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Domains"
3. Add the following domains:
   - `homix.dev` (apex domain)
   - `app.homix.dev` (application)
   - `get.homix.dev` (installer endpoint)

### DNS Configuration:
Add these records to your domain registrar:

#### For apex domain (homix.dev):
```
Type: A
Name: @
Value: 76.76.21.21
```

#### For subdomains:
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com

Type: CNAME  
Name: get
Value: cname.vercel-dns.com
```

## Step 5: Verify Deployment

Test the domains after DNS propagation (5-30 minutes):
```bash
# Check main site
curl -I https://homix.dev

# Check app
curl -I https://app.homix.dev

# Check installer endpoint
curl https://get.homix.dev/install.sh
```

## Step 6: Setup GitHub Integration (Optional)

For automatic deployments on push:

1. In Vercel dashboard, go to project settings
2. Navigate to "Git" 
3. Connect your GitHub repository
4. Select the `main` branch for production deployments
5. Set root directory to `cloud/web`

## Environment Variables (If Needed)

In Vercel project settings > Environment Variables:
- Add any required environment variables
- Currently, the app uses client-side NATS credentials, so no server-side env vars are needed

## Monitoring

- View deployment logs in Vercel dashboard
- Check Functions tab for API route analytics
- Monitor usage in Analytics tab

## Troubleshooting

### Domain not working:
- Check DNS propagation: `dig app.homix.dev`
- Verify DNS records in registrar
- Wait up to 48 hours for full propagation

### Build failures:
- Check build logs in Vercel dashboard
- Run `npm run build` locally to debug
- Ensure all dependencies are in package.json

### API routes not working:
- Check `/api` folder structure
- Verify vercel.json rewrites
- Test locally with `vercel dev`

## Next Steps

1. Monitor initial deployment
2. Set up error tracking (e.g., Sentry)
3. Configure preview deployments for PRs
4. Add custom headers/redirects as needed
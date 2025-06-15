# Homix Work Tracker

This folder contains TODO items and work-in-progress documentation for the Homix project.

## Current TODOs

### Immediate (This Week)
- [ ] Fix TypeScript build issues in cloud/web - **DONE** ✓
- [ ] Deploy cloud application to Vercel - See [deploy-to-vercel.md](./deploy-to-vercel.md)
- [ ] Configure custom domains (homix.dev, app.homix.dev, get.homix.dev)
- [ ] Update GitHub Actions workflow for automatic Vercel deployments
- [ ] Test end-to-end: edge server → Synadia Cloud → web app

### High Priority
- [ ] Add automation designer to cloud UI (port from management-ui)
- [ ] Create visual flow editor component
- [ ] Implement automation save/load via NATS KV
- [ ] Add real-time automation status monitoring
- [ ] Create scene management interface

### Medium Priority  
- [ ] Enhanced Device Controls
  - [ ] Light: brightness, color temperature
  - [ ] Thermostat: temperature setpoint, mode
  - [ ] Cover: position control
  - [ ] Media player: play/pause/volume
- [ ] User Experience
  - [ ] Create onboarding flow for new users
  - [ ] Add connection status indicators
  - [ ] Implement error boundaries and fallbacks
  - [ ] Add loading skeletons for better UX
- [ ] Edge Server Features
  - [ ] Auto-discovery of local devices (Zigbee, Z-Wave)
  - [ ] Local automation execution engine
  - [ ] Backup/restore functionality
  - [ ] Device pairing wizard

### Low Priority
- [ ] Testing & Quality
  - [ ] Add unit tests for cloud UI components
  - [ ] Integration tests for NATS connectivity
  - [ ] E2E tests with Playwright
  - [ ] Performance monitoring
- [ ] Documentation
  - [ ] Create developer documentation
  - [ ] API reference for NATS subjects
  - [ ] Device integration guide
  - [ ] Video tutorials
- [ ] Advanced Features
  - [ ] Implement NATS Auth Callout for better security
  - [ ] Add telemetry and analytics (privacy-first)
  - [ ] Multi-home support
  - [ ] User roles and permissions
  - [ ] Mobile app (React Native)

### Technical Debt
- [ ] Migrate from localStorage to IndexedDB for credentials
- [ ] Implement proper error handling in NATS client
- [ ] Add reconnection UI feedback
- [ ] Optimize bundle size (currently 141KB for /app)
- [ ] Add proper TypeScript types for device states
- [ ] Implement proper logging strategy

### Infrastructure
- [ ] Set up monitoring for Vercel deployment
- [ ] Configure CDN for static assets
- [ ] Add health check endpoints
- [ ] Set up error tracking (Sentry)
- [ ] Configure preview deployments for PRs

## In Progress
- [x] Fix TypeScript target from es5 to es2015 for build issues

## Completed
- [x] Create cloud application with Next.js
- [x] Implement NATS WebSocket connection with credentials
- [x] Build home and device monitoring interface
- [x] Create installer endpoint for edge server setup
- [x] Fix npm build issues (TypeScript configuration)

## Blocked/Waiting
- [ ] Domain DNS propagation for homix.dev
- [ ] Synadia Cloud account limits (check message/connection limits)

## Ideas/Research
- [ ] Explore WASM for local automation execution
- [ ] Research WebRTC for direct device communication
- [ ] Investigate PWA for offline support
- [ ] Look into Matter/Thread protocol support
- [ ] Consider GraphQL layer over NATS

## Notes
- Keep this folder for transient work items
- Move completed documentation to appropriate locations
- Delete obsolete TODO files when done
- Update status weekly
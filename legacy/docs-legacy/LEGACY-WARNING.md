# Legacy Documentation Notice

> ⚠️ **Important**: The documentation in this directory largely describes the **legacy local-first architecture**.
> 
> We are transitioning to a **cloud-first architecture** that is:
> - Simpler (one container instead of 5+)
> - More secure (per-device JWT credentials)
> - Easier to use (5-minute setup)
>
> **For the new approach, see:**
> - [Quick Start Guide](/QUICKSTART.md) - Get running in 5 minutes
> - [Refactor Plan](/REFACTOR-PLAN.md) - Understand the new architecture
> - [Cloud-First Status](/CLOUD-FIRST-STATUS.md) - Current progress

## What's Changing?

### Old Architecture (Legacy)
- Multiple Docker containers running locally
- Basic authentication (shared passwords)
- Complex configuration
- Local-only management

### New Architecture (Cloud-First)
- Single edge container at home
- JWT authentication per device
- Cloud-based management UI
- Automatic device discovery

## Should I Use Legacy or Cloud-First?

- **New users**: Start with cloud-first approach
- **Existing users**: Legacy setup continues to work, migration guide coming soon
- **Contributors**: Focus development on cloud-first architecture

## Migration Timeline

- **Now**: Both architectures supported
- **Q3 2024**: Cloud-first becomes default
- **Q4 2024**: Legacy marked as deprecated
- **Q1 2025**: Legacy moved to separate branch

For questions, join our Discord or open an issue.
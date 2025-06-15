# Quick Wins - Low Effort, High Impact

## 1. GitHub Actions - Vercel Auto-Deploy (30 min)
Update `.github/workflows/cloud-deployment.yml` to actually deploy instead of just building.

## 2. Add Home Name Configuration (1 hour)
- Add environment variable `HOMIX_HOME_NAME` to edge server
- Update home announcement to use configured name
- Add to install script prompts

## 3. Basic Device Templates (2 hours)
Create JSON templates in `edge/templates/` for common devices:
- Philips Hue lights
- TP-Link smart plugs
- Nest thermostats
- Generic MQTT devices

## 4. Connection Status Badge (30 min)
Add visual connection quality indicator in cloud UI:
- Green: Connected, low latency
- Yellow: Connected, high latency
- Red: Disconnected
- Show last seen timestamp

## 5. Export/Import Buttons (1 hour)
Add to cloud UI device list:
- Export devices to JSON
- Import devices from JSON
- Useful for backup/sharing

## 6. Docker Hub Publishing (30 min)
- Publish images to Docker Hub for easier access
- Update documentation to use `homix/edge:latest`

## 7. One-Line Installer (1 hour)
Improve the installer script:
```bash
curl -sSL https://get.homix.dev | sh
```
- Auto-detect architecture
- Install Docker if missing
- Interactive setup wizard

## 8. Basic Scenes (2 hours)
Simple scene management:
- Create scene from current device states
- Activate scene with single command
- List/delete scenes

## 9. Device Grouping (1 hour)
Add room/group support:
- Group devices by room
- Control all devices in group
- Filter UI by room

## 10. README Screenshots (30 min)
Add screenshots to README:
- Cloud UI dashboard
- Automation designer
- Device list
- Architecture diagram

## Implementation Order
1. Connection status badge (immediate visual feedback)
2. GitHub Actions fix (enables continuous deployment)
3. One-line installer (improves onboarding)
4. README screenshots (better first impression)
5. Export/import (user data safety)
6. Everything else

## Success Metrics
- Time from repo discovery to working setup < 5 minutes
- Clear visual feedback for system status
- Users can backup their configuration
- Automated deployment pipeline working
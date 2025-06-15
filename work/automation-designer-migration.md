# Automation Designer Migration Plan

## Overview
Port the visual automation designer from the local management-ui to the cloud web application.

## Source Files
- `/services/management-ui/static/js/simple-flow-designer.js` - Main designer implementation
- `/services/management-ui/static/css/styles.css` - Designer styles
- `/services/management-ui/static/js/app.js` - Integration code

## Migration Steps

### 1. Create React Component Structure
```
cloud/web/
├── components/
│   ├── automation/
│   │   ├── FlowDesigner.tsx
│   │   ├── NodePalette.tsx
│   │   ├── Canvas.tsx
│   │   ├── NodeEditor.tsx
│   │   └── types.ts
│   └── ...
```

### 2. Convert JavaScript to TypeScript
- Define interfaces for nodes, connections, automations
- Type all component props and state
- Add proper event handling types

### 3. Integrate with NATS
- Save automations to NATS KV bucket `automations`
- Subscribe to automation status updates
- Implement real-time execution feedback

### 4. Key Features to Preserve
- Drag and drop from component palette
- Node connection via ports
- Double-click to edit nodes
- Right-click context menu
- Canvas pan and zoom
- Validation before save

### 5. Enhancements for Cloud
- Multi-user collaboration indicators
- Version history
- Import/export automations
- Template library
- Undo/redo support

### 6. Component Categories to Migrate

#### Triggers
- Device State Changed
- NATS Event
- Time/Schedule
- Sunrise/Sunset
- State Changed

#### Actions  
- Control Device
- Publish NATS Event
- Update State
- Activate Scene
- Send Notification

#### Conditions
- Device State Is
- Time Between
- Day of Week
- Numeric Compare
- Sun Position

#### Logic
- AND/OR/NOT Gates
- Switch
- Counter
- Timer

#### State Management
- Get/Set State
- Watch State
- Compare State
- Increment State

### 7. Technical Considerations
- Use React DnD or native HTML5 drag/drop
- Canvas rendering: SVG vs HTML vs Canvas API
- State management: React Context vs Zustand
- Persistence: Auto-save vs manual save
- Performance: Virtual scrolling for large flows

### 8. Testing Strategy
- Unit tests for node logic
- Integration tests for NATS operations
- E2E tests for designer interactions
- Visual regression tests

### 9. Migration Priority
1. Basic canvas and node rendering
2. Drag and drop functionality
3. Node connections
4. Node editing
5. Save/load automations
6. Real-time status updates
7. Advanced features

### 10. Success Criteria
- All existing automation types supported
- Performance on par with original
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)
- No data loss during migration
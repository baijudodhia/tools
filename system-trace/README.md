# System Trace Telemetry Collection

A comprehensive client-side telemetry collection system implementing the FSD (Functional Specification Document) for device, browser, and runtime telemetry. **Excel-ready flat schema export** aligned with RBI / CERT-In audit requirements.

## Features

- **Static Telemetry**: Fixed context captured once per session (device, browser, display, APIs, storage, permission-aware capabilities)
- **Continuous Telemetry**: Runtime metrics sampled periodically (network, memory, performance, activity, battery)
- **Permission-Based Monitoring**: Camera, microphone, screen share, location, clipboard, and advanced device tracking (requires user consent)
- **Inferred Telemetry**: Derived signals (agent presence, session integrity, risk scores)
- **Excel-Ready Export**: Flat schema CSV export matching DATA_SCHEMA.md column headers
- **Metadata & Governance**: Session tracking, consent management, audit fields

## Files

### Core Modules
- `metadata.js` - Record & session metadata management
- `static-telemetry.js` - Static telemetry collection module
- `continuous-telemetry.js` - Continuous monitoring module
- `permission-telemetry.js` - Permission-based monitoring (camera, mic, screen share, location, clipboard)
- `inferred-telemetry.js` - Inferred telemetry generation
- `schema-exporter.js` - Excel-ready flat schema exporter
- `telemetry.js` - Main orchestrator class

### Extended Telemetry Modules
- `product-telemetry.js` - Product outcomes & engagement tracking
- `performance-telemetry.js` - Core Web Vitals & navigation timings
- `network-telemetry.js` - Network & resource timing details
- `reliability-telemetry.js` - JS errors, network failures, crashes
- `media-telemetry.js` - WebRTC stats & playback metrics
- `environment-telemetry.js` - Hardware acceleration, renderer path, OS details

### Documentation
- `index.html` - Demo page (zero CSS)
- `FSD.md` - Functional Specification Document
- `DATA_SCHEMA.md` - Excel column header schema
- `PIVOT_GUIDE.md` - Excel pivot table guide

## Usage

### Basic Usage

```javascript
// Create telemetry collector
const telemetry = new TelemetryCollector({
    continuousInterval: 5000, // Sample every 5 seconds
    autoStart: false
});

// Initialize (collects static telemetry)
await telemetry.initialize();

// Start continuous collection
telemetry.start();

// Get all telemetry
const allData = telemetry.getAllTelemetry();

// Stop collection
telemetry.stop();
```

### With Callbacks

```javascript
const telemetry = new TelemetryCollector();

telemetry.onSample((sample) => {
    console.log('New sample:', sample);
});

telemetry.onInferred((inferred) => {
    console.log('Inferred data:', inferred);
});

telemetry.onError((error) => {
    console.error('Error:', error);
});

await telemetry.initialize();
telemetry.start();
```

### Export Data

```javascript
// Export as JSON string
const json = telemetry.exportJSON();

// Export as CSV (Excel-ready, flat schema)
const csv = telemetry.exportToCSV();

// Export static row
const staticRow = telemetry.exportStaticRow();

// Export continuous rows
const continuousRows = telemetry.exportContinuousRows();

// Get column headers for Excel
const headers = telemetry.getColumnHeaders();
```

### Permission-Based Monitoring

```javascript
// Start camera monitoring (requires user permission)
await telemetry.startCameraMonitoring();

// Start microphone monitoring
await telemetry.startMicrophoneMonitoring();

// Start screen share monitoring
await telemetry.startScreenShareMonitoring();

// Start location monitoring
await telemetry.startLocationMonitoring();

// Stop monitoring
telemetry.stopCameraMonitoring();
telemetry.stopMicrophoneMonitoring();
```

### Metadata Management

```javascript
// Set user/agent IDs
telemetry.setUserId('user123');
telemetry.setAgentId('agent456');

// Update consent
telemetry.updateConsent('2.0', new Date().toISOString());
```

### Product & Engagement Tracking

```javascript
// Track feature usage
telemetry.trackFeature('file_upload', { file_type: 'pdf' });

// Track conversion events
telemetry.trackConversion('purchase_complete', 99.99);

// Get engagement metrics
const engagement = telemetry.productTelemetry.getEngagementSummary();
```

### Performance Monitoring

```javascript
// Core Web Vitals are automatically collected
// Get performance metrics
const perf = telemetry.performanceTelemetry.getMetrics();
// Returns: { LCP_ms, INP_ms, CLS, TTFB_ms, FCP_ms, etc. }

// Track app-specific timings
const startTime = performance.now();
// ... do something ...
telemetry.performanceTelemetry.trackAppTiming('api_call', startTime);
```

### Network Resource Timing

```javascript
// Automatically collects all resource timings
// Get resource timing summary
const network = telemetry.networkTelemetry.getSummary();
// Returns: avg_total_ms, by_type, by_protocol, by_cache_status
```

### Reliability & Error Tracking

```javascript
// Errors are automatically tracked
// Get error summary
const errors = telemetry.reliabilityTelemetry.getErrorSummary();

// Track network failures manually
telemetry.reliabilityTelemetry.trackNetworkFailure(
  'https://api.example.com/data',
  500,
  2, // retry count
  5000 // timeout ms
);
```

### Media/WebRTC Monitoring

```javascript
// Start WebRTC monitoring
const pc = new RTCPeerConnection();
telemetry.startWebRTCMonitoring(pc, 10000); // Collect every 10s

// Track video playback
const video = document.querySelector('video');
telemetry.trackPlayback(video, { drmUsed: true });
```

### Get Extended Telemetry

```javascript
// Get all telemetry including new modules
const allData = telemetry.getAllTelemetryExtended();
// Includes: product, performance, network, reliability, media, environment
```

## Demo

Open `index.html` in a web browser to see the telemetry collection in action. The demo includes:

- Initialize button to collect static telemetry
- Start/Stop buttons for continuous collection
- Real-time display of all telemetry data
- Export JSON functionality
- **Export CSV functionality** (Excel-ready, matches DATA_SCHEMA.md)

## Compliance

This implementation strictly adheres to:

- Browser security sandbox constraints
- User privacy standards
- RBI / CERT-In / ISO 27001 principles
- Permission-based data collection (camera, mic, location require explicit user consent)

**No access to:**
- Installed applications
- Browser extensions
- Running OS processes
- Background system activity
- Personal files or data
- MAC / IMEI / hardware serials

**Permission-Based Features:**
- Camera, microphone, screen share, location monitoring only collects data when user grants permission
- All permission-based telemetry clearly marked in schema
- Consent version and timestamp tracked for audit compliance

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome/Edge (full memory metrics support)
- Firefox (most features)
- Safari (most features)
- Mobile browsers (with limitations)

## License

See project license file.

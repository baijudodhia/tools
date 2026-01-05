# System Trace Telemetry Collection

A comprehensive client-side telemetry collection system implementing the FSD (Functional Specification Document) for device, browser, and runtime telemetry.

## Features

- **Static Telemetry**: Fixed context captured once per session (device, browser, display, APIs, storage)
- **Continuous Telemetry**: Runtime metrics sampled periodically (network, memory, performance, activity, battery)
- **Inferred Telemetry**: Derived signals computed from collected data (device inference, network quality, behavioral patterns)

## Files

- `static-telemetry.js` - Static telemetry collection module
- `continuous-telemetry.js` - Continuous monitoring module
- `inferred-telemetry.js` - Inferred telemetry generation
- `telemetry.js` - Main orchestrator class
- `index.html` - Demo page (zero CSS)
- `FSD.md` - Functional Specification Document

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

// Or get structured data
const data = telemetry.getAllTelemetry();
```

## Demo

Open `index.html` in a web browser to see the telemetry collection in action. The demo includes:

- Initialize button to collect static telemetry
- Start/Stop buttons for continuous collection
- Real-time display of all telemetry data
- Export functionality to download JSON

## Compliance

This implementation strictly adheres to:

- Browser security sandbox constraints
- User privacy standards
- RBI / CERT-In / ISO 27001 principles

**No access to:**
- Installed applications
- Browser extensions
- Running OS processes
- Background system activity
- Personal files or data
- MAC / IMEI / hardware serials

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome/Edge (full memory metrics support)
- Firefox (most features)
- Safari (most features)
- Mobile browsers (with limitations)

## License

See project license file.

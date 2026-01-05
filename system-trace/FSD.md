Below is a **Technical Functional Specification (FSD)** written in **audit-grade, regulator-ready language**, consolidating **all collectable client-side telemetry** into **Static, Continuous, and Inferred** categories.

This document is suitable to be:

* Attached to **RBI / CERT-In audits**
* Reviewed by **Security, Compliance, Legal**
* Used as a **basis for implementation**

---

# Technical Functional Specification (FSD)

## Client-Side Device, Browser & Runtime Telemetry Collection

---

## 1. Purpose & Scope

The purpose of this module is to collect **permission-less, browser-exposed client environment telemetry** to support:

* Security monitoring
* Fraud and anomaly detection
* Session integrity verification
* Operational diagnostics
* Regulatory audit traceability

The solution strictly adheres to:

* Browser security sandbox constraints
* User privacy standards
* RBI / CERT-In / ISO 27001 principles

No personal files, installed software, background processes, or system identifiers are accessed.

---

## 2. Classification of Telemetry

Telemetry is classified into:

1. **Static Telemetry** – Fixed context captured once per session
2. **Continuous Telemetry** – Runtime metrics sampled periodically
3. **Inferred Telemetry** – Derived signals computed from collected data

---

## 3. Static Telemetry (Fixed / Snapshot)

### 3.1 Device & Hardware Context (Indirect)

| Attribute             | Description                         |
| --------------------- | ----------------------------------- |
| CPU Logical Cores     | Number of logical processors        |
| Device Memory         | Approximate RAM (GB)                |
| GPU Vendor & Renderer | WebGL-exposed graphics info         |
| Device Class          | Mobile / Tablet / Desktop (derived) |
| Platform              | OS platform identifier              |
| Architecture          | CPU architecture (where available)  |
| Touch Support         | Touch input capability              |
| Max Touch Points      | Maximum simultaneous touch inputs   |

---

### 3.2 Display & Visual Capabilities

| Attribute             | Description              |
| --------------------- | ------------------------ |
| Screen Resolution     | Total display resolution |
| Available Screen Size | Usable resolution        |
| Pixel Ratio           | Device pixel density     |
| Color Depth           | Bits per pixel           |
| Color Gamut           | sRGB / P3                |
| HDR Support           | HDR capability           |
| Orientation Support   | Landscape / Portrait     |

---

### 3.3 Browser & Runtime Identity

| Attribute            | Description                   |
| -------------------- | ----------------------------- |
| User-Agent           | Browser identification string |
| UA-CH (Client Hints) | Structured browser metadata   |
| Browser Version      | Major / minor version         |
| Rendering Engine     | Blink / Gecko / WebKit        |
| JavaScript Engine    | Inferred                      |
| Language             | Primary locale                |
| Languages            | Supported locales             |
| Timezone             | System timezone offset        |
| Do-Not-Track         | DNT preference                |
| PDF Viewer           | Built-in PDF support          |

---

### 3.4 Web API Capability Surface

> Used as a **version proxy and environment fingerprint**

| API                | Availability                |
| ------------------ | --------------------------- |
| WebGL / WebGL2     | Graphics support            |
| WebGPU             | Advanced GPU compute        |
| WebRTC             | Real-time communication     |
| WebAssembly        | High-performance runtime    |
| Service Workers    | Background execution        |
| Push API           | Push messaging              |
| Background Sync    | Deferred tasks              |
| Media Devices      | Camera / Mic availability   |
| Clipboard API      | Clipboard access            |
| WebAuthn           | Strong authentication       |
| Payment Request    | Payment flows               |
| File System Access | Local file picker           |
| OffscreenCanvas    | Background rendering        |
| AudioContext       | Audio processing            |
| IndexedDB          | Structured storage          |
| SharedArrayBuffer  | High-performance memory     |
| Intl APIs          | Locale, calendar, numbering |

---

### 3.5 Storage & Security Context

| Attribute              | Description                 |
| ---------------------- | --------------------------- |
| Cookies Enabled        | Cookie support              |
| Local Storage          | localStorage availability   |
| Session Storage        | sessionStorage availability |
| IndexedDB              | IndexedDB availability      |
| Secure Context         | HTTPS & security isolation  |
| Cross-Origin Isolation | COOP/COEP enabled           |
| HTTPS Status           | Encrypted transport         |

---

## 4. Continuous Telemetry (Interval-Based)

> Sampled periodically (e.g., every 5–10 seconds)

---

### 4.1 Network Runtime Metrics

| Metric                    | Description         |
| ------------------------- | ------------------- |
| Online / Offline State    | Connectivity status |
| Effective Connection Type | 2G / 3G / 4G / WiFi |
| RTT (Latency)             | Round-trip time     |
| Downlink Speed            | Approx Mbps         |
| Save-Data Flag            | Data-saving mode    |
| Network Change Frequency  | Stability indicator |

---

### 4.2 Browser Memory Metrics *(Chromium-based)*

| Metric               | Description           |
| -------------------- | --------------------- |
| JS Heap Limit        | Max allowed heap      |
| Total Heap Allocated | Allocated memory      |
| Used Heap            | Active JS memory      |
| Heap Growth Rate     | Memory pressure trend |

> Note: Reflects **browser JS memory only**, not OS RAM.

---

### 4.3 Performance & Load Indicators

| Metric               | Description          |
| -------------------- | -------------------- |
| Event Loop Delay     | JS responsiveness    |
| Long Tasks Count     | CPU pressure proxy   |
| Frame Drops          | Rendering stress     |
| Timer Drift          | Throttling detection |
| Responsiveness Score | UI health indicator  |

---

### 4.4 Page & User Activity

| Metric          | Description       |
| --------------- | ----------------- |
| Tab Visibility  | Visible / Hidden  |
| Focus State     | Active / Inactive |
| Foreground Time | Active engagement |
| Background Time | Inactive duration |
| Idle Duration   | User inactivity   |

---

### 4.5 Battery Metrics *(If Supported)*

| Metric         | Description               |
| -------------- | ------------------------- |
| Battery Level  | Charge percentage         |
| Charging State | Charging / Discharging    |
| Drain Rate     | Battery consumption trend |

---

## 5. Inferred Telemetry (Derived Signals)

> Derived without collecting additional data

---

### 5.1 Device & Environment Inference

* Device performance tier (Low / Medium / High)
* Mobile vs desktop confidence
* GPU capability class
* Memory pressure likelihood
* VM / sandbox probability (heuristic)

---

### 5.2 Network & Session Quality Inference

* Network stability score
* Latency variance (jitter)
* Session reliability index
* Corporate / mobile network likelihood

---

### 5.3 Behavioral & Security Inference

* Active vs passive user behavior
* Abnormal focus loss patterns
* Heavy extension likelihood (indirect)
* Throttling / power-save detection
* Device fingerprint consistency score
* Capability mismatch anomalies

---

## 6. Explicit Technical Limitations (Declared)

The system **does not** and **cannot** access:

* Installed applications
* Browser extensions
* Running OS processes
* Background system activity
* Per-tab memory of other tabs
* OS CPU usage
* File system or personal data
* MAC / IMEI / hardware serials

These limitations are enforced by browser security models.

---

## 7. Compliance & Audit Statement (Use As-Is)

> “The solution collects **static device context**, **continuous runtime telemetry**, and **derived inference signals** strictly limited to browser-exposed information.
> No access is made to installed software, browser extensions, background processes, or system-level identifiers, ensuring compliance with RBI, CERT-In, ISO 27001, and privacy principles.”

---

If you want, next I can:

* Convert this into **BRD / PRD**
* Map each item to **RBI / CERT-In clauses**
* Provide **data schemas & retention strategy**
* Provide **final hardened JS implementation**

Just confirm the next step.

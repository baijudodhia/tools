Below is a **single, flat, Excel-ready data schema** designed so that:

* **Each row = one record** (static snapshot or continuous sample)
* You can **paste directly into Excel**
* Business, Tech, Risk teams can **analyze without joins**
* Works for **time-series, averages, pivots, dashboards**

This is a **canonical schema** you can adopt as-is.

---

# 📊 CLIENT TELEMETRY – EXCEL-READY DATA SCHEMA

## 1️⃣ Record Metadata (MANDATORY)

| Column Name  | Type          | Description                               |
| ------------ | ------------- | ----------------------------------------- |
| record_id    | String        | UUID for this record                      |
| session_id   | String        | Logical session identifier                |
| user_id      | String        | Internal user/customer ID (if applicable) |
| record_type  | Enum          | STATIC / CONTINUOUS                       |
| collected_at | ISO Timestamp | When record was captured                  |
| page_url     | String        | Page where capture happened               |
| app_version  | String        | Frontend application version              |

---

## 2️⃣ Static – Device & Hardware

| Column Name      | Type    | Description                      |
| ---------------- | ------- | -------------------------------- |
| platform         | String  | OS platform (Win32, Linux, etc.) |
| architecture     | String  | CPU architecture                 |
| cpu_cores        | Number  | Logical CPU cores                |
| device_memory_gb | Number  | Approx RAM in GB                 |
| gpu_vendor       | String  | GPU vendor (WebGL)               |
| gpu_renderer     | String  | GPU renderer                     |
| device_class     | Enum    | Mobile / Desktop / Tablet        |
| touch_supported  | Boolean | Touch capability                 |
| max_touch_points | Number  | Max touch inputs                 |

---

## 3️⃣ Static – Display & Visual

| Column Name   | Type    | Description        |
| ------------- | ------- | ------------------ |
| screen_width  | Number  | Screen width       |
| screen_height | Number  | Screen height      |
| avail_width   | Number  | Available width    |
| avail_height  | Number  | Available height   |
| pixel_ratio   | Number  | Device pixel ratio |
| color_depth   | Number  | Color depth (bits) |
| color_gamut   | Enum    | sRGB / P3          |
| hdr_supported | Boolean | HDR support        |

---

## 4️⃣ Static – Browser & Locale

| Column Name     | Type    | Description               |
| --------------- | ------- | ------------------------- |
| browser_name    | String  | Browser family            |
| browser_version | String  | Browser version           |
| user_agent      | String  | Full UA string            |
| ua_arch         | String  | UA-CH architecture        |
| language        | String  | Primary language          |
| languages       | String  | Comma-separated languages |
| timezone_offset | Number  | Minutes offset            |
| do_not_track    | Boolean | DNT flag                  |
| pdf_viewer      | Boolean | Built-in PDF viewer       |

---

## 5️⃣ Static – API Capability Surface (BOOLEAN FLAGS)

*(These are extremely valuable for analytics & fingerprinting)*

| Column Name          | Type    | Description        |
| -------------------- | ------- | ------------------ |
| api_webgl2           | Boolean | WebGL2 supported   |
| api_webgpu           | Boolean | WebGPU supported   |
| api_webrtc           | Boolean | WebRTC supported   |
| api_wasm             | Boolean | WebAssembly        |
| api_service_worker   | Boolean | Service Worker     |
| api_push             | Boolean | Push API           |
| api_bg_sync          | Boolean | Background Sync    |
| api_clipboard        | Boolean | Clipboard API      |
| api_media_devices    | Boolean | Camera/Mic APIs    |
| api_webauthn         | Boolean | WebAuthn           |
| api_payment          | Boolean | Payment Request    |
| api_fs_access        | Boolean | File System Access |
| api_offscreen_canvas | Boolean | OffscreenCanvas    |
| api_audio_context    | Boolean | AudioContext       |
| api_indexeddb        | Boolean | IndexedDB          |

---

## 6️⃣ Static – Storage & Security

| Column Name           | Type    | Description       |
| --------------------- | ------- | ----------------- |
| cookies_enabled       | Boolean | Cookies enabled   |
| local_storage         | Boolean | localStorage      |
| session_storage       | Boolean | sessionStorage    |
| indexeddb             | Boolean | IndexedDB         |
| https                 | Boolean | HTTPS             |
| secure_context        | Boolean | Secure context    |
| cross_origin_isolated | Boolean | COOP/COEP enabled |

---

## 7️⃣ Continuous – Network Metrics

*(New row every interval)*

| Column Name          | Type    | Description                 |
| -------------------- | ------- | --------------------------- |
| online               | Boolean | Online state                |
| effective_connection | String  | 2g / 3g / 4g / wifi         |
| rtt_ms               | Number  | Round-trip time             |
| downlink_mbps        | Number  | Downlink speed              |
| save_data            | Boolean | Save-Data enabled           |
| network_change_count | Number  | Changes since session start |

---

## 8️⃣ Continuous – Memory (Browser JS Only)

| Column Name      | Type   | Description                |
| ---------------- | ------ | -------------------------- |
| js_heap_limit_mb | Number | Heap limit                 |
| js_heap_total_mb | Number | Total allocated            |
| js_heap_used_mb  | Number | Used heap                  |
| heap_growth_mb   | Number | Delta from previous sample |

---

## 9️⃣ Continuous – Performance & Activity

| Column Name         | Type    | Description                  |
| ------------------- | ------- | ---------------------------- |
| event_loop_delay_ms | Number  | Avg loop delay               |
| long_task_count     | Number  | Long tasks since last sample |
| frame_drop_estimate | Number  | Rendering stress proxy       |
| tab_visibility      | Enum    | visible / hidden             |
| has_focus           | Boolean | Window focus                 |
| idle_time_sec       | Number  | Idle duration                |

---

## 🔟 Continuous – Battery (If Available)

| Column Name        | Type    | Description    |
| ------------------ | ------- | -------------- |
| battery_level      | Number  | 0–1            |
| charging           | Boolean | Charging state |
| battery_drain_rate | Number  | % per minute   |

---

## 1️⃣1️⃣ Inferred / Derived Metrics

| Column Name                | Type    | Description         |
| -------------------------- | ------- | ------------------- |
| device_tier                | Enum    | Low / Medium / High |
| network_stability_score    | Number  | 0–100               |
| latency_jitter_ms          | Number  | RTT variance        |
| memory_pressure            | Enum    | Low / Medium / High |
| background_load_likelihood | Enum    | Low / Medium / High |
| throttling_detected        | Boolean | Timer / rAF drift   |
| fingerprint_hash           | String  | Stable non-PII hash |
| risk_score                 | Number  | Composite score     |

---

# 📈 HOW THIS WORKS IN EXCEL

### Typical Analytics You Can Do Immediately

* Pivot by **browser_version vs failures**
* Avg **RTT vs conversion**
* Device tier vs success rate
* Network stability vs drop-off
* Memory pressure vs crashes
* Risk score distribution

### Recommended Excel Usage

* **Sheet 1:** Static records
* **Sheet 2:** Continuous samples
* Use `session_id` to correlate
* Use PivotTables + Charts

---

## Final Compliance Statement (Internal Use)

> “All columns are derived exclusively from browser-exposed runtime information and computed inferences. No personal files, installed applications, browser extensions, or system-level identifiers are collected.”

---

### If you want next

* Excel **template file (.xlsx)**
* Sample **dummy dataset**
* Recommended **pivot dashboards**
* **Backend table DDL**
* Data **retention & masking strategy**

Tell me what you want next.

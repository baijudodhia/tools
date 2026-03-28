(() => {
  const sampleConfig = {
    websocket: {
      BASE_URL: "wss://ekyc.shinhanbank.in",
      PATH: "/sessionid/socket.io/",
      socketConfig: {
        iceServers: [
          {
            urls: ["stun:ekyc.shinhanbank.in:49155"],
          },
          {
            credential: "taipvp",
            urls: ["turn:ekyc.shinhanbank.in:49155"],
            username: "taipvu",
          },
        ],
        iceTransportPolicy: "all",
      },
    },
  };

  /** @type {HTMLTextAreaElement | null} */
  const configInputEl = document.getElementById("config-input");
  const configErrorEl = document.getElementById("config-error");
  const loadSampleBtn = document.getElementById("load-sample-btn");
  const clearConfigBtn = document.getElementById("clear-config-btn");
  const validateConfigBtn = document.getElementById("validate-config-btn");
  const runAllTestsBtn = document.getElementById("run-all-tests-btn");
  const runWsTestBtn = document.getElementById("run-ws-test-btn");
  const runIceTestBtn = document.getElementById("run-ice-test-btn");
  const clearLogBtn = document.getElementById("clear-log-btn");

  const configValidityPill = document.getElementById("config-validity-pill");
  const wsEndpointEl = document.getElementById("ws-endpoint");
  const iceServersEl = document.getElementById("ice-servers");
  const wsStatusPill = document.getElementById("ws-status-pill");
  const iceStatusPill = document.getElementById("ice-status-pill");
  const logOutputEl = document.getElementById("log-output");
  const mediaStatusPill = document.getElementById("media-status-pill");
  const mediaDecisionEl = document.getElementById("media-decision");
  const vpnStatusPill = document.getElementById("vpn-status-pill");
  const vpnDecisionEl = document.getElementById("vpn-decision");
  const iceMetricsEl = document.getElementById("ice-metrics");

  /** @type {RTCPeerConnection | null} */
  let currentPeer = null;
  /** @type {WebSocket | null} */
  let currentWebSocket = null;

  function setPill(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    const base =
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium";
    let toneClasses =
      "border-slate-800 bg-slate-900 text-slate-400";

    if (tone === "ok") {
      toneClasses = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    } else if (tone === "warn") {
      toneClasses = "border-amber-500/40 bg-amber-500/10 text-amber-300";
    } else if (tone === "err") {
      toneClasses = "border-rose-500/40 bg-rose-500/10 text-rose-300";
    } else if (tone === "info") {
      toneClasses = "border-sky-500/40 bg-sky-500/10 text-sky-300";
    }

    el.className = `${base} ${toneClasses}`;
  }

  function appendLog(message, level, tag) {
    if (!logOutputEl) return;
    const now = new Date();
    const ts = now.toISOString().split("T")[1].replace("Z", "");
    const row = document.createElement("div");
    const base = "text-[11px] leading-snug";
    let tone = "text-slate-200";
    if (level === "error") tone = "text-rose-300";
    else if (level === "warn") tone = "text-amber-300";
    else if (level === "success") tone = "text-emerald-300";
    else if (level === "debug") tone = "text-slate-400";

    row.className = `${base} ${tone}`;
    const tagPart = tag ? ` [${tag}]` : "";
    row.textContent = `[${ts}]${tagPart} ${message}`;

    if (!logOutputEl.dataset.initialized) {
      logOutputEl.innerHTML = "";
      logOutputEl.dataset.initialized = "true";
    }

    logOutputEl.appendChild(row);
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
  }

  function wsCloseCodeDescription(code) {
    switch (code) {
      case 1000:
        return "Normal closure";
      case 1001:
        return "Going away (server down / browser nav)";
      case 1002:
        return "Protocol error";
      case 1003:
        return "Unsupported data";
      case 1005:
        return "No status received (local)";
      case 1006:
        return "Abnormal closure (network / handshake failure)";
      case 1007:
        return "Invalid frame payload data";
      case 1008:
        return "Policy violation";
      case 1009:
        return "Message too big";
      case 1010:
        return "Missing required extensions";
      case 1011:
        return "Internal error on server";
      case 1012:
        return "Service restart";
      case 1013:
        return "Try again later";
      case 1015:
        return "TLS handshake failure";
      default:
        return "Unknown / custom code";
    }
  }

  function parseConfigFromInput() {
    if (!configInputEl) return null;
    const raw = configInputEl.value.trim();
    if (!raw) {
      configErrorEl.textContent = "Config is required.";
      setPill(configValidityPill, "Invalid JSON", "err");
      return null;
    }
    try {
      const json = JSON.parse(raw);
      if (!json.websocket) {
        throw new Error('Missing root "websocket" key.');
      }
      const ws = json.websocket;
      if (!ws.BASE_URL || typeof ws.BASE_URL !== "string") {
        throw new Error('Missing or invalid "websocket.BASE_URL".');
      }
      if (!ws.PATH || typeof ws.PATH !== "string") {
        throw new Error('Missing or invalid "websocket.PATH".');
      }
      if (!ws.socketConfig || typeof ws.socketConfig !== "object") {
        throw new Error('Missing or invalid "websocket.socketConfig".');
      }

      configErrorEl.textContent = "";
      setPill(configValidityPill, "Valid config", "ok");

      const baseUrl = ws.BASE_URL.replace(/\/+$/, "");
      const path =
        ws.PATH.startsWith("/") || ws.PATH.startsWith("?")
          ? ws.PATH
          : `/${ws.PATH}`;
      const endpoint = `${baseUrl}${path}`;
      wsEndpointEl.textContent = endpoint;

      const iceServers =
        (ws.socketConfig && ws.socketConfig.iceServers) || [];
      if (iceServers && iceServers.length > 0) {
        iceServersEl.textContent = JSON.stringify(
          iceServers,
          null,
          2
        );
      } else {
        iceServersEl.textContent = "(no iceServers configured)";
      }

      appendLog("Config parsed successfully.", "success", "CFG");
      return json;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Invalid JSON.";
      configErrorEl.textContent = msg;
      setPill(configValidityPill, "Invalid config", "err");
      appendLog(`Config parse error: ${msg}`, "error", "CFG");
      return null;
    }
  }

  function loadSample() {
    if (!configInputEl) return;
    configInputEl.value = JSON.stringify(sampleConfig, null, 2);
    configErrorEl.textContent = "";
    setPill(configValidityPill, "Not validated", undefined);
    wsEndpointEl.textContent = "-";
    iceServersEl.textContent = "-";
    appendLog("Sample config loaded.", "info", "CFG");
  }

  function clearConfig() {
    if (!configInputEl) return;
    configInputEl.value = "";
    configErrorEl.textContent = "";
    setPill(configValidityPill, "Not validated", undefined);
    wsEndpointEl.textContent = "-";
    iceServersEl.textContent = "-";
    appendLog("Config cleared.", "info", "CFG");
  }

  function clearLog() {
    if (!logOutputEl) return;
    logOutputEl.innerHTML =
      '<div class="text-slate-500 text-[11px]">Log cleared.</div>';
    delete logOutputEl.dataset.initialized;
  }

  function maybeCloseExistingSockets() {
    if (currentWebSocket) {
      try {
        currentWebSocket.close();
      } catch {
        // ignore
      }
      currentWebSocket = null;
    }
    if (currentPeer) {
      try {
        currentPeer.close();
      } catch {
        // ignore
      }
      currentPeer = null;
    }
  }

  function runWebSocketTest(config) {
    if (!config || !config.websocket) return;
    maybeCloseExistingSockets();

    const wsCfg = config.websocket;
    const baseUrl = wsCfg.BASE_URL.replace(/\/+$/, "");
    const path =
      wsCfg.PATH.startsWith("/") || wsCfg.PATH.startsWith("?")
        ? wsCfg.PATH
        : `/${wsCfg.PATH}`;
    const endpoint = `${baseUrl}${path}`;

    setPill(wsStatusPill, "Connecting…", "info");
    appendLog(`Connecting to ${endpoint}`, "info", "WS");

    let ws;
    try {
      ws = new WebSocket(endpoint);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to open WebSocket.";
      appendLog(`Constructor failed: ${msg}`, "error", "WS");
      setPill(wsStatusPill, "Failed", "err");
      return;
    }

    currentWebSocket = ws;

    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        appendLog(
          `Connection timed out after ${timeoutMs}ms (state=${ws.readyState}).`,
          "warn",
          "WS"
        );
        setPill(wsStatusPill, "Timeout", "warn");
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    }, timeoutMs);

    ws.onopen = () => {
      clearTimeout(timeoutId);
      appendLog("Connection opened.", "success", "WS");
      setPill(wsStatusPill, "Open", "ok");
    };

    ws.onclose = (evt) => {
      clearTimeout(timeoutId);
      const code = evt.code;
      const reason = evt.reason || "no reason";
      const desc = wsCloseCodeDescription(code);
      appendLog(
        `Closed (code=${code} → ${desc}, reason="${reason}", wasClean=${evt.wasClean}).`,
        "warn",
        "WS"
      );
      if (wsStatusPill.textContent !== "Open") {
        setPill(wsStatusPill, "Closed", "warn");
      } else {
        setPill(wsStatusPill, "Closed", "info");
      }
    };

    ws.onerror = () => {
      clearTimeout(timeoutId);
      appendLog(
        `Error event (state=${ws.readyState}). Check network / TLS / protocol.`,
        "error",
        "WS"
      );
      setPill(wsStatusPill, "Error", "err");
    };

    ws.onmessage = (evt) => {
      // Only log the first few bytes to avoid flooding.
      let preview = "";
      if (typeof evt.data === "string") {
        preview =
          evt.data.length > 120
            ? `${evt.data.slice(0, 120)}…`
            : evt.data;
      } else {
        preview = "[binary message]";
      }
      appendLog(
        `Message received: ${preview}`,
        "debug",
        "WS"
      );
    };
  }

  async function runIceTest(config) {
    if (!config || !config.websocket) return;
    maybeCloseExistingSockets();

    const rtcConfig = config.websocket.socketConfig || {};
    const stats = { total: 0, host: 0, srflx: 0, relay: 0, tcp: 0, udp: 0 };
    let noOfSrflx = 0;
    let iceCandidateDetected = 0;
    const uniqueIpList = [];
    const rawCandidates = [];

    setPill(iceStatusPill, "Starting…", "info");
    setPill(mediaStatusPill, "Idle", undefined);
    setPill(vpnStatusPill, "Idle", undefined);
    if (mediaDecisionEl) {
      mediaDecisionEl.textContent =
        "Waiting for ICE candidates to compute Media server Connection outcome.";
    }
    if (vpnDecisionEl) {
      vpnDecisionEl.textContent =
        "Waiting for ICE candidates to compute VPN-style decision.";
    }
    if (iceMetricsEl) {
      iceMetricsEl.textContent =
        "Collecting candidates… metrics will appear here once gathering completes.";
    }

    appendLog(
      `Creating RTCPeerConnection with config ${JSON.stringify(
        rtcConfig
      )}`,
      "debug",
      "ICE"
    );

    let pc;
    try {
      pc = new RTCPeerConnection(rtcConfig);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create RTCPeerConnection.";
      appendLog(`Error creating RTCPeerConnection: ${msg}`, "error", "ICE");
      setPill(iceStatusPill, "Failed", "err");
      setPill(mediaStatusPill, "Error", "err");
      setPill(vpnStatusPill, "Error", "err");
      return;
    }

    currentPeer = pc;

    try {
      pc.createDataChannel("test");
    } catch {
      // data channel creation is optional for this test
    }

    pc.onicecandidate = (evt) => {
      if (!evt.candidate) {
        appendLog("Candidate gathering completed.", "info", "ICE");

        if (iceMetricsEl) {
          const metricsPayload = {
            stats,
            noOfSrflx,
            iceCandidateDetected,
            uniqueIpList,
          };
          iceMetricsEl.textContent = JSON.stringify(
            metricsPayload,
            null,
            2
          );
        }

        const vpnMsg =
          noOfSrflx > 1 || noOfSrflx === 0
            ? `VPN Detected (noOfSrflx=${noOfSrflx} → reject in app).`
            : `VPN Not Detected (noOfSrflx=${noOfSrflx} → resolve in app).`;
        appendLog(vpnMsg, "info", "ICE");
        if (vpnDecisionEl) {
          vpnDecisionEl.textContent = vpnMsg;
        }
        setPill(
          vpnStatusPill,
          noOfSrflx > 1 || noOfSrflx === 0 ? "VPN Detected" : "VPN Not Detected",
          noOfSrflx > 1 || noOfSrflx === 0 ? "warn" : "ok"
        );

        const mediaMsg =
          iceCandidateDetected <= 0
            ? `Media server Connection = Failed (iceCandidateDetected=${iceCandidateDetected} → "ICE Candidate Detectection Failed" in app).`
            : `Media server Connection = Success (iceCandidateDetected=${iceCandidateDetected} → "ICE Candidate Detectection Success" in app).`;
        appendLog(mediaMsg, "info", "ICE");
        if (mediaDecisionEl) {
          mediaDecisionEl.textContent = mediaMsg;
        }
        setPill(
          mediaStatusPill,
          iceCandidateDetected <= 0 ? "Failed" : "Success",
          iceCandidateDetected <= 0 ? "err" : "ok"
        );

        appendLog(
          `Summary: total=${stats.total}, host=${stats.host}, srflx=${stats.srflx}, relay=${stats.relay}, udp=${stats.udp}, tcp=${stats.tcp}`,
          "info",
          "ICE"
        );
        return;
      }
      const candStr = evt.candidate.candidate || "";
      const parts = candStr.split(" ");
      let protocol = parts[2] || "?";
      let addr = parts[4] || "?";
      let port = parts[5] || "?";
      const typIndex = parts.indexOf("typ");
      let cType = typIndex !== -1 ? parts[typIndex + 1] : "?";

      if (!uniqueIpList.find((i) => i.address === addr && i.type === cType)) {
        uniqueIpList.push({ address: addr, type: cType });
      }

      stats.total += 1;
      if (cType === "host") stats.host += 1;
      else if (cType === "srflx") stats.srflx += 1;
      else if (cType === "relay") stats.relay += 1;
      if (protocol.toLowerCase() === "udp") stats.udp += 1;
      if (protocol.toLowerCase() === "tcp") stats.tcp += 1;

      if (cType === "srflx") {
        noOfSrflx += 1;
      }
      if (cType === "srflx" || cType === "relay") {
        iceCandidateDetected += 1;
      }

      rawCandidates.push({
        index: stats.total,
        type: cType,
        protocol,
        address: addr,
        port,
      });

      appendLog(
        `Candidate #${stats.total}: type=${cType}, protocol=${protocol}, addr=${addr}, port=${port}`,
        "debug",
        "ICE"
      );
    };

    pc.onicegatheringstatechange = () => {
      appendLog(
        `Gathering state -> ${pc.iceGatheringState}`,
        "info",
        "ICE"
      );
      if (pc.iceGatheringState === "complete") {
        setPill(iceStatusPill, "Gathering complete", "ok");
      } else if (pc.iceGatheringState === "gathering") {
        setPill(iceStatusPill, "Gathering…", "info");
      } else {
        setPill(iceStatusPill, "New", "info");
      }
    };

    pc.oniceconnectionstatechange = () => {
      appendLog(
        `Connection state -> ${pc.iceConnectionState}`,
        "info",
        "ICE"
      );
    };

    pc.onconnectionstatechange = () => {
      appendLog(
        `Overall connection state -> ${pc.connectionState}`,
        "info",
        "ICE"
      );
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      appendLog("Local offer created and set.", "success", "ICE");
      setPill(iceStatusPill, "Gathering…", "info");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create/set local offer.";
      appendLog(`Error during offer creation: ${msg}`, "error", "ICE");
      setPill(iceStatusPill, "Failed", "err");
      return;
    }

    const timeoutMs = 15000;
    setTimeout(() => {
      if (pc === currentPeer) {
        appendLog(
          `Closing test peer connection after ${timeoutMs}ms (gatheringState=${pc.iceGatheringState}).`,
          "debug",
          "ICE"
        );
        try {
          pc.close();
        } catch {
          // ignore
        }
        currentPeer = null;
      }
    }, timeoutMs);
  }

  // Wire up events
  loadSampleBtn?.addEventListener("click", loadSample);
  clearConfigBtn?.addEventListener("click", clearConfig);
  clearLogBtn?.addEventListener("click", clearLog);

  validateConfigBtn?.addEventListener("click", () => {
    parseConfigFromInput();
  });

  runAllTestsBtn?.addEventListener("click", () => {
    const cfg = parseConfigFromInput();
    if (!cfg) return;
    const ua = navigator.userAgent || "unknown";
    appendLog(
      `=== New test run (UA="${ua}") ===`,
      "info",
      "RUN"
    );
    runWebSocketTest(cfg);
    runIceTest(cfg);
  });

  runWsTestBtn?.addEventListener("click", () => {
    const cfg = parseConfigFromInput();
    if (!cfg) return;
    runWebSocketTest(cfg);
  });

  runIceTestBtn?.addEventListener("click", () => {
    const cfg = parseConfigFromInput();
    if (!cfg) return;
    runIceTest(cfg);
  });
})();


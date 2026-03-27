const els = {
  uploadPage: document.getElementById("uploadPage"),
  loadingPage: document.getElementById("loadingPage"),
  reportPage: document.getElementById("reportPage"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  fileMeta: document.getElementById("fileMeta"),
  uploadError: document.getElementById("uploadError"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  stageText: document.getElementById("stageText"),
  liveRequests: document.getElementById("liveRequests"),
  liveErrors: document.getElementById("liveErrors"),
  liveStage: document.getElementById("liveStage"),
  cancelBtn: document.getElementById("cancelBtn"),
  resetBtn: document.getElementById("resetBtn"),
  themeToggle: document.getElementById("themeToggle"),
  summaryGrid: document.getElementById("summaryGrid"),
  searchInput: document.getElementById("searchInput"),
  typeFilter: document.getElementById("typeFilter"),
  statusFilter: document.getElementById("statusFilter"),
  tableHeader: document.getElementById("tableHeader"),
  virtualScroller: document.getElementById("virtualScroller"),
  optimizationList: document.getElementById("optimizationList"),
  errorList: document.getElementById("errorList"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
};

let worker = null;
let analysisResult = null;
let charts = {};
let filteredRows = [];
let sortState = { key: "time", dir: "desc" };
const ROW_HEIGHT = 36;

const tableColumns = [
  { key: "index", label: "#", span: "col-span-1" },
  { key: "method", label: "Method", span: "col-span-1" },
  { key: "status", label: "Status", span: "col-span-1" },
  { key: "type", label: "Type", span: "col-span-1" },
  { key: "time", label: "Time (ms)", span: "col-span-1" },
  { key: "size", label: "Size (KB)", span: "col-span-1" },
  { key: "domain", label: "Domain", span: "col-span-2" },
  { key: "url", label: "URL", span: "col-span-4" },
];

const workerCode = `
let canceled = false;
let activeReader = null;

self.onmessage = async (event) => {
  const { type, file } = event.data || {};
  if (type === "cancel") {
    canceled = true;
    if (activeReader) {
      try { await activeReader.cancel(); } catch {}
    }
    return;
  }
  if (type !== "analyze" || !file) return;

  canceled = false;
  try {
    await analyzeFile(file);
  } catch (error) {
    postMessage({ type: "error", message: error?.message || "Unknown error" });
  }
};

function safeNum(v) {
  return Number.isFinite(v) ? v : 0;
}

function getEntryType(entry) {
  const mime = (entry?.response?.content?.mimeType || "").toLowerCase();
  const url = entry?.request?.url || "";
  if (mime.includes("javascript") || /\\\\.m?js(\\\\?|$)/i.test(url)) return "JS";
  if (mime.includes("css") || /\\\\.css(\\\\?|$)/i.test(url)) return "CSS";
  if (mime.startsWith("image/")) return "Image";
  const method = (entry?.request?.method || "").toUpperCase();
  if (method === "OPTIONS") return "Preflight";
  if (mime.includes("json") || mime.includes("xml") || mime.includes("text/plain")) return "XHR/Fetch";
  if (mime.includes("html")) return "Document";
  return "Other";
}

function domainFromUrl(url) {
  try { return new URL(url).hostname || "unknown"; } catch { return "unknown"; }
}

function normalizeTiming(v) {
  return v > 0 ? v : 0;
}

async function analyzeFile(file) {
  if (!file.name.toLowerCase().endsWith(".har") && !file.name.toLowerCase().endsWith(".json")) {
    throw new Error("Only .har files are supported");
  }

  postMessage({ type: "stage", stage: "Parsing HAR" });

  const summary = {
    totalRequests: 0,
    totalTransferredSize: 0,
    totalPageLoadTime: 0,
    domains: new Map(),
    failedRequests: 0,
    statusDistribution: new Map(),
    typeDistribution: new Map(),
    domainFailures: new Map(),
    timings: { dns: 0, connect: 0, ssl: 0, ttfb: 0, download: 0 },
    duplicateMap: new Map(),
    uncachedCount: 0,
    largeAssets: [],
    thirdPartyImpact: new Map(),
    blockedOrTimeout: 0,
  };

  const rows = [];
  const slowest = [];
  const largest = [];
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = 0;
  let parseErrors = 0;
  let parseChecks = { hasLog: false, hasEntries: false };

  const stream = file.stream();
  const reader = stream.getReader();
  activeReader = reader;
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let state = 0;
  let keyBuffer = "";
  let entriesArrayFound = false;
  let insideEntries = false;
  let braces = 0;
  let inString = false;
  let escaped = false;
  let entryBuffer = "";
  let currentObjStarted = false;
  let prevProgressEmit = 0;

  while (true) {
    if (canceled) {
      postMessage({ type: "canceled" });
      return;
    }
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    const chunk = decoder.decode(value, { stream: true });

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];

      if (!parseChecks.hasLog) {
        keyBuffer += ch;
        if (keyBuffer.length > 2000) keyBuffer = keyBuffer.slice(-2000);
        if (keyBuffer.includes('"log"')) parseChecks.hasLog = true;
      }
      if (!parseChecks.hasEntries) {
        keyBuffer += ch;
        if (keyBuffer.length > 2000) keyBuffer = keyBuffer.slice(-2000);
        if (keyBuffer.includes('"entries"')) parseChecks.hasEntries = true;
      }

      if (!insideEntries) {
        if (state === 0) {
          if (ch === '"') { state = 1; keyBuffer = ""; }
        } else if (state === 1) {
          if (ch === '"' && keyBuffer === "entries") {
            state = 2;
          } else if (ch === '"') {
            state = 0;
          } else {
            keyBuffer += ch;
          }
        } else if (state === 2) {
          if (ch === "[") {
            entriesArrayFound = true;
            insideEntries = true;
            state = 0;
          }
        }
        continue;
      }

      if (!currentObjStarted) {
        if (ch === "{") {
          currentObjStarted = true;
          braces = 1;
          entryBuffer = "{";
          inString = false;
          escaped = false;
        } else if (ch === "]") {
          insideEntries = false;
          break;
        }
        continue;
      }

      entryBuffer += ch;
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
      } else {
        if (ch === '"') inString = true;
        else if (ch === "{") braces++;
        else if (ch === "}") braces--;
      }

      if (braces === 0) {
        try {
          const entry = JSON.parse(entryBuffer);
          processEntry(entry, summary, rows, slowest, largest, (timing) => {
            if (timing.start < minStart) minStart = timing.start;
            if (timing.end > maxEnd) maxEnd = timing.end;
          });
        } catch {
          parseErrors++;
        }
        currentObjStarted = false;
        entryBuffer = "";
      }
    }

    const progress = Math.min(99, Math.floor((bytesRead / file.size) * 100));
    if (progress - prevProgressEmit >= 1) {
      prevProgressEmit = progress;
      postMessage({
        type: "progress",
        stage: "Parsing HAR",
        progress,
        requestsParsed: summary.totalRequests,
        errors: parseErrors,
      });
    }
  }

  activeReader = null;

  if (!parseChecks.hasLog || !parseChecks.hasEntries || !entriesArrayFound) {
    throw new Error("Invalid HAR format: expected log.entries array");
  }
  if (summary.totalRequests === 0) {
    throw new Error("No entries found in HAR");
  }

  postMessage({
    type: "progress",
    stage: "Aggregating metrics",
    progress: 99,
    requestsParsed: summary.totalRequests,
    errors: parseErrors,
  });

  summary.totalPageLoadTime = maxEnd > minStart && Number.isFinite(minStart) ? maxEnd - minStart : 0;

  const domainCounts = Array.from(summary.domains.entries()).sort((a, b) => b[1] - a[1]);
  const statusDistribution = Array.from(summary.statusDistribution.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  const typeDistribution = Array.from(summary.typeDistribution.entries()).sort((a, b) => b[1] - a[1]);

  const duplicates = [];
  for (const [url, count] of summary.duplicateMap.entries()) {
    if (count > 1) duplicates.push({ url, count });
  }
  duplicates.sort((a, b) => b.count - a.count);

  const thirdParty = Array.from(summary.thirdPartyImpact.entries()).sort((a, b) => b[1] - a[1]);
  const domainFailures = Array.from(summary.domainFailures.entries()).sort((a, b) => b[1] - a[1]);
  slowest.sort((a, b) => b.time - a.time);
  largest.sort((a, b) => b.size - a.size);
  summary.largeAssets.sort((a, b) => b.size - a.size);

  postMessage({
    type: "complete",
    data: {
      summary: {
        totalRequests: summary.totalRequests,
        totalTransferredSize: summary.totalTransferredSize,
        totalPageLoadTime: summary.totalPageLoadTime,
        numberOfDomains: summary.domains.size,
        failedRequests: summary.failedRequests,
        parseErrors,
      },
      performance: {
        slowest: slowest.slice(0, 25),
        largest: largest.slice(0, 25),
        timings: summary.timings,
        waterfallRange: { minStart, maxEnd },
      },
      network: {
        byDomain: domainCounts.slice(0, 30),
        byType: typeDistribution,
        statusDistribution,
      },
      optimization: {
        duplicates: duplicates.slice(0, 50),
        uncachedResources: summary.uncachedCount,
        largeAssets: summary.largeAssets.slice(0, 50),
        thirdPartyImpact: thirdParty.slice(0, 20),
      },
      errors: {
        byDomain: domainFailures.slice(0, 50),
        blockedOrTimeout: summary.blockedOrTimeout,
        parseErrors,
      },
      rows,
    },
  });
}

function processEntry(entry, summary, rows, slowest, largest, timingBoundsFn) {
  summary.totalRequests++;
  const request = entry?.request || {};
  const response = entry?.response || {};
  const timings = entry?.timings || {};
  const time = safeNum(entry?.time);
  const url = request?.url || "";
  const method = request?.method || "GET";
  const status = safeNum(response?.status);
  const size = Math.max(0, safeNum(response?.bodySize)) || Math.max(0, safeNum(response?.content?.size));
  const transferred = Math.max(0, safeNum(response?._transferSize)) || Math.max(0, safeNum(response?.headersSize) + size);
  const domain = domainFromUrl(url);
  const type = getEntryType(entry);
  const startedDateTime = entry?.startedDateTime ? Date.parse(entry.startedDateTime) : NaN;
  const start = Number.isFinite(startedDateTime) ? startedDateTime : 0;
  const end = start + time;

  summary.totalTransferredSize += transferred;
  summary.domains.set(domain, (summary.domains.get(domain) || 0) + 1);
  if (status >= 400) {
    summary.failedRequests++;
    summary.domainFailures.set(domain, (summary.domainFailures.get(domain) || 0) + 1);
  }
  summary.statusDistribution.set(String(status || 0), (summary.statusDistribution.get(String(status || 0)) || 0) + 1);
  summary.typeDistribution.set(type, (summary.typeDistribution.get(type) || 0) + 1);
  summary.duplicateMap.set(url, (summary.duplicateMap.get(url) || 0) + 1);
  summary.thirdPartyImpact.set(domain, (summary.thirdPartyImpact.get(domain) || 0) + time);

  const dns = normalizeTiming(safeNum(timings?.dns));
  const connect = normalizeTiming(safeNum(timings?.connect));
  const ssl = normalizeTiming(safeNum(timings?.ssl));
  const wait = normalizeTiming(safeNum(timings?.wait));
  const receive = normalizeTiming(safeNum(timings?.receive));
  const blocked = normalizeTiming(safeNum(timings?.blocked));

  summary.timings.dns += dns;
  summary.timings.connect += connect;
  summary.timings.ssl += ssl;
  summary.timings.ttfb += wait;
  summary.timings.download += receive;
  if (blocked > 1000 || time > 30000) summary.blockedOrTimeout++;

  const cacheHeaders = response?.headers || [];
  const hasCache = cacheHeaders.some((h) => {
    const n = (h?.name || "").toLowerCase();
    return n === "cache-control" || n === "etag" || n === "expires";
  });
  if (!hasCache) summary.uncachedCount++;

  if ((type === "JS" || type === "CSS") && size > 250 * 1024) {
    summary.largeAssets.push({ url, type, size });
  }

  if (time > 0) {
    slowest.push({ url, domain, time, status, type });
    if (slowest.length > 800) slowest.sort((a, b) => b.time - a.time), slowest.length = 400;
  }
  if (size > 0) {
    largest.push({ url, domain, size, status, type });
    if (largest.length > 800) largest.sort((a, b) => b.size - a.size), largest.length = 400;
  }

  rows.push({
    index: summary.totalRequests,
    method,
    status,
    type,
    time,
    sizeKB: +(size / 1024).toFixed(2),
    size,
    domain,
    url,
    start,
    end,
  });
  timingBoundsFn({ start, end });
}
`;

function createWorker() {
  if (worker) worker.terminate();
  const blob = new Blob([workerCode], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = onWorkerMessage;
}

function formatBytes(v) {
  if (!Number.isFinite(v) || v <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = v;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

function formatMs(v) {
  if (!Number.isFinite(v)) return "0 ms";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
}

function setPage(page) {
  els.uploadPage.classList.toggle("hidden", page !== "upload");
  els.loadingPage.classList.toggle("hidden", page !== "loading");
  els.reportPage.classList.toggle("hidden", page !== "report");
}

function showUploadError(msg) {
  els.uploadError.textContent = msg;
  els.uploadError.classList.remove("hidden");
}

function clearUploadError() {
  els.uploadError.classList.add("hidden");
  els.uploadError.textContent = "";
}

function onFileSelected(file) {
  clearUploadError();
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".har") && !file.name.toLowerCase().endsWith(".json")) {
    showUploadError("Only .har files are accepted.");
    return;
  }

  els.fileMeta.classList.remove("hidden");
  els.fileMeta.innerHTML = `
    <div class="text-sm">
      <p><span class="text-slate-400">Name:</span> ${escapeHtml(file.name)}</p>
      <p><span class="text-slate-400">Size:</span> ${formatBytes(file.size)}</p>
    </div>
    <button id="startBtn" class="mt-3 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-sm">Start Analysis</button>
  `;

  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", () => startAnalysis(file), { once: true });
}

function startAnalysis(file) {
  createWorker();
  setPage("loading");
  updateProgressUI(0, "Parsing HAR", 0, 0);
  worker.postMessage({ type: "analyze", file });
}

function updateProgressUI(progress, stage, requestsParsed, errors) {
  els.progressBar.style.width = `${progress}%`;
  els.progressText.textContent = `${progress}%`;
  els.stageText.textContent = stage;
  els.liveStage.textContent = stage;
  els.liveRequests.textContent = requestsParsed.toLocaleString();
  els.liveErrors.textContent = errors.toLocaleString();
}

function onWorkerMessage(event) {
  const msg = event.data || {};
  if (msg.type === "progress") {
    updateProgressUI(msg.progress || 0, msg.stage || "Parsing HAR", msg.requestsParsed || 0, msg.errors || 0);
    return;
  }
  if (msg.type === "stage") {
    updateProgressUI(parseInt(els.progressText.textContent, 10) || 0, msg.stage || "Parsing HAR", Number(els.liveRequests.textContent.replaceAll(",", "")), Number(els.liveErrors.textContent.replaceAll(",", "")));
    return;
  }
  if (msg.type === "error") {
    setPage("upload");
    showUploadError(msg.message || "Failed to process HAR file.");
    if (worker) worker.terminate();
    return;
  }
  if (msg.type === "canceled") {
    setPage("upload");
    showUploadError("Analysis canceled.");
    if (worker) worker.terminate();
    return;
  }
  if (msg.type === "complete") {
    analysisResult = msg.data;
    updateProgressUI(100, "Completed", analysisResult.summary.totalRequests, analysisResult.summary.parseErrors);
    renderReport();
    setPage("report");
    if (worker) worker.terminate();
  }
}

function renderReport() {
  renderSummary();
  renderCharts();
  renderInsights();
  setupTableControls();
  applyFiltersAndRenderTable();
}

function renderSummary() {
  const s = analysisResult.summary;
  const cards = [
    ["Total Requests", s.totalRequests.toLocaleString()],
    ["Transferred Size", formatBytes(s.totalTransferredSize)],
    ["Page Load Window", formatMs(s.totalPageLoadTime)],
    ["Domains", s.numberOfDomains.toLocaleString()],
    ["Failed Requests", s.failedRequests.toLocaleString()],
  ];
  els.summaryGrid.innerHTML = cards
    .map(
      ([k, v]) => `
      <div class="rounded-lg bg-slate-900 border border-slate-800 p-3">
        <p class="text-xs text-slate-400">${k}</p>
        <p class="text-lg font-semibold">${v}</p>
      </div>`
    )
    .join("");
}

function destroyCharts() {
  for (const key of Object.keys(charts)) {
    charts[key].destroy();
  }
  charts = {};
}

function renderCharts() {
  destroyCharts();
  const domainData = analysisResult.network.byDomain.slice(0, 10);
  const typeData = analysisResult.network.byType;
  const slowData = analysisResult.performance.slowest.slice(0, 10);
  const timing = analysisResult.performance.timings;

  charts.domains = new Chart(document.getElementById("domainsChart"), {
    type: "bar",
    data: {
      labels: domainData.map((d) => d[0]),
      datasets: [{ label: "Requests", data: domainData.map((d) => d[1]), backgroundColor: "#06b6d4" }],
    },
    options: baseChartOptions("Top Domains"),
  });

  charts.types = new Chart(document.getElementById("typesChart"), {
    type: "pie",
    data: {
      labels: typeData.map((d) => d[0]),
      datasets: [{ data: typeData.map((d) => d[1]), backgroundColor: ["#22d3ee", "#818cf8", "#f59e0b", "#34d399", "#fb7185", "#94a3b8"] }],
    },
    options: baseChartOptions("Type Distribution"),
  });

  charts.slowest = new Chart(document.getElementById("slowestChart"), {
    type: "bar",
    data: {
      labels: slowData.map((d) => shortText(d.url, 40)),
      datasets: [{ label: "Time (ms)", data: slowData.map((d) => Math.round(d.time)), backgroundColor: "#f97316" }],
    },
    options: baseChartOptions("Slowest Requests", true),
  });

  charts.timings = new Chart(document.getElementById("timingsChart"), {
    type: "bar",
    data: {
      labels: ["DNS", "Connect", "SSL", "TTFB", "Download"],
      datasets: [{
        label: "Total Time (ms)",
        data: [timing.dns, timing.connect, timing.ssl, timing.ttfb, timing.download].map((n) => Math.round(n)),
        backgroundColor: ["#38bdf8", "#60a5fa", "#a78bfa", "#2dd4bf", "#fb7185"],
      }],
    },
    options: baseChartOptions("Time Distribution"),
  });
}

function baseChartOptions(title, horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    plugins: {
      title: { display: true, text: title, color: "#cbd5e1" },
      legend: { labels: { color: "#cbd5e1" } },
    },
    scales: horizontal ? {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
    } : {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.15)" } },
    },
  };
}

function renderInsights() {
  const opt = analysisResult.optimization;
  const err = analysisResult.errors;
  const topDup = opt.duplicates.slice(0, 5);
  const largeAssets = opt.largeAssets.slice(0, 5);
  const thirdParty = opt.thirdPartyImpact.slice(0, 5);
  const failedByDomain = err.byDomain.slice(0, 8);

  const optItems = [
    `Duplicate requests: <strong>${opt.duplicates.length.toLocaleString()}</strong> unique URLs repeated`,
    `Uncached resources: <strong>${opt.uncachedResources.toLocaleString()}</strong>`,
    `Large JS/CSS assets: <strong>${opt.largeAssets.length.toLocaleString()}</strong>`,
  ];
  if (topDup[0]) optItems.push(`Top duplicate: <span class="mono">${escapeHtml(shortText(topDup[0].url, 80))}</span> (${topDup[0].count}x)`);
  if (largeAssets[0]) optItems.push(`Largest JS/CSS: <span class="mono">${escapeHtml(shortText(largeAssets[0].url, 80))}</span> (${formatBytes(largeAssets[0].size)})`);
  if (thirdParty[0]) optItems.push(`Highest third-party time impact: <strong>${escapeHtml(thirdParty[0][0])}</strong> (${formatMs(thirdParty[0][1])})`);
  els.optimizationList.innerHTML = optItems.map((i) => `<li>• ${i}</li>`).join("");

  const errItems = [
    `Failed requests: <strong>${analysisResult.summary.failedRequests.toLocaleString()}</strong>`,
    `Blocked/timeout signals: <strong>${err.blockedOrTimeout.toLocaleString()}</strong>`,
    `Parse errors: <strong>${err.parseErrors.toLocaleString()}</strong>`,
  ];
  failedByDomain.forEach(([domain, count]) => errItems.push(`${escapeHtml(domain)}: ${count}`));
  els.errorList.innerHTML = errItems.map((i) => `<li>• ${i}</li>`).join("");
}

function setupTableControls() {
  const types = analysisResult.network.byType.map((t) => t[0]);
  els.typeFilter.innerHTML = `<option value="">All Types</option>${types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}`;

  els.tableHeader.innerHTML = tableColumns
    .map((c) => `<div data-key="${c.key}" class="${c.span} header-cell">${c.label}</div>`)
    .join("");
}

function applyFiltersAndRenderTable() {
  const q = els.searchInput.value.trim().toLowerCase();
  const type = els.typeFilter.value;
  const statusFilter = els.statusFilter.value;
  const rows = analysisResult.rows;

  filteredRows = rows.filter((r) => {
    if (type && r.type !== type) return false;
    if (statusFilter === "ok" && r.status >= 400) return false;
    if (statusFilter === "fail" && r.status < 400) return false;
    if (q && !(r.url.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q))) return false;
    return true;
  });

  const dir = sortState.dir === "asc" ? 1 : -1;
  const k = sortState.key;
  filteredRows.sort((a, b) => {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  renderVirtualTable();
}

function renderVirtualTable() {
  const container = els.virtualScroller;
  container.innerHTML = "";

  const totalHeight = filteredRows.length * ROW_HEIGHT;
  const spacer = document.createElement("div");
  spacer.style.height = totalHeight + "px";
  spacer.style.position = "relative";
  container.appendChild(spacer);

  const viewportRows = Math.ceil(container.clientHeight / ROW_HEIGHT) + 12;

  const paint = () => {
    const top = container.scrollTop;
    const start = Math.max(0, Math.floor(top / ROW_HEIGHT) - 6);
    const end = Math.min(filteredRows.length, start + viewportRows);

    while (spacer.firstChild) spacer.removeChild(spacer.firstChild);
    for (let i = start; i < end; i++) {
      const row = filteredRows[i];
      const rowEl = document.createElement("div");
      rowEl.className = "row absolute left-0 right-0";
      rowEl.style.top = i * ROW_HEIGHT + "px";
      rowEl.innerHTML = `
        <div class="cell col-span-1">${row.index}</div>
        <div class="cell col-span-1">${escapeHtml(row.method)}</div>
        <div class="cell col-span-1 ${row.status >= 400 ? "text-red-400" : "text-emerald-400"}">${row.status}</div>
        <div class="cell col-span-1">${escapeHtml(row.type)}</div>
        <div class="cell col-span-1">${Math.round(row.time)}</div>
        <div class="cell col-span-1">${row.sizeKB}</div>
        <div class="cell col-span-2">${escapeHtml(row.domain)}</div>
        <div class="cell col-span-4 mono">${escapeHtml(row.url)}</div>
      `;
      spacer.appendChild(rowEl);
    }
  };

  paint();
  container.onscroll = paint;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(s, max) {
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  if (!analysisResult) return;
  downloadFile("har-analysis-report.json", JSON.stringify(analysisResult, null, 2), "application/json");
}

function exportCsv() {
  if (!analysisResult) return;
  const rows = analysisResult.rows;
  const headers = ["index", "method", "status", "type", "time", "sizeKB", "domain", "url"];
  const csv = [headers.join(",")];
  for (const r of rows) {
    const line = headers
      .map((h) => {
        const value = String(r[h] ?? "");
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return '"' + value.replaceAll('"', '""') + '"';
        }
        return value;
      })
      .join(",");
    csv.push(line);
  }
  downloadFile("har-analysis-requests.csv", csv.join("\n"), "text/csv");
}

function resetApp() {
  analysisResult = null;
  filteredRows = [];
  destroyCharts();
  if (worker) worker.terminate();
  clearUploadError();
  els.fileMeta.classList.add("hidden");
  els.fileMeta.innerHTML = "";
  els.fileInput.value = "";
  setPage("upload");
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  root.classList.toggle("dark", !isDark);
  root.classList.toggle("light", isDark);
  try {
    localStorage.setItem("har_theme", isDark ? "light" : "dark");
  } catch {}
}

function initTheme() {
  let theme = "dark";
  try {
    theme = localStorage.getItem("har_theme") || "dark";
  } catch {}
  document.documentElement.classList.toggle("dark", theme !== "light");
  document.documentElement.classList.toggle("light", theme === "light");
}

function initEvents() {
  els.fileInput.addEventListener("change", (e) => onFileSelected(e.target.files?.[0]));
  els.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropZone.classList.add("border-cyan-500");
  });
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("border-cyan-500"));
  els.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropZone.classList.remove("border-cyan-500");
    onFileSelected(e.dataTransfer?.files?.[0]);
  });
  els.cancelBtn.addEventListener("click", () => {
    if (worker) worker.postMessage({ type: "cancel" });
  });
  els.resetBtn.addEventListener("click", resetApp);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.searchInput.addEventListener("input", debounce(applyFiltersAndRenderTable, 120));
  els.typeFilter.addEventListener("change", applyFiltersAndRenderTable);
  els.statusFilter.addEventListener("change", applyFiltersAndRenderTable);
  els.tableHeader.addEventListener("click", (e) => {
    const key = e.target?.dataset?.key;
    if (!key) return;
    if (sortState.key === key) sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
    else {
      sortState.key = key;
      sortState.dir = "desc";
    }
    applyFiltersAndRenderTable();
  });
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  window.addEventListener("resize", debounce(renderVirtualTable, 100));
}

function debounce(fn, ms) {
  let id = null;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

initTheme();
initEvents();
setPage("upload");

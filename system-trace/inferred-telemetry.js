/**
 * Inferred Telemetry Module
 * Derived signals computed from collected data
 */

class InferredTelemetry {
  constructor(staticData, continuousSamples, intervalMs = 5000) {
    this.staticData = staticData;
    this.continuousSamples = continuousSamples;
    this.intervalMs = intervalMs;
    this.permissionMetrics = null;
  }

  /**
   * Generate all inferred telemetry
   */
  infer() {
    return {
      agentPresence: this.inferAgentPresence(),
      sessionIntegrity: this.inferSessionIntegrity(),
      riskScores: this.inferRiskScores(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 5.1 Device & Environment Inference
   */
  inferDeviceMetrics() {
    const device = this.staticData.device || {};
    const display = this.staticData.display || {};
    const memory = this.continuousSamples.length > 0
      ? this.continuousSamples[this.continuousSamples.length - 1].memory
      : null;

    return {
      performanceTier: this.inferPerformanceTier(device, memory),
      mobileVsDesktopConfidence: this.inferMobileConfidence(device, display),
      gpuCapabilityClass: this.inferGPUClass(device),
      memoryPressureLikelihood: this.inferMemoryPressure(memory),
      vmSandboxProbability: this.inferVMSandbox(device, display)
    };
  }

  inferPerformanceTier(device, memory) {
    let score = 0;

    // CPU cores
    if (device.cpuLogicalCores) {
      if (device.cpuLogicalCores >= 8) score += 3;
      else if (device.cpuLogicalCores >= 4) score += 2;
      else score += 1;
    }

    // Device memory
    if (device.deviceMemory) {
      if (device.deviceMemory >= 8) score += 3;
      else if (device.deviceMemory >= 4) score += 2;
      else score += 1;
    }

    // GPU
    if (device.gpuRenderer) {
      const gpu = device.gpuRenderer.toLowerCase();
      if (gpu.includes('nvidia') || gpu.includes('amd') || gpu.includes('radeon')) score += 2;
      else if (gpu.includes('intel')) score += 1;
    }

    // Memory pressure
    if (memory && memory.available) {
      const heapUsage = memory.usedHeap / memory.jsHeapLimit;
      if (heapUsage < 0.5) score += 1;
      else if (heapUsage > 0.9) score -= 1;
    }

    if (score >= 7) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  }

  inferMobileConfidence(device, display) {
    let confidence = 0;

    if (device.deviceClass === 'Mobile') confidence += 40;
    if (device.touchSupport) confidence += 30;
    if (device.maxTouchPoints > 0) confidence += 10;

    if (display.screenResolution) {
      const { width, height } = display.screenResolution;
      const smaller = Math.min(width, height);
      if (smaller < 768) confidence += 20;
    }

    return Math.min(100, confidence);
  }

  inferGPUClass(device) {
    if (!device.gpuRenderer) return 'Unknown';

    const gpu = device.gpuRenderer.toLowerCase();

    if (gpu.includes('nvidia') && (gpu.includes('rtx') || gpu.includes('gtx'))) {
      return 'High';
    }
    if (gpu.includes('amd') && (gpu.includes('rx') || gpu.includes('radeon'))) {
      return 'High';
    }
    if (gpu.includes('intel')) {
      return 'Integrated';
    }
    if (gpu.includes('adreno') || gpu.includes('mali')) {
      return 'Mobile';
    }

    return 'Standard';
  }

  inferMemoryPressure(memory) {
    if (!memory || !memory.available) return 'Unknown';

    const heapUsage = memory.usedHeap / memory.jsHeapLimit;
    const growthRate = memory.heapGrowthRate || 0;

    if (heapUsage > 0.9 || growthRate > 1000000) return 'High';
    if (heapUsage > 0.7 || growthRate > 500000) return 'Medium';
    if (heapUsage < 0.5 && growthRate < 100000) return 'Low';

    return 'Medium';
  }

  inferVMSandbox(device, display) {
    // Heuristic detection of VM/sandbox environments
    let probability = 0;

    // Check for common VM indicators in GPU renderer
    if (device.gpuRenderer) {
      const gpu = device.gpuRenderer.toLowerCase();
      if (gpu.includes('vmware') || gpu.includes('virtualbox') ||
          gpu.includes('qemu') || gpu.includes('xen')) {
        probability += 80;
      }
    }

    // Check for unusual screen resolutions (common in VMs)
    if (display.screenResolution) {
      const { width, height } = display.screenResolution;
      // Common VM resolutions
      if ((width === 1024 && height === 768) ||
          (width === 1280 && height === 720) ||
          (width === 1920 && height === 1080 && device.cpuLogicalCores <= 2)) {
        probability += 20;
      }
    }

    // Limited CPU cores might indicate VM
    if (device.cpuLogicalCores && device.cpuLogicalCores <= 2) {
      probability += 10;
    }

    return Math.min(100, probability);
  }

  /**
   * 5.2 Network & Session Quality Inference
   */
  inferNetworkMetrics() {
    if (this.continuousSamples.length === 0) {
      return {
        networkStabilityScore: null,
        latencyVariance: null,
        sessionReliabilityIndex: null,
        corporateNetworkLikelihood: null
      };
    }

    const networkSamples = this.continuousSamples
      .map(s => s.network)
      .filter(n => n.rtt !== null && n.rtt !== undefined);

    return {
      networkStabilityScore: this.calculateNetworkStability(networkSamples),
      latencyVariance: this.calculateLatencyVariance(networkSamples),
      sessionReliabilityIndex: this.calculateSessionReliability(),
      corporateNetworkLikelihood: this.inferCorporateNetwork(networkSamples)
    };
  }

  calculateNetworkStability(networkSamples) {
    if (networkSamples.length < 2) return null;

    const rtts = networkSamples.map(n => n.rtt);
    const avgRTT = rtts.reduce((a, b) => a + b, 0) / rtts.length;
    const variance = rtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgRTT, 2), 0) / rtts.length;
    const stdDev = Math.sqrt(variance);

    // Stability score: lower variance = higher stability (0-100)
    const coefficientOfVariation = stdDev / avgRTT;
    const stabilityScore = Math.max(0, 100 - (coefficientOfVariation * 100));

    return Math.round(stabilityScore);
  }

  calculateLatencyVariance(networkSamples) {
    if (networkSamples.length < 2) return null;

    const rtts = networkSamples.map(n => n.rtt);
    const avgRTT = rtts.reduce((a, b) => a + b, 0) / rtts.length;
    const variance = rtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgRTT, 2), 0) / rtts.length;

    return {
      variance: Math.round(variance),
      standardDeviation: Math.round(Math.sqrt(variance)),
      average: Math.round(avgRTT)
    };
  }

  calculateSessionReliability() {
    if (this.continuousSamples.length === 0) return null;

    const onlineSamples = this.continuousSamples.filter(s => s.network.online).length;
    const totalSamples = this.continuousSamples.length;
    const onlinePercentage = (onlineSamples / totalSamples) * 100;

    // Factor in network changes (fewer changes = more reliable)
    const networkChanges = this.continuousSamples[0]?.network.networkChangeCount || 0;
    const changePenalty = Math.min(20, networkChanges * 2);

    const reliability = Math.max(0, onlinePercentage - changePenalty);

    return Math.round(reliability);
  }

  inferCorporateNetwork(networkSamples) {
    if (networkSamples.length === 0) return null;

    let likelihood = 0;

    // Corporate networks often have consistent, low-latency connections
    const rtts = networkSamples.map(n => n.rtt).filter(r => r !== null);
    if (rtts.length > 0) {
      const avgRTT = rtts.reduce((a, b) => a + b, 0) / rtts.length;
      const variance = rtts.reduce((sum, rtt) => sum + Math.pow(rtt - avgRTT, 2), 0) / rtts.length;

      // Low latency with low variance suggests corporate network
      if (avgRTT < 50 && variance < 100) likelihood += 40;
      if (avgRTT < 30) likelihood += 30;
    }

    // Check connection type
    const connectionTypes = networkSamples.map(n => n.effectiveConnectionType).filter(t => t);
    if (connectionTypes.some(t => t === '4g' || t === 'ethernet')) {
      likelihood += 20;
    }

    // Consistent connection type suggests corporate
    const uniqueTypes = new Set(connectionTypes);
    if (uniqueTypes.size === 1) likelihood += 10;

    return Math.min(100, likelihood);
  }

  /**
   * 1️⃣6️⃣ Inferred – Agent Presence & Behaviour
   */
  inferAgentPresence() {
    if (this.continuousSamples.length === 0) {
      return {
        screen_presence_ratio: null,
        camera_presence_ratio: null,
        mic_presence_ratio: null,
        idle_ratio: null,
        multitasking_likelihood: null
      };
    }

    const activitySamples = this.continuousSamples.map(s => s.activity);
    const visibleSamples = activitySamples.filter(a => a.tabVisibility === 'visible');
    const screenPresenceRatio = visibleSamples.length / activitySamples.length;

    // Get permission-based metrics if available
    const permissionMetrics = this.permissionMetrics || {};
    const cameraPresenceRatio = permissionMetrics.camera?.camera_active_ratio || 0;
    const micPresenceRatio = permissionMetrics.microphone?.mic_activity_ratio || 0;

    // Calculate idle ratio
    const totalIdleTime = activitySamples.reduce((sum, a) => sum + (a.idleDuration || 0), 0);
    const totalTime = activitySamples.length * (this.intervalMs || 5000) / 1000;
    const idleRatio = totalTime > 0 ? Math.round((totalIdleTime / totalTime) * 100) / 100 : 0;

    // Multitasking likelihood
    const multitaskingLikelihood = this.inferMultitaskingLikelihood(activitySamples);

    return {
      screen_presence_ratio: Math.round(screenPresenceRatio * 100) / 100,
      camera_presence_ratio: Math.round(cameraPresenceRatio * 100) / 100,
      mic_presence_ratio: Math.round(micPresenceRatio * 100) / 100,
      idle_ratio: idleRatio,
      multitasking_likelihood: multitaskingLikelihood
    };
  }

  inferMultitaskingLikelihood(activitySamples) {
    const focusLossCount = activitySamples.filter(a => a.focusLossCount > 0).length;
    const focusLossRatio = focusLossCount / activitySamples.length;

    const hiddenSamples = activitySamples.filter(a => a.tabVisibility === 'hidden').length;
    const hiddenRatio = hiddenSamples / activitySamples.length;

    if (focusLossRatio > 0.3 || hiddenRatio > 0.4) return 'High';
    if (focusLossRatio > 0.1 || hiddenRatio > 0.2) return 'Medium';
    return 'Low';
  }

  /**
   * 1️⃣7️⃣ Inferred – Session Integrity & Network Quality
   */
  inferSessionIntegrity() {
    if (this.continuousSamples.length === 0) {
      return {
        network_stability_score: null,
        session_reliability_score: null,
        throttling_likelihood: null,
        device_stability_score: null
      };
    }

    const networkSamples = this.continuousSamples.map(s => s.network);
    const performanceSamples = this.continuousSamples.map(s => s.performance);

    return {
      network_stability_score: this.calculateNetworkStability(networkSamples),
      session_reliability_score: this.calculateSessionReliability(),
      throttling_likelihood: this.inferThrottlingLikelihood(performanceSamples),
      device_stability_score: this.calculateDeviceStability()
    };
  }

  inferThrottlingLikelihood(performanceSamples) {
    const throttlingDetected = performanceSamples.filter(p => p.timerThrottlingDetected).length;
    const throttlingRatio = throttlingDetected / performanceSamples.length;

    if (throttlingRatio > 0.3) return 'High';
    if (throttlingRatio > 0.1) return 'Medium';
    return 'Low';
  }

  calculateDeviceStability() {
    // Based on memory consistency, performance consistency, etc.
    const memorySamples = this.continuousSamples
      .map(s => s.memory)
      .filter(m => m.available);

    if (memorySamples.length < 2) return null;

    const heapLimits = memorySamples.map(m => m.jsHeapLimit);
    const uniqueLimits = new Set(heapLimits);
    const limitConsistency = uniqueLimits.size === 1 ? 100 : 50;

    // Performance consistency
    const eventLoopDelays = this.continuousSamples.map(s => s.performance?.eventLoopDelay || 0);
    const avgDelay = eventLoopDelays.reduce((a, b) => a + b, 0) / eventLoopDelays.length;
    const delayScore = Math.max(0, 100 - (avgDelay * 10));

    return Math.round((limitConsistency + delayScore) / 2);
  }

  /**
   * 1️⃣8️⃣ Inferred – Supervision & Risk Scores
   */
  inferRiskScores() {
    if (this.continuousSamples.length === 0) {
      return {
        agent_presence_score: null,
        session_integrity_score: null,
        network_reliability_score: null,
        composite_agent_risk_score: null,
        risk_level: null
      };
    }

    const agentPresence = this.inferAgentPresence();
    const sessionIntegrity = this.inferSessionIntegrity();

    const agentPresenceScore = this.calculateAgentPresenceScore(agentPresence);
    const sessionIntegrityScore = sessionIntegrity.session_reliability_score || 0;
    const networkReliabilityScore = sessionIntegrity.network_stability_score || 0;

    const compositeRiskScore = Math.round(
      (agentPresenceScore * 0.4) +
      (sessionIntegrityScore * 0.3) +
      (networkReliabilityScore * 0.3)
    );

    const riskLevel = this.determineRiskLevel(compositeRiskScore);

    return {
      agent_presence_score: agentPresenceScore,
      session_integrity_score: sessionIntegrityScore,
      network_reliability_score: networkReliabilityScore,
      composite_agent_risk_score: compositeRiskScore,
      risk_level: riskLevel
    };
  }

  calculateAgentPresenceScore(agentPresence) {
    let score = 100;

    // Lower score for low presence
    if (agentPresence.screen_presence_ratio < 0.5) score -= 30;
    if (agentPresence.camera_presence_ratio < 0.3) score -= 20;
    if (agentPresence.mic_presence_ratio < 0.3) score -= 20;
    if (agentPresence.idle_ratio > 0.7) score -= 20;
    if (agentPresence.multitasking_likelihood === 'High') score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  determineRiskLevel(compositeScore) {
    if (compositeScore >= 80) return 'Low';
    if (compositeScore >= 60) return 'Medium';
    if (compositeScore >= 40) return 'High';
    return 'Critical';
  }

  setPermissionMetrics(permissionMetrics) {
    this.permissionMetrics = permissionMetrics;
  }

  setIntervalMs(intervalMs) {
    this.intervalMs = intervalMs;
  }

  inferUserBehavior() {
    const activitySamples = this.continuousSamples.map(s => s.activity);
    const visibleSamples = activitySamples.filter(a => a.tabVisibility === 'visible');
    const focusedSamples = activitySamples.filter(a => a.focusState === 'active');

    const visibilityRatio = visibleSamples.length / activitySamples.length;
    const focusRatio = focusedSamples.length / activitySamples.length;

    // Calculate idle time
    const avgIdle = activitySamples.reduce((sum, a) => sum + (a.idleDuration || 0), 0) / activitySamples.length;

    if (visibilityRatio > 0.8 && focusRatio > 0.7 && avgIdle < 5) {
      return 'Active';
    }
    if (visibilityRatio < 0.3 || focusRatio < 0.2) {
      return 'Passive';
    }
    return 'Mixed';
  }

  detectAbnormalFocusLoss() {
    const activitySamples = this.continuousSamples.map(s => s.activity);
    let focusLossCount = 0;
    let rapidSwitches = 0;

    for (let i = 1; i < activitySamples.length; i++) {
      const prev = activitySamples[i - 1];
      const curr = activitySamples[i];

      if (prev.focusState === 'active' && curr.focusState === 'inactive') {
        focusLossCount++;
      }

      // Detect rapid focus switches (potential automation)
      if (prev.focusState !== curr.focusState) {
        rapidSwitches++;
      }
    }

    const switchRate = rapidSwitches / activitySamples.length;
    const isAbnormal = switchRate > 0.5 || focusLossCount > activitySamples.length * 0.3;

    return {
      detected: isAbnormal,
      focusLossCount: focusLossCount,
      rapidSwitchRate: Math.round(switchRate * 100),
      riskLevel: isAbnormal ? 'High' : 'Low'
    };
  }

  inferExtensionUsage() {
    // Indirect detection through performance anomalies
    const performanceSamples = this.continuousSamples.map(s => s.performance);
    const avgEventLoopDelay = performanceSamples
      .map(p => p.eventLoopDelay || 0)
      .reduce((a, b) => a + b, 0) / performanceSamples.length;

    const longTasks = performanceSamples
      .map(p => p.longTasksCount || 0)
      .reduce((a, b) => a + b, 0);

    let likelihood = 0;

    // High event loop delay might indicate extensions
    if (avgEventLoopDelay > 10) likelihood += 30;
    if (avgEventLoopDelay > 20) likelihood += 20;

    // Many long tasks might indicate extension interference
    if (longTasks > 10) likelihood += 30;
    if (longTasks > 20) likelihood += 20;

    // Memory pressure might indicate extensions
    const memorySamples = this.continuousSamples
      .map(s => s.memory)
      .filter(m => m.available);
    if (memorySamples.length > 0) {
      const avgHeapUsage = memorySamples.reduce((sum, m) => {
        return sum + (m.usedHeap / m.jsHeapLimit);
      }, 0) / memorySamples.length;
      if (avgHeapUsage > 0.8) likelihood += 20;
    }

    return Math.min(100, likelihood);
  }

  detectThrottling() {
    const performanceSamples = this.continuousSamples.map(s => s.performance);
    const timerDrifts = performanceSamples
      .map(p => p.timerDrift || 0)
      .filter(d => d !== 0);

    if (timerDrifts.length === 0) return { detected: false };

    const avgDrift = timerDrifts.reduce((a, b) => a + b, 0) / timerDrifts.length;
    const maxDrift = Math.max(...timerDrifts);

    // Significant positive drift indicates throttling
    const isThrottled = avgDrift > 100 || maxDrift > 500;

    return {
      detected: isThrottled,
      averageDrift: Math.round(avgDrift),
      maxDrift: Math.round(maxDrift),
      severity: isThrottled ? (maxDrift > 1000 ? 'High' : 'Medium') : 'None'
    };
  }

  calculateFingerprintConsistency() {
    // Check if device characteristics remain consistent
    const device = this.staticData.device || {};
    const display = this.staticData.display || {};

    let consistency = 100;

    // Check if memory samples show consistent patterns
    const memorySamples = this.continuousSamples
      .map(s => s.memory)
      .filter(m => m.available && m.jsHeapLimit);

    if (memorySamples.length > 1) {
      const heapLimits = memorySamples.map(m => m.jsHeapLimit);
      const uniqueLimits = new Set(heapLimits);
      if (uniqueLimits.size > 1) {
        consistency -= 20; // Heap limit changed (unusual)
      }
    }

    // Check for display resolution changes (shouldn't happen)
    // This would require tracking display changes, which we don't do in static
    // But we can check if resolution seems consistent with device class

    if (device.deviceClass === 'Mobile' && display.screenResolution) {
      const { width, height } = display.screenResolution;
      if (width > 1920 || height > 1920) {
        consistency -= 30; // Mismatch
      }
    }

    return Math.max(0, consistency);
  }

  detectCapabilityMismatches() {
    const anomalies = [];
    const device = this.staticData.device || {};
    const webAPIs = this.staticData.webAPIs || {};

    // Check for mismatches between device class and capabilities
    if (device.deviceClass === 'Mobile') {
      if (webAPIs.webgpu) {
        anomalies.push('Mobile device with WebGPU support (uncommon)');
      }
      if (webAPIs.sharedArrayBuffer) {
        anomalies.push('Mobile device with SharedArrayBuffer (requires COOP/COEP)');
      }
    }

    // Check for missing expected capabilities
    if (device.deviceClass === 'Desktop' && !webAPIs.webgl) {
      anomalies.push('Desktop without WebGL support');
    }

    // Check storage vs secure context
    const storage = this.staticData.storage || {};
    if (!storage.secureContext && (storage.localStorage || storage.indexedDB)) {
      anomalies.push('Storage available without secure context');
    }

    return {
      detected: anomalies.length > 0,
      count: anomalies.length,
      anomalies: anomalies
    };
  }

  /**
   * Get all inferred data
   */
  getData() {
    return this.infer();
  }
}

/**
 * Static Telemetry Collection Module
 * Collects fixed context captured once per session
 */

class StaticTelemetry {
  constructor() {
    this.data = {};
  }

  /**
   * Collect all static telemetry
   */
  async collect() {
    this.data = {
      device: this.collectDeviceContext(),
      display: this.collectDisplayCapabilities(),
      browser: this.collectBrowserIdentity(),
      webAPIs: this.collectWebAPICapabilities(),
      storage: this.collectStorageContext(),
      permissions: await this.collectPermissionAwareCapabilities(),
      timestamp: new Date().toISOString()
    };
    return this.data;
  }

  /**
   * 6. Static – Permission-Aware Capabilities
   */
  async collectPermissionAwareCapabilities() {
    const result = {
      camera_available: false,
      camera_device_count: 0,
      microphone_available: false,
      microphone_device_count: 0,
      location_capable: 'geolocation' in navigator,
      advanced_device_capable: this.checkAdvancedDeviceCapability()
    };

    // Check media devices (camera/mic) - requires permission
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const audioDevices = devices.filter(d => d.kind === 'audioinput');

        result.camera_available = videoDevices.length > 0;
        result.camera_device_count = videoDevices.length;
        result.microphone_available = audioDevices.length > 0;
        result.microphone_device_count = audioDevices.length;
      } catch (e) {
        // Permission not granted or API not available
      }
    }

    return result;
  }

  checkAdvancedDeviceCapability() {
    const capabilities = [];
    if ('bluetooth' in navigator) capabilities.push('Bluetooth');
    if ('usb' in navigator) capabilities.push('USB');
    if ('hid' in navigator) capabilities.push('HID');
    if ('nfc' in navigator) capabilities.push('NFC');
    return capabilities.length > 0 ? capabilities.join('/') : false;
  }

  /**
   * 3.1 Device & Hardware Context (Indirect)
   */
  collectDeviceContext() {
    const nav = navigator;
    const result = {
      cpuLogicalCores: nav.hardwareConcurrency || null,
      deviceMemory: nav.deviceMemory || null,
      platform: nav.platform || null,
      architecture: this.getArchitecture(),
      touchSupport: 'ontouchstart' in window || nav.maxTouchPoints > 0,
      maxTouchPoints: nav.maxTouchPoints || 0,
      deviceClass: this.inferDeviceClass()
    };

    // GPU Vendor & Renderer (WebGL)
    const glInfo = this.getWebGLInfo();
    if (glInfo) {
      result.gpuVendor = glInfo.vendor;
      result.gpuRenderer = glInfo.renderer;
    }

    return result;
  }

  getArchitecture() {
    if (navigator.userAgentData && navigator.userAgentData.architecture) {
      return navigator.userAgentData.architecture;
    }
    // Fallback inference
    const ua = navigator.userAgent;
    if (ua.includes('x86_64') || ua.includes('x64')) return 'x64';
    if (ua.includes('x86') || ua.includes('i686')) return 'x86';
    if (ua.includes('arm64') || ua.includes('aarch64')) return 'arm64';
    if (ua.includes('arm')) return 'arm';
    return null;
  }

  getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
      }
    } catch (e) {
      // WebGL not available
    }
    return null;
  }

  inferDeviceClass() {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    const height = window.screen.height;
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (touchSupport && (width < 768 || height < 768)) {
      return 'Mobile';
    }
    if (touchSupport && width >= 768) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  /**
   * 3.2 Display & Visual Capabilities
   */
  collectDisplayCapabilities() {
    const screen = window.screen;
    return {
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      availableScreenSize: {
        width: screen.availWidth,
        height: screen.availHeight
      },
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: screen.colorDepth || null,
      colorGamut: this.getColorGamut(),
      hdrSupport: this.checkHDRSupport(),
      orientationSupport: {
        landscape: screen.width > screen.height,
        portrait: screen.height > screen.width
      }
    };
  }

  getColorGamut() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(color-gamut: p3)').matches) return 'P3';
        if (window.matchMedia('(color-gamut: rec2020)').matches) return 'rec2020';
        if (window.matchMedia('(color-gamut: srgb)').matches) return 'sRGB';
      }
    } catch (e) {}
    return 'sRGB'; // Default assumption
  }

  checkHDRSupport() {
    try {
      if (window.matchMedia) {
        return window.matchMedia('(dynamic-range: high)').matches;
      }
    } catch (e) {}
    return false;
  }

  /**
   * 3.3 Browser & Runtime Identity
   */
  collectBrowserIdentity() {
    const nav = navigator;
    const result = {
      userAgent: nav.userAgent,
      browserVersion: this.getBrowserVersion(),
      renderingEngine: this.getRenderingEngine(),
      javascriptEngine: this.inferJSEngine(),
      language: nav.language || null,
      languages: nav.languages || [nav.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      timezoneOffset: new Date().getTimezoneOffset(),
      doNotTrack: nav.doNotTrack || null,
      pdfViewer: this.checkPDFViewer()
    };

    // UA-CH (Client Hints) if available
    if (nav.userAgentData) {
      result.uaCH = {
        brands: nav.userAgentData.brands || [],
        mobile: nav.userAgentData.mobile || false,
        platform: nav.userAgentData.platform || null,
        platformVersion: nav.userAgentData.platformVersion || null,
        architecture: nav.userAgentData.architecture || null,
        model: nav.userAgentData.model || null,
        uaFullVersion: nav.userAgentData.uaFullVersion || null
      };
    }

    return result;
  }

  getBrowserVersion() {
    const ua = navigator.userAgent;
    const patterns = [
      { name: 'Chrome', regex: /Chrome\/(\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+)/ },
      { name: 'Safari', regex: /Version\/(\d+).*Safari/ },
      { name: 'Edge', regex: /Edg\/(\d+)/ },
      { name: 'Opera', regex: /OPR\/(\d+)/ }
    ];

    for (const pattern of patterns) {
      const match = ua.match(pattern.regex);
      if (match) {
        return {
          name: pattern.name,
          major: parseInt(match[1], 10),
          full: match[0]
        };
      }
    }
    return null;
  }

  getRenderingEngine() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') || ua.includes('Chromium') || ua.includes('Edg')) return 'Blink';
    if (ua.includes('Firefox')) return 'Gecko';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'WebKit';
    return 'Unknown';
  }

  inferJSEngine() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') || ua.includes('Chromium') || ua.includes('Edg')) return 'V8';
    if (ua.includes('Firefox')) return 'SpiderMonkey';
    if (ua.includes('Safari')) return 'JavaScriptCore';
    return 'Unknown';
  }

  checkPDFViewer() {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovTGVuZ3RoIDYgMCBSCi9GaWx0ZXIgL0ZsYXRlRGVjb2RlCj4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwN1AwMjJQUAAB';
      return true; // Browser supports PDF viewing
    } catch (e) {
      return false;
    }
  }

  /**
   * 3.4 Web API Capability Surface
   */
  collectWebAPICapabilities() {
    return {
      webgl: this.checkAPI('WebGLRenderingContext'),
      webgl2: this.checkAPI('WebGL2RenderingContext'),
      webgpu: this.checkAPI('GPU'),
      webrtc: this.checkAPI('RTCPeerConnection'),
      webassembly: typeof WebAssembly !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      pushAPI: 'PushManager' in window,
      backgroundSync: 'sync' in (window.ServiceWorkerRegistration?.prototype || {}),
      mediaDevices: 'mediaDevices' in navigator,
      clipboardAPI: 'clipboard' in navigator,
      webAuthn: 'PublicKeyCredential' in window,
      paymentRequest: 'PaymentRequest' in window,
      fileSystemAccess: 'showOpenFilePicker' in window,
      offscreenCanvas: 'OffscreenCanvas' in window,
      audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
      indexedDB: 'indexedDB' in window,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      drmSupported: this.checkDRMSupport(),
      intl: {
        locale: typeof Intl !== 'undefined',
        dateTimeFormat: typeof Intl.DateTimeFormat !== 'undefined',
        numberFormat: typeof Intl.NumberFormat !== 'undefined',
        relativeTimeFormat: typeof Intl.RelativeTimeFormat !== 'undefined',
        listFormat: typeof Intl.ListFormat !== 'undefined'
      }
    };
  }

  checkDRMSupport() {
    try {
      // Check for EME (Encrypted Media Extensions)
      return 'requestMediaKeySystemAccess' in navigator;
    } catch (e) {
      return false;
    }
  }

  checkAPI(name) {
    try {
      if (name === 'WebGLRenderingContext') {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      }
      if (name === 'WebGL2RenderingContext') {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('webgl2');
      }
      if (name === 'GPU') {
        return 'gpu' in navigator;
      }
      if (name === 'RTCPeerConnection') {
        return 'RTCPeerConnection' in window || 'webkitRTCPeerConnection' in window;
      }
      return name in window || name in navigator;
    } catch (e) {
      return false;
    }
  }

  /**
   * 3.5 Storage & Security Context
   */
  collectStorageContext() {
    const result = {
      cookiesEnabled: navigator.cookieEnabled !== false,
      localStorage: this.testStorage('localStorage'),
      sessionStorage: this.testStorage('sessionStorage'),
      indexedDB: 'indexedDB' in window,
      secureContext: window.isSecureContext || false,
      crossOriginIsolated: window.crossOriginIsolated || false,
      httpsStatus: window.location.protocol === 'https:'
    };

    return result;
  }

  testStorage(type) {
    try {
      const storage = window[type];
      const testKey = '__telemetry_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get collected data
   */
  getData() {
    return this.data;
  }
}

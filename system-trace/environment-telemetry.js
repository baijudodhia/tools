/**
 * Environment & Segmentation Telemetry Module
 * Hardware acceleration, renderer path, OS details, accessibility preferences
 */

class EnvironmentTelemetry {
  constructor() {
    this.data = {};
  }

  /**
   * Collect environment data
   */
  collect() {
    this.data = {
      hardware_acceleration: this.checkHardwareAcceleration(),
      webgl_supported: this.checkWebGLSupport(),
      webgpu_supported: this.checkWebGPUSupport(),
      renderer_path: this.detectRendererPath(),
      device_class: this.getDeviceClass(),
      os_name: this.getOSName(),
      os_version: this.getOSVersion(),
      browser_name: this.getBrowserName(),
      browser_version: this.getBrowserVersion(),
      reduced_motion_pref: this.checkReducedMotion(),
      color_scheme: this.getColorScheme()
    };

    return this.data;
  }

  /**
   * Check hardware acceleration
   */
  checkHardwareAcceleration() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Software renderers indicate no hardware acceleration
        return !renderer.toLowerCase().includes('swiftshader') &&
               !renderer.toLowerCase().includes('software');
      }
      return true; // Assume hardware if we can't detect
    } catch (e) {
      return false;
    }
  }

  /**
   * Check WebGL support
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Check WebGPU support
   */
  checkWebGPUSupport() {
    return 'gpu' in navigator;
  }

  /**
   * Detect renderer path
   */
  detectRendererPath() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'unknown';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

        if (renderer.includes('swiftshader') || renderer.includes('software')) {
          return 'software';
        }
        if (renderer.includes('virtual') || renderer.includes('vmware') || renderer.includes('virtualbox')) {
          return 'virtual';
        }
        return 'hardware';
      }
      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Get device class
   */
  getDeviceClass() {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    const height = window.screen.height;
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (touchSupport && (width < 768 || height < 768)) {
      return 'mobile';
    }
    if (touchSupport && width >= 768) {
      return 'tablet';
    }
    if (width >= 1920 && height >= 1080) {
      return 'desktop';
    }
    return 'laptop';
  }

  /**
   * Get OS name
   */
  getOSName() {
    const ua = navigator.userAgent;
    const platform = navigator.platform.toLowerCase();

    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';

    return 'unknown';
  }

  /**
   * Get OS version
   */
  getOSVersion() {
    const ua = navigator.userAgent;

    if (ua.includes('Windows NT 10.0')) return '10';
    if (ua.includes('Windows NT 6.3')) return '8.1';
    if (ua.includes('Windows NT 6.2')) return '8';
    if (ua.includes('Windows NT 6.1')) return '7';

    const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (macMatch) return macMatch[1].replace('_', '.');

    const androidMatch = ua.match(/Android (\d+\.\d+)/);
    if (androidMatch) return androidMatch[1];

    const iosMatch = ua.match(/OS (\d+[._]\d+)/);
    if (iosMatch) return iosMatch[1].replace('_', '.');

    return null;
  }

  /**
   * Get browser name
   */
  getBrowserName() {
    const ua = navigator.userAgent;

    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';

    return 'unknown';
  }

  /**
   * Get browser version
   */
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
        return match[1];
      }
    }
    return null;
  }

  /**
   * Check reduced motion preference
   */
  checkReducedMotion() {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  /**
   * Get color scheme preference
   */
  getColorScheme() {
    if (window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'no-preference';
  }

  /**
   * Get environment data
   */
  getData() {
    return this.data;
  }

  /**
   * Get environment event for export
   */
  getEnvironmentEvent() {
    return {
      event: 'environment',
      session_id: this.sessionId,
      ...this.data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }
}

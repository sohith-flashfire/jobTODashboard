(function () {
  // Tab that opened the panel (from background); avoids wrong URL when activeTab != host page
  var hostTabIdForPanel = null;

  // --- Extension context validity check ---
  function isExtensionValid() {
    try {
      // This throws if extension context is invalidated (extension reloaded/updated)
      chrome.runtime.getURL('');
      return true;
    } catch (e) {
      return false;
    }
  }

  function showRefreshToast() {
    if (document.getElementById('ff-refresh-toast')) return;
    var toast = document.createElement('div');
    toast.id = 'ff-refresh-toast';
    toast.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:70px',
      'z-index:2147483647',
      'background:#1e293b',
      'color:#fff',
      'padding:12px 20px',
      'border-radius:10px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:14px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.3)',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'max-width:340px',
      'animation:ff-slide-in .3s ease'
    ].join(';');
    toast.innerHTML =
      '<span style="font-size:18px">🔄</span>' +
      '<span><b>FlashFire updated</b><br><span style="opacity:0.8;font-size:12px">Please refresh this page to use the extension.</span></span>' +
      '<button onclick="location.reload()" style="all:unset;cursor:pointer;background:#ff5722;color:#fff;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap">Refresh</button>';
    var style = document.createElement('style');
    style.textContent = '@keyframes ff-slide-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
    (document.body || document.documentElement).appendChild(toast);
    // Auto-dismiss after 8 seconds
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 8000);
  }

  function notifyIframeHostTabId() {
    if (hostTabIdForPanel == null) return;
    var panel = document.getElementById('extension-panel');
    if (!panel || panel.style.display !== 'block') return;
    var iframe = panel.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: 'FF_HOST_TAB_ID', tabId: hostTabIdForPanel },
        '*'
      );
    } catch (e) {
      /* ignore */
    }
  }

  function syncLauncherWithPanel() {
    var host = document.getElementById('flashfire-launcher-host');
    var p = document.getElementById('extension-panel');
    if (!host || !p) return;
    host.style.right = p.style.display === 'block' ? '358px' : '12px';
  }

  function togglePanel() {
    // Check extension context is still valid
    if (!isExtensionValid()) {
      showRefreshToast();
      return;
    }

    var p = document.getElementById('extension-panel');
    if (!p) {
      // Panel doesn't exist yet — try creating it
      createPanelUI();
      p = document.getElementById('extension-panel');
      if (!p) return;
    }

    // Verify iframe has valid src (not broken by context invalidation)
    var iframe = p.querySelector('iframe');
    if (iframe && !iframe.src) {
      try {
        iframe.src = chrome.runtime.getURL('panel.html');
      } catch (e) {
        showRefreshToast();
        return;
      }
    }

    var opening = p.style.display !== 'block';
    p.style.display = opening ? 'block' : 'none';
    if (opening) {
      setTimeout(notifyIframeHostTabId, 0);
      setTimeout(notifyIframeHostTabId, 200);
    }
    syncLauncherWithPanel();
  }

  function getFlashfireMountRoot() {
    return document.body || document.documentElement;
  }

  function addFloatingLauncherButton() {
    // Only show the floating button in the top frame, not inside iframes
    if (window !== window.top) return;
    if (document.getElementById('flashfire-launcher-host')) return;
    var mount = getFlashfireMountRoot();
    if (!mount) return;

    var host = document.createElement('div');
    host.id = 'flashfire-launcher-host';
    host.setAttribute('data-flashfire-launcher', '1');
    host.style.cssText = [
      'all:initial',
      'position:fixed',
      'top:16px',
      'right:12px',
      'z-index:2147483646',
      'pointer-events:auto',
      'display:block',
      'font-size:16px',
      'line-height:1'
    ].join(';');

    var root = host.attachShadow({ mode: 'open' });
    var css = document.createElement('style');
    css.textContent = [
      ':host { display: block !important; visibility: visible !important; opacity: 1 !important; }',
      'button {',
      '  all: unset;',
      '  box-sizing: border-box;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 42px;',
      '  height: 42px;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.28);',
      '  background: linear-gradient(135deg,#ff5722 0%,#ff6b00 50%,#ea580c 100%);',
      '  color: #fff;',
      '  transition: transform .15s ease, box-shadow .15s ease;',
      '  padding: 0;',
      '}',
      'button:hover {',
      '  transform: scale(1.08);',
      '  box-shadow: 0 6px 22px rgba(234,88,12,0.55);',
      '}',
      'button svg {',
      '  width: 24px;',
      '  height: 24px;',
      '  display: block;',
      '  fill: none;',
      '  stroke: #fff;',
      '  stroke-width: 1.8;',
      '  stroke-linecap: round;',
      '  stroke-linejoin: round;',
      '}'
    ].join('\n');
    var btn = document.createElement('button');
    btn.type = 'button';
    // FlashFire bolt logo SVG
    btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(255,255,255,0.95)" stroke="#fff" /></svg>';
    btn.setAttribute('aria-label', 'Open FlashFire job panel');
    btn.title = 'FlashFire — open panel (save jobs to dashboard)';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      togglePanel();
    });
    root.appendChild(css);
    root.appendChild(btn);
    mount.appendChild(host);
    syncLauncherWithPanel();
  }

  function ensureLauncherExists() {
    if (window !== window.top) return;
    var existing = document.getElementById('flashfire-launcher-host');
    if (!existing) {
      addFloatingLauncherButton();
      return;
    }
    // Force visibility in case site CSS hid it
    existing.style.display = 'block';
    existing.style.visibility = 'visible';
    existing.style.opacity = '1';
  }

  // Check quickly at first (500ms, 1s, 2s) then every 3s
  setTimeout(ensureLauncherExists, 500);
  setTimeout(ensureLauncherExists, 1000);
  setTimeout(ensureLauncherExists, 2000);
  setInterval(ensureLauncherExists, 3000);

  // Prevent double-initialization
  if (document.getElementById('extension-panel')) {
    addFloatingLauncherButton();
    togglePanel();
    return;
  }

  var ns = window.FFExtract;
  var currentJobData = null;
  var currentConfidence = 0;

  // --- Extraction (delegates to FFExtract pipeline) ---
  function updateJobData() {
    if (!ns || !ns.pipeline) {
      currentJobData = null;
      currentConfidence = 0;
      return;
    }
    try {
      var result = ns.pipeline.extract();
      if (result.data) {
        currentJobData = result.data;
        currentConfidence = result.confidence;
        console.log('[FFExtract] Extracted:', result.method,
          'confidence:', result.confidence,
          'time:', result.extractionTimeMs + 'ms',
          'sources:', JSON.stringify(result.fieldSources));
      } else {
        currentJobData = null;
        currentConfidence = 0;
      }
    } catch (e) {
      console.error('[FFExtract] Pipeline error:', e);
      currentJobData = null;
      currentConfidence = 0;
    }
  }

  // --- SPA Navigation Observer ---
  var lastUrl = location.href;
  new MutationObserver(function () {
    var url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Clear stale data immediately
      currentJobData = null;
      currentConfidence = 0;
      setTimeout(updateJobData, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // --- Initial extraction with retries ---
  var attempts = 0;
  var intervalId = setInterval(function () {
    attempts++;
    updateJobData();
    if (currentJobData || attempts > 10) {
      clearInterval(intervalId);
    }
  }, 500);

  // --- DOM observer for late-loading content ---
  var debounceTimer = null;
  var domObserver = new MutationObserver(function () {
    // Debounce to avoid excessive re-extraction on rapid DOM changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      if (!ns || !ns.pipeline) return;
      try {
        var result = ns.pipeline.extract();
        if (result.data && result.confidence > currentConfidence) {
          currentJobData = result.data;
          currentConfidence = result.confidence;
        }
      } catch (e) {
        // Ignore extraction errors in observer
      }
    }, 300);
  });
  if (document.body) {
    domObserver.observe(document.body, { subtree: true, childList: true });
  }

  // --- Public getter (for iframe access) ---
  window.getCurrentJobData = function () {
    return currentJobData;
  };

  // --- Message Handler ---
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // Only the TOP frame should respond to data requests.
    // Sub-frames (reCAPTCHA, ads, tracking iframes) must NOT respond
    // to avoid returning garbage data like "reCAPTCHA" as job title.
    var isTopFrame = (window === window.top);

    if (request.action === 'togglePanel') {
      // Only toggle panel in top frame
      if (!isTopFrame) return false;
      if (request.hostTabId != null) {
        hostTabIdForPanel = request.hostTabId;
      } else if (sender && sender.tab && sender.tab.id != null) {
        hostTabIdForPanel = sender.tab.id;
      }
      togglePanel();
      setTimeout(notifyIframeHostTabId, 0);
      setTimeout(notifyIframeHostTabId, 200);
      setTimeout(notifyIframeHostTabId, 600);
      sendResponse({ success: true });

    } else if (request.action === 'getPageLoadStatus') {
      if (!isTopFrame) return false;
      sendResponse({
        readyState: document.readyState,
        url: location.href,
      });

    } else if (request.action === 'getJobData') {
      if (!isTopFrame) return false;
      // Re-extract if we don't have data or confidence is low
      if (!currentJobData && ns && ns.pipeline) {
        try {
          var result = ns.pipeline.extract();
          if (result.data) {
            currentJobData = result.data;
            currentConfidence = result.confidence;
          }
        } catch (e) {
          console.error('[FFExtract] On-demand extraction error:', e);
        }
      }
      // Response shape preserved; confidence is a backward-compatible addition
      sendResponse({
        jobData: currentJobData,
        confidence: currentConfidence
      });

    } else if (request.action === 'scanJobFields') {
      if (!isTopFrame) return false;
      if (ns && ns.pipeline) {
        var scan = ns.pipeline.quickScan();
        sendResponse({ company: scan.company, position: scan.position });
      } else {
        sendResponse({ company: null, position: null });
      }

    } else if (request.action === 'extractPageHtml') {
      if (!isTopFrame) return false;
      try {
        var content = '';
        if (ns && ns.pipeline) {
          content = ns.pipeline.extractForAI();
        } else {
          content = (document.body.innerText || document.body.textContent || '');
          var maxLen = 6000;
          if (content.length > maxLen) {
            content = content.substring(0, maxLen) + '\n[...truncated]';
          }
        }

        sendResponse({
          ok: true,
          payload: {
            content: content,
            source: location.hostname,
            websiteUrl: location.href
          }
        });
      } catch (e) {
        console.error('[FFExtract] extractPageHtml error:', e);
        sendResponse({ ok: false, error: String(e) });
      }
    }
  });

  // --- Panel UI Creation (top frame only) ---
  if (window !== window.top) return;

  function createPanelUI() {
    if (document.getElementById('extension-panel')) return;
    if (!isExtensionValid()) return;

    var panel = document.createElement('div');
    panel.id = 'extension-panel';
    panel.style.cssText = [
      'position: fixed',
      'top: 0',
      'right: 0',
      'width: 350px',
      'height: 100vh',
      'background: white',
      'z-index: 2147483647',
      'box-shadow: -2px 0 10px rgba(0,0,0,0.2)',
      'overflow-y: auto',
      'display: none',
      'border-left: 1px solid #ddd'
    ].join(';');

    var panelIframe = document.createElement('iframe');
    try {
      panelIframe.src = chrome.runtime.getURL('panel.html');
    } catch (e) {
      showRefreshToast();
      return;
    }
    panelIframe.style.cssText = 'width:100%;height:100%;border:none';

    var closeButton = document.createElement('button');
    closeButton.innerHTML = '\u00d7';
    closeButton.style.cssText = [
      'position: absolute',
      'top: 10px',
      'right: 10px',
      'width: 30px',
      'height: 30px',
      'border-radius: 50%',
      'background: #dc3545',
      'color: white',
      'border: none',
      'font-size: 18px',
      'cursor: pointer',
      'z-index: 10000',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'padding: 0',
      'line-height: 1'
    ].join(';');
    closeButton.addEventListener('click', function () {
      panel.style.display = 'none';
      syncLauncherWithPanel();
    });

    panel.appendChild(closeButton);
    panel.appendChild(panelIframe);

    var mountRoot = getFlashfireMountRoot();
    if (mountRoot) {
      mountRoot.appendChild(panel);
    }
  }

  var mountRoot = getFlashfireMountRoot();
  if (mountRoot) {
    createPanelUI();
  } else {
    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      createPanelUI();
      addFloatingLauncherButton();
    });
  }
  addFloatingLauncherButton();
})();

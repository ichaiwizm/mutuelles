/**
 * Safe wrappers around commonly used chrome.* APIs.
 * Exposed as self.BG.chromeHelpers for background/content contexts.
 */
(function initChromeHelpers(global) {
  try { global.BG = global.BG || {}; } catch (_) { /* ignore */ }

  function withTimeout(promise, ms, errMsg) {
    return new Promise((resolve, reject) => {
      var t = setTimeout(() => reject(new Error(errMsg || 'Timeout')), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  var h = {
    sendMessageWithTimeout: function(message, timeoutMs) {
      try {
        var p = new Promise((resolve, reject) => {
          try { chrome.runtime.sendMessage(message, (resp) => resolve(resp)); } catch (e) { reject(e); }
        });
        return withTimeout(p, timeoutMs || 15000, 'Timeout background script');
      } catch (e) {
        return Promise.reject(e);
      }
    },
    async safeTabsUpdate(tabId, updateProps) {
      try { return await chrome.tabs.update(tabId, updateProps); } catch (_) { return null; }
    },
    async safeTabsCreate(props) {
      try { return await chrome.tabs.create(props); } catch (_) { return null; }
    },
    async safeTabsRemove(tabId) {
      try { return await chrome.tabs.remove(tabId); } catch (_) { return false; }
    },
    async safeWindowsCreate(props) {
      try { return await chrome.windows.create(props); } catch (_) { return null; }
    },
    async safeWindowsUpdate(windowId, props) {
      try { return await chrome.windows.update(windowId, props); } catch (_) { return null; }
    },
    async safeWindowsRemove(windowId) {
      try { return await chrome.windows.remove(windowId); } catch (_) { return false; }
    }
  };

  try { global.BG.chromeHelpers = h; } catch (_) { /* ignore */ }
})(self);


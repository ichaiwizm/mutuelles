// MV3 Service Worker - Orchestrator (minimal)
// Loads modular background logic and wires message listeners.

// Load background modules (classic service worker, no dynamic import())
importScripts(
  'src/bg/constants.js',
  'src/bg/config-sw.js',
  'src/bg/pool.js',
  'src/bg/leads.js',
  'src/bg/messaging.js'
);

// External messages (from platform)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  self.BG.handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error?.message || 'Erreur inconnue' }));
  return true;
});

// Internal messages (from content scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  self.BG.handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error?.message || 'Erreur inconnue' }));
  return true;
});

// Optional lifecycle hook
chrome.runtime.onInstalled.addListener(() => {
  // No-op for now
});


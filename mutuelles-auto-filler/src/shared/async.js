/**
 * Shared async helpers
 */
(function initAsyncHelpers(global) {
  try { global.BG = global.BG || {}; } catch(_) { /* ignore */ }
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  try { global.BG.wait = wait; } catch(_) { /* ignore */ }
})(self);


/**
 * Lightweight logger with levels and toggle.
 * Exposed on global self.BG.logger and a configure function.
 */
(function initLogger(global) {
  try { global.BG = global.BG || {}; } catch (_) { /* ignore */ }

  var enabled = false;
  function setEnabled(v) { enabled = !!v; }
  var api = {
    setDebug: setEnabled,
    debug: function() { if (enabled) try { console.debug.apply(console, arguments); } catch(_){} },
    info: function() { try { console.info.apply(console, arguments); } catch(_){} },
    warn: function() { try { console.warn.apply(console, arguments); } catch(_){} },
    error: function() { try { console.error.apply(console, arguments); } catch(_){} }
  };

  try { global.BG.logger = api; } catch (_) { /* ignore */ }
})(self);


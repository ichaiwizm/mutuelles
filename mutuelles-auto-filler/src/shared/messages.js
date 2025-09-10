/**
 * Shared message actions and minimal validators.
 * Exposed on global self.BG for both background and content contexts.
 */
(function initSharedMessages(global) {
  try { global.BG = global.BG || {}; } catch (_) { /* ignore */ }

  var ACTIONS = {
    PING: 'PING',
    SET_CONFIG: 'SET_CONFIG',
    START_RUN: 'START_RUN',
    GET_RUN_STATE: 'GET_RUN_STATE',
    CANCEL_RUN: 'CANCEL_RUN',
    GET_ISOLATED_STATE: 'GET_ISOLATED_STATE',
    CANCEL_ISOLATED: 'CANCEL_ISOLATED',
    UPDATE_LEAD_STATUS: 'UPDATE_LEAD_STATUS',
    QUEUE_DONE: 'QUEUE_DONE'
  };

  function isArray(x) { return Array.isArray(x); }
  function isObject(x) { return !!x && typeof x === 'object'; }

  function validate(action, data) {
    switch (action) {
      case ACTIONS.START_RUN: {
        if (!isObject(data)) return { ok: false, error: 'payload must be object' };
        if (!isArray(data.providers) || data.providers.length === 0) return { ok: false, error: 'providers required' };
        if (!isArray(data.leads) || data.leads.length === 0) return { ok: false, error: 'leads required' };
        if (data.parallelTabs != null && isNaN(Number(data.parallelTabs))) return { ok: false, error: 'parallelTabs must be number' };
        return { ok: true };
      }
      case ACTIONS.CANCEL_ISOLATED: {
        if (!isObject(data)) return { ok: true }; // optional payload
        if (data.groupId != null && typeof data.groupId !== 'string') return { ok: false, error: 'groupId must be string' };
        return { ok: true };
      }
      case ACTIONS.UPDATE_LEAD_STATUS: {
        if (!isObject(data)) return { ok: false, error: 'payload must be object' };
        if (typeof data.leadId !== 'string') return { ok: false, error: 'leadId string required' };
        if (typeof data.status !== 'string') return { ok: false, error: 'status string required' };
        return { ok: true };
      }
      default:
        return { ok: true };
    }
  }

  try {
    global.BG.ACTIONS = ACTIONS;
    global.BG.validateMessage = validate;
    global.BG.WINDOW_MSG = {
      TO_EXTENSION: 'TO_EXTENSION',
      FROM_EXTENSION: 'FROM_EXTENSION',
      FROM_EXTENSION_STATUS: 'FROM_EXTENSION_STATUS',
      ORCHESTRATOR_STATUS_UPDATE: 'ORCHESTRATOR_STATUS_UPDATE'
    };
  } catch (_) { /* ignore */ }
})(self);

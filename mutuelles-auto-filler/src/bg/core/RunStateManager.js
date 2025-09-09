/**
 * Gestionnaire de l'état des runs - Version Service Worker
 */

self.BG = self.BG || {};

self.BG.RunStateManager = class RunStateManager {
  constructor() {
    this.storageKey = self.BG.SCHEDULER_CONSTANTS.STORAGE_KEYS.RUN_STATE;
    this.runStatus = self.BG.SCHEDULER_CONSTANTS.RUN_STATUS;
  }

  async getRunState() {
    const result = await chrome.storage.local.get([this.storageKey]);
    return result[this.storageKey] || null;
  }

  async setRunState(state) {
    await chrome.storage.local.set({ [this.storageKey]: state });
  }

  createRunState(providers, leads, options = {}) {
    const batchId = Date.now().toString();
    
    return {
      id: batchId,
      status: this.runStatus.PENDING,
      providers: [...providers],
      activeProviderIndex: 0,
      backlog: this._buildBacklog(providers, leads, batchId),
      groups: this._buildGroups(providers, leads, batchId),
      totalLeads: leads.length,
      processedLeads: 0,
      options: {
        minimizeWindow: options.minimizeWindow !== false,
        closeOnFinish: options.closeOnFinish === true,
        parallelTabs: options.parallelTabs || 3
      },
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };
  }

  _buildBacklog(providers, leads, batchId) {
    const backlog = {};
    for (const provider of providers) {
      const groups = this._splitIntoGroups(leads, 3);
      backlog[provider] = groups.map((chunk, idx) => `${batchId}-${provider}-${idx}`);
    }
    return backlog;
  }

  _buildGroups(providers, leads, batchId) {
    const groups = {};
    for (const provider of providers) {
      const chunks = this._splitIntoGroups(leads, 3);
      groups[provider] = chunks.map((chunk, idx) => ({
        groupId: `${batchId}-${provider}-${idx}`,
        leads: chunk,
        batchId
      }));
    }
    return groups;
  }

  _splitIntoGroups(leads, capacity) {
    const numGroups = Math.max(1, Math.min(capacity, leads.length));
    const size = Math.floor(leads.length / numGroups);
    let remainder = leads.length % numGroups;
    
    const groups = [];
    let i = 0;
    
    for (let k = 0; k < numGroups; k++) {
      const extra = remainder > 0 ? 1 : 0;
      const end = i + size + extra;
      const chunk = leads.slice(i, end);
      if (chunk.length > 0) groups.push(chunk);
      i = end;
      remainder--;
    }
    
    return groups;
  }

  async startRun(state) {
    state.status = this.runStatus.RUNNING;
    state.startedAt = new Date().toISOString();
    await this.setRunState(state);
  }

  async completeGroup(provider, groupId) {
    const state = await this.getRunState();
    if (!state) return null;

    if (state.backlog[provider]) {
      state.backlog[provider] = state.backlog[provider].filter(id => id !== groupId);
    }

    const group = this._findGroup(state, provider, groupId);
    if (group) {
      state.processedLeads += group.leads.length;
    }

    await this.setRunState(state);
    return state;
  }

  async switchToNextProvider() {
    const state = await this.getRunState();
    if (!state) return null;

    for (let i = state.activeProviderIndex + 1; i < state.providers.length; i++) {
      const provider = state.providers[i];
      if ((state.backlog[provider] || []).length > 0) {
        state.activeProviderIndex = i;
        await this.setRunState(state);
        return state;
      }
    }

    const hasAnyBacklog = Object.values(state.backlog).some(arr => (arr || []).length > 0);
    if (!hasAnyBacklog) {
      await this.completeRun();
      return null;
    }

    return state;
  }

  async completeRun() {
    const state = await this.getRunState();
    if (!state) return;

    state.status = this.runStatus.COMPLETED;
    state.completedAt = new Date().toISOString();
    await this.setRunState(state);

    setTimeout(async () => {
      await chrome.storage.local.remove([this.storageKey]);
    }, 5000);
  }

  async cancelRun() {
    const state = await this.getRunState();
    if (state) {
      state.status = this.runStatus.CANCELLED;
      state.completedAt = new Date().toISOString();
      await this.setRunState(state);
    }

    setTimeout(async () => {
      await chrome.storage.local.remove([this.storageKey]);
    }, 1000);
  }

  async getActiveProvider() {
    const state = await this.getRunState();
    if (!state || state.activeProviderIndex >= state.providers.length) return null;
    return state.providers[state.activeProviderIndex];
  }

  async getPendingGroups(provider) {
    const state = await this.getRunState();
    if (!state) return [];

    const pendingIds = state.backlog[provider] || [];
    const allGroups = state.groups[provider] || [];
    
    return allGroups.filter(group => pendingIds.includes(group.groupId));
  }

  async getRunSummary() {
    const state = await this.getRunState();
    if (!state) return { active: false };

    const activeProvider = state.providers[state.activeProviderIndex] || null;
    const backlogCounts = Object.fromEntries(
      Object.entries(state.backlog || {}).map(([p, arr]) => [p, (arr || []).length])
    );

    return {
      active: state.status === this.runStatus.RUNNING,
      status: state.status,
      providers: state.providers,
      activeProvider,
      backlogCounts,
      progress: {
        total: state.totalLeads,
        processed: state.processedLeads,
        percentage: Math.round((state.processedLeads / state.totalLeads) * 100)
      }
    };
  }

  _findGroup(state, provider, groupId) {
    const groups = state.groups[provider] || [];
    return groups.find(group => group.groupId === groupId);
  }
};
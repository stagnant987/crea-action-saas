const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard:      ()     => req('/dashboard'),
  snapshot:       ()     => req('/dashboard/snapshot', { method: 'POST' }),

  // Platforms
  platforms:      ()     => req('/platforms'),
  addPlatform:    (d)    => req('/platforms', { method: 'POST', body: JSON.stringify(d) }),
  updatePlatform: (id,d) => req(`/platforms/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePlatform: (id)   => req(`/platforms/${id}`, { method: 'DELETE' }),
  addAccount:     (pid,d)=> req(`/platforms/${pid}/accounts`, { method: 'POST', body: JSON.stringify(d) }),
  deleteAccount:  (id)   => req(`/accounts/${id}`, { method: 'DELETE' }),

  // Trends
  trends:         ()     => req('/trends'),
  addTrend:       (d)    => req('/trends', { method: 'POST', body: JSON.stringify(d) }),
  deleteTrend:    (id)   => req(`/trends/${id}`, { method: 'DELETE' }),
  aiTrends:       (d)    => req('/trends/ai-detect', { method: 'POST', body: JSON.stringify(d) }),

  // Content
  contentIdeas:   ()     => req('/content-ideas'),
  generateContent:(d)    => req('/content-ideas/generate', { method: 'POST', body: JSON.stringify(d) }),
  batchContent:   ()     => req('/content-ideas/batch', { method: 'POST' }),
  deleteIdea:     (id)   => req(`/content-ideas/${id}`, { method: 'DELETE' }),

  // Experiments
  experiments:    ()     => req('/experiments'),
  addExperiment:  (d)    => req('/experiments', { method: 'POST', body: JSON.stringify(d) }),
  analyzeExp:     (id)   => req(`/experiments/${id}/analyze`, { method: 'POST' }),
  deleteExp:      (id)   => req(`/experiments/${id}`, { method: 'DELETE' }),

  // Opportunities
  opportunities:  ()     => req('/opportunities'),
  addOpportunity: (d)    => req('/opportunities', { method: 'POST', body: JSON.stringify(d) }),
  aiScanOpps:     ()     => req('/opportunities/ai-scan', { method: 'POST' }),
  deleteOpp:      (id)   => req(`/opportunities/${id}`, { method: 'DELETE' }),

  // AI
  optimize:       ()     => req('/ai/optimize', { method: 'POST' }),
  chat:           (d)    => req('/ai/chat', { method: 'POST', body: JSON.stringify(d) }),
  dailyInsight:   ()     => req('/ai/daily-insight'),
};

export const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtK = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n || 0);
};

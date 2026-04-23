'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const Anthropic = require('@anthropic-ai/sdk');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3001'];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── Static frontend (production) ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));
}

// ── Database ──────────────────────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'crea.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS platforms (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT DEFAULT 'other',
    color      TEXT DEFAULT '#00d4ff',
    icon       TEXT DEFAULT 'Globe',
    revenue    REAL DEFAULT 0,
    followers  INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id          TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    username    TEXT DEFAULT '',
    revenue     REAL DEFAULT 0,
    followers   INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trends (
    id                TEXT PRIMARY KEY,
    niche             TEXT NOT NULL,
    platform          TEXT DEFAULT '',
    description       TEXT DEFAULT '',
    score             INTEGER DEFAULT 50,
    revenue_potential INTEGER DEFAULT 5,
    competition       INTEGER DEFAULT 5,
    virality          INTEGER DEFAULT 5,
    status            TEXT DEFAULT 'active',
    created_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS content_ideas (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    platform       TEXT DEFAULT '',
    content_type   TEXT DEFAULT 'post',
    hook           TEXT DEFAULT '',
    body           TEXT DEFAULT '',
    hashtags       TEXT DEFAULT '',
    score          INTEGER DEFAULT 50,
    status         TEXT DEFAULT 'draft',
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS experiments (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    hypothesis  TEXT DEFAULT '',
    variant_a   TEXT DEFAULT '',
    variant_b   TEXT DEFAULT '',
    platform    TEXT DEFAULT '',
    status      TEXT DEFAULT 'running',
    winner      TEXT DEFAULT NULL,
    insights    TEXT DEFAULT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    niche           TEXT DEFAULT '',
    platform        TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    score           INTEGER DEFAULT 50,
    revenue_estimate REAL DEFAULT 0,
    priority        TEXT DEFAULT 'medium',
    status          TEXT DEFAULT 'new',
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS revenue_snapshots (
    id         TEXT PRIMARY KEY,
    month      TEXT UNIQUE NOT NULL,
    total      REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_cache (
    id         TEXT PRIMARY KEY,
    cache_key  TEXT UNIQUE NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed demo data if empty
const platformCount = db.prepare('SELECT COUNT(*) as c FROM platforms').get().c;
if (platformCount === 0) {
  const insert = db.prepare(`INSERT INTO platforms (id,name,type,color,icon,revenue,followers) VALUES (?,?,?,?,?,?,?)`);
  [
    ['p1','YouTube','video','#ff4444','Youtube',1240,18500],
    ['p2','TikTok','video','#ffffff','Music',890,42000],
    ['p3','Instagram','social','#e1306c','Instagram',560,9800],
    ['p4','Patreon','subscription','#ff424d','Heart',380,142],
  ].forEach(r => insert.run(...r));

  const insAcc = db.prepare(`INSERT INTO accounts (id,platform_id,name,username,revenue,followers) VALUES (?,?,?,?,?,?)`);
  [
    ['a1','p1','Chaîne Principale','@main_channel',1240,18500],
    ['a2','p2','Compte TikTok','@tiktok_main',890,42000],
    ['a3','p3','Instagram Pro','@insta_pro',560,9800],
  ].forEach(r => insAcc.run(...r));

  const insOpp = db.prepare(`INSERT INTO opportunities (id,title,niche,platform,description,score,revenue_estimate,priority,status) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['o1','Formation Notion Premium','Productivité','Gumroad','Les templates Notion explosent. Créer une formation à 97€.',92,2800,'urgent','new'],
    ['o2','Pack Templates Canva','Design','Instagram','Les créateurs cherchent des templates. Pack à 27€.',85,1900,'high','new'],
    ['o3','Newsletter Premium IA','IA générative','Substack','L\'IA est en plein boom. Newsletter payante à 15€/mois.',88,1500,'high','new'],
  ].forEach(r => insOpp.run(...r));

  const insTrend = db.prepare(`INSERT INTO trends (id,niche,platform,description,score,revenue_potential,competition,virality,status) VALUES (?,?,?,?,?,?,?,?,?)`);
  [
    ['t1','IA & Productivité','YouTube','Tutoriels ChatGPT/Claude explosent. +340% de vues en 3 mois.',94,9,4,9,'active'],
    ['t2','Side Hustle & Revenus Passifs','TikTok','Les vidéos "comment j\'ai fait X€" cartonnent. Viralité maximale.',89,8,6,9,'active'],
    ['t3','Templates & Outils Notion','Instagram','Marché en croissance constante. Forte demande de templates gratuits→payants.',82,8,5,7,'active'],
  ].forEach(r => insTrend.run(...r));
}

// ── Anthropic Client ──────────────────────────────────────────────────────────
function getAI() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw { status: 400, message: 'ANTHROPIC_API_KEY manquant dans .env' };
  return new Anthropic({ apiKey: key });
}

// ── Helper ────────────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function buildRevenueCtx() {
  const platforms = db.prepare('SELECT * FROM platforms').all();
  const total = platforms.reduce((s, p) => s + p.revenue, 0);
  return `Revenus actuels: total=${total.toFixed(0)}€/mois. Plateformes: ${platforms.map(p => `${p.name}=${p.revenue}€`).join(', ')}`;
}

// ── ROUTES: PLATFORMS ─────────────────────────────────────────────────────────

app.get('/api/platforms', (req, res) => {
  const platforms = db.prepare('SELECT * FROM platforms ORDER BY revenue DESC').all();
  const accounts  = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all();
  res.json(platforms.map(p => ({
    ...p,
    accounts: accounts.filter(a => a.platform_id === p.id)
  })));
});

app.post('/api/platforms', (req, res) => {
  const { name, type = 'other', color = '#00d4ff', icon = 'Globe' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const id = uuidv4();
  db.prepare('INSERT INTO platforms (id,name,type,color,icon) VALUES (?,?,?,?,?)').run(id, name, type, color, icon);
  res.json(db.prepare('SELECT * FROM platforms WHERE id=?').get(id));
});

app.put('/api/platforms/:id', (req, res) => {
  const { revenue, followers } = req.body;
  db.prepare('UPDATE platforms SET revenue=?, followers=? WHERE id=?').run(revenue ?? 0, followers ?? 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/platforms/:id', (req, res) => {
  db.prepare('DELETE FROM platforms WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/platforms/:id/accounts', (req, res) => {
  const { name, username = '', revenue = 0, followers = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const id = uuidv4();
  db.prepare('INSERT INTO accounts (id,platform_id,name,username,revenue,followers) VALUES (?,?,?,?,?,?)').run(id, req.params.id, name, username, revenue, followers);
  res.json(db.prepare('SELECT * FROM accounts WHERE id=?').get(id));
});

app.delete('/api/accounts/:id', (req, res) => {
  db.prepare('DELETE FROM accounts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── ROUTES: DASHBOARD ─────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res) => {
  const platforms    = db.prepare('SELECT * FROM platforms').all();
  const trends       = db.prepare("SELECT * FROM trends WHERE status='active' ORDER BY score DESC LIMIT 3").all();
  const opps         = db.prepare("SELECT * FROM opportunities WHERE status='new' ORDER BY score DESC LIMIT 3").all();
  const experiments  = db.prepare("SELECT * FROM experiments WHERE status='running'").all();
  const ideas        = db.prepare('SELECT * FROM content_ideas ORDER BY score DESC LIMIT 5').all();
  const snapshots    = db.prepare('SELECT * FROM revenue_snapshots ORDER BY month ASC LIMIT 12').all();
  const totalRevenue = platforms.reduce((s, p) => s + p.revenue, 0);
  const totalFollowers = platforms.reduce((s, p) => s + p.followers, 0);

  res.json({
    total_revenue:   totalRevenue,
    total_followers: totalFollowers,
    platform_count:  platforms.length,
    trending_count:  trends.length,
    hot_opportunities: opps,
    active_experiments: experiments.length,
    top_trends: trends,
    top_ideas: ideas,
    revenue_chart: snapshots,
    platforms: platforms.sort((a,b) => b.revenue - a.revenue),
  });
});

app.post('/api/dashboard/snapshot', (req, res) => {
  const total = db.prepare('SELECT SUM(revenue) as s FROM platforms').get().s || 0;
  const month = new Date().toISOString().slice(0, 7);
  db.prepare('INSERT OR REPLACE INTO revenue_snapshots (id,month,total) VALUES (?,?,?)').run(uuidv4(), month, total);
  res.json({ ok: true, month, total });
});

// ── ROUTES: TRENDS ────────────────────────────────────────────────────────────

app.get('/api/trends', (req, res) => {
  res.json(db.prepare('SELECT * FROM trends ORDER BY score DESC').all());
});

app.post('/api/trends', (req, res) => {
  const { niche, platform = '', description = '' } = req.body;
  if (!niche) return res.status(400).json({ error: 'Niche requise' });
  const id = uuidv4();
  const score = rnd(55, 95);
  db.prepare('INSERT INTO trends (id,niche,platform,description,score,revenue_potential,competition,virality) VALUES (?,?,?,?,?,?,?,?)').run(id, niche, platform, description, score, rnd(5,10), rnd(2,8), rnd(5,10));
  res.json(db.prepare('SELECT * FROM trends WHERE id=?').get(id));
});

app.delete('/api/trends/:id', (req, res) => {
  db.prepare('DELETE FROM trends WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/trends/ai-detect', async (req, res) => {
  try {
    const { niche = 'contenu digital', platforms = [] } = req.body;
    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{
        type: 'text',
        text: `Tu es un expert en tendances virales et monétisation digitale. ${ctx}. Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.`,
        cache_control: { type: 'ephemeral' }
      }],
      messages: [{
        role: 'user',
        content: `Identifie 5 tendances ultra-rentables dans "${niche}" sur ${platforms.join(', ') || 'TikTok, YouTube, Instagram'}.
Retourne UNIQUEMENT ce JSON (rien d'autre):
{"trends":[{"niche":"...","platform":"...","description":"...","revenue_potential":8,"competition":4,"virality":9,"score":82}]}`
      }]
    });

    const text = msg.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON invalide');

    const data = JSON.parse(jsonMatch[0]);
    const saved = (data.trends || []).slice(0, 5).map(t => {
      const id = uuidv4();
      db.prepare('INSERT INTO trends (id,niche,platform,description,score,revenue_potential,competition,virality) VALUES (?,?,?,?,?,?,?,?)').run(id, t.niche||'', t.platform||'', t.description||'', t.score||rnd(60,90), t.revenue_potential||rnd(5,10), t.competition||rnd(2,7), t.virality||rnd(5,10));
      return db.prepare('SELECT * FROM trends WHERE id=?').get(id);
    });

    res.json({ trends: saved });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── ROUTES: CONTENT IDEAS ─────────────────────────────────────────────────────

app.get('/api/content-ideas', (req, res) => {
  res.json(db.prepare('SELECT * FROM content_ideas ORDER BY score DESC').all());
});

app.delete('/api/content-ideas/:id', (req, res) => {
  db.prepare('DELETE FROM content_ideas WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/content-ideas/generate', async (req, res) => {
  try {
    const { title, platform, content_type = 'post', brief = '', tone = 'engageant' } = req.body;
    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const typeMap = {
      video:   'un script vidéo complet avec accroche + développement + CTA',
      post:    'un post viral avec hook puissant, corps, hashtags optimisés',
      hook:    '10 hooks viraux ultra-cliquables pour maximiser le CTR',
      product: 'une fiche produit digital complète (titre, description, prix suggéré, arguments)',
      email:   'un email marketing complet (objet A/B, corps persuasif, CTA)'
    };

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [{
        type: 'text',
        text: `Tu es un expert en création de contenu viral et en monétisation digitale. ${ctx}. Génère du contenu optimisé pour ${platform || 'les réseaux sociaux'} avec un ton ${tone}.`,
        cache_control: { type: 'ephemeral' }
      }],
      messages: [{ role: 'user', content: `Génère ${typeMap[content_type] || 'un contenu optimisé'} pour: "${title}".\nBrief: ${brief || 'Aucun'}.\nOptimise pour la viralité et la monétisation max.` }]
    });

    const body = msg.content[0].text;
    const id   = uuidv4();
    db.prepare('INSERT INTO content_ideas (id,title,platform,content_type,body,score,status) VALUES (?,?,?,?,?,?,?)').run(id, title||'Sans titre', platform||'', content_type, body, rnd(65,95), 'generated');
    res.json(db.prepare('SELECT * FROM content_ideas WHERE id=?').get(id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/content-ideas/batch', async (req, res) => {
  try {
    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{ type: 'text', text: `Tu es un stratège en contenu digital et monétisation. ${ctx}. Réponds UNIQUEMENT avec du JSON valide.`, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Génère 6 idées de contenu à fort potentiel de revenu. JSON uniquement:
{"ideas":[{"title":"...","platform":"YouTube","content_type":"video","hook":"...","body":"...","score":88}]}`
      }]
    });

    const text  = msg.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON invalide');

    const data  = JSON.parse(match[0]);
    const saved = (data.ideas || []).slice(0, 6).map(i => {
      const id = uuidv4();
      db.prepare('INSERT INTO content_ideas (id,title,platform,content_type,hook,body,score,status) VALUES (?,?,?,?,?,?,?,?)').run(id, i.title||'', i.platform||'', i.content_type||'post', i.hook||'', i.body||'', i.score||rnd(60,92), 'generated');
      return db.prepare('SELECT * FROM content_ideas WHERE id=?').get(id);
    });

    res.json({ ideas: saved });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── ROUTES: EXPERIMENTS ───────────────────────────────────────────────────────

app.get('/api/experiments', (req, res) => {
  res.json(db.prepare('SELECT * FROM experiments ORDER BY created_at DESC').all());
});

app.post('/api/experiments', (req, res) => {
  const { title, hypothesis = '', variant_a, variant_b, platform = '' } = req.body;
  if (!title || !variant_a || !variant_b) return res.status(400).json({ error: 'Champs requis manquants' });
  const id = uuidv4();
  db.prepare('INSERT INTO experiments (id,title,hypothesis,variant_a,variant_b,platform) VALUES (?,?,?,?,?,?)').run(id, title, hypothesis, variant_a, variant_b, platform);
  res.json(db.prepare('SELECT * FROM experiments WHERE id=?').get(id));
});

app.delete('/api/experiments/:id', (req, res) => {
  db.prepare('DELETE FROM experiments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/experiments/:id/analyze', async (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM experiments WHERE id=?').get(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Test introuvable' });
    const ai = getAI();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyse ce test A/B et détermine le gagnant:
Test: ${exp.title}
Hypothèse: ${exp.hypothesis}
Variante A: ${exp.variant_a}
Variante B: ${exp.variant_b}
Plateforme: ${exp.platform}

Donne ton analyse en 4 phrases max, puis termine EXACTEMENT par "WINNER:A" ou "WINNER:B" ou "WINNER:TIE".`
      }]
    });

    const analysis = msg.content[0].text;
    const winner   = analysis.includes('WINNER:A') ? 'a' : analysis.includes('WINNER:B') ? 'b' : 'tie';

    db.prepare('UPDATE experiments SET status=?,winner=?,insights=? WHERE id=?').run('completed', winner, analysis, exp.id);
    res.json({ analysis, winner, experiment: db.prepare('SELECT * FROM experiments WHERE id=?').get(exp.id) });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── ROUTES: OPPORTUNITIES ─────────────────────────────────────────────────────

app.get('/api/opportunities', (req, res) => {
  res.json(db.prepare('SELECT * FROM opportunities ORDER BY score DESC').all());
});

app.post('/api/opportunities', (req, res) => {
  const { title, niche = '', platform = '', description = '', revenue_estimate = 0 } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  const id    = uuidv4();
  const score = rnd(60, 95);
  const prio  = score >= 85 ? 'urgent' : score >= 70 ? 'high' : 'medium';
  db.prepare('INSERT INTO opportunities (id,title,niche,platform,description,score,revenue_estimate,priority) VALUES (?,?,?,?,?,?,?,?)').run(id, title, niche, platform, description, score, revenue_estimate, prio);
  res.json(db.prepare('SELECT * FROM opportunities WHERE id=?').get(id));
});

app.delete('/api/opportunities/:id', (req, res) => {
  db.prepare('DELETE FROM opportunities WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/opportunities/ai-scan', async (req, res) => {
  try {
    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{ type: 'text', text: `Tu es un consultant expert en machine à cash digitale. ${ctx}. Réponds UNIQUEMENT avec du JSON valide.`, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Identifie 5 opportunités business IMMÉDIATEMENT monétisables. JSON uniquement:
{"opportunities":[{"title":"...","niche":"...","platform":"...","description":"...","score":88,"revenue_estimate":2500}]}`
      }]
    });

    const text  = msg.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON invalide');

    const data  = JSON.parse(match[0]);
    const saved = (data.opportunities || []).slice(0, 5).map(o => {
      const id    = uuidv4();
      const score = o.score || rnd(70, 95);
      const prio  = score >= 85 ? 'urgent' : score >= 70 ? 'high' : 'medium';
      db.prepare('INSERT INTO opportunities (id,title,niche,platform,description,score,revenue_estimate,priority) VALUES (?,?,?,?,?,?,?,?)').run(id, o.title||'', o.niche||'', o.platform||'', o.description||'', score, o.revenue_estimate||rnd(500,3000), prio);
      return db.prepare('SELECT * FROM opportunities WHERE id=?').get(id);
    });

    res.json({ opportunities: saved });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── ROUTES: AI ────────────────────────────────────────────────────────────────

app.post('/api/ai/optimize', async (req, res) => {
  try {
    const ai  = getAI();
    const ctx = buildRevenueCtx();
    const trends  = db.prepare("SELECT * FROM trends WHERE status='active' ORDER BY score DESC LIMIT 5").all();
    const opps    = db.prepare("SELECT * FROM opportunities WHERE status='new' ORDER BY score DESC LIMIT 5").all();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{ type: 'text', text: `Tu es CRÉA-IA, la machine à revenus automatisée. ${ctx}\nTendances actives: ${trends.map(t=>t.niche).join(', ')}\nOpportunités: ${opps.map(o=>o.title).join(', ')}`, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Génère un plan d'optimisation COMPLET:

## 🚀 ACTIONS CETTE SEMAINE (top 3)
[Actions concrètes avec impact estimé en €]

## 💰 QUICK WINS (24-48h)
[Ce qui génère du cash le plus vite]

## 📈 MACHINE À REVENUS — TOP 3 LEVIERS
[Leviers à amplifier immédiatement]

## ⚡ AUTOMATISATIONS RECOMMANDÉES
[Ce qu'on peut automatiser pour réduire le travail manuel]

## 📊 MÉTRIQUES CLÉS À SURVEILLER
[KPIs pour savoir si ça fonctionne]`
      }]
    });

    res.json({ plan: msg.content[0].text });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const msgs = [...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: message }];

    const resp = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: [{ type: 'text', text: `Tu es CRÉA-IA, l'assistant business intelligent de Crea Action. ${ctx}. Réponds en français, de façon concise et actionnable. Focus sur la maximisation des revenus.`, cache_control: { type: 'ephemeral' } }],
      messages: msgs
    });

    res.json({ response: resp.content[0].text });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/ai/daily-insight', async (req, res) => {
  try {
    const cacheKey = `insight_${new Date().toISOString().slice(0,10)}`;
    const cached   = db.prepare('SELECT content FROM ai_cache WHERE cache_key=?').get(cacheKey);
    if (cached) return res.json({ insight: cached.content, cached: true });

    const ai  = getAI();
    const ctx = buildRevenueCtx();

    const msg = await ai.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 300,
      system: [{ type: 'text', text: `Tu es CRÉA-IA. ${ctx}. Donne un conseil ultra-actionnable en 3 phrases max. 1 emoji + conseil. Pas de titre.`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: 'Donne le conseil du jour pour maximiser mes revenus.' }]
    });

    const insight = msg.content[0].text;
    db.prepare('INSERT OR REPLACE INTO ai_cache (id,cache_key,content) VALUES (?,?,?)').run(uuidv4(), cacheKey, insight);
    res.json({ insight, cached: false });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── Catch-all → React app (production) ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log(`  ║  🔥 CREA ACTION SaaS — BACKEND       ║`);
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log(`  ║  AI: ${process.env.ANTHROPIC_API_KEY ? '✅ Connecté' : '⚠️  Clé manquante (.env)'}          ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

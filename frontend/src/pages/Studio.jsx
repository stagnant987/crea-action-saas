import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Factory, TestTube, Cpu,
  Sparkles, Plus, Trash2, Play, Activity, Loader,
} from 'lucide-react';
import { api, fmt } from '../lib/api';
import { useToast } from '../components/Layout';

const C = { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 };
const inp = {
  width:'100%', padding:'9px 13px', background:'#13132a',
  border:'1px solid #1e1e3a', borderRadius:8, color:'#e2e8f0',
  fontFamily:'Inter,sans-serif', fontSize:13,
};
const btn = (c='cyan') => ({
  display:'inline-flex', alignItems:'center', gap:6,
  padding:'8px 16px', borderRadius:8, cursor:'pointer',
  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
  letterSpacing:.4, border:'1px solid transparent', transition:'all .2s',
  ...(c==='cyan'   ? { background:'rgba(0,212,255,.08)',   color:'#00d4ff', borderColor:'rgba(0,212,255,.3)' }  : {}),
  ...(c==='purple' ? { background:'rgba(139,92,246,.08)',  color:'#a78bfa', borderColor:'rgba(139,92,246,.3)' } : {}),
  ...(c==='green'  ? { background:'rgba(16,185,129,.08)',  color:'#10b981', borderColor:'rgba(16,185,129,.3)' } : {}),
  ...(c==='yellow' ? { background:'rgba(245,158,11,.08)',  color:'#f59e0b', borderColor:'rgba(245,158,11,.3)' } : {}),
  ...(c==='red'    ? { background:'rgba(239,68,68,.06)',   color:'#ef4444', borderColor:'rgba(239,68,68,.25)' }  : {}),
  ...(c==='ghost'  ? { background:'transparent',           color:'#94a3b8', borderColor:'#1e1e3a' }             : {}),
});

const TABS = [
  { id:'trends',      label:'📡 Trend Engine',       icon: Radio,    color:'#00d4ff' },
  { id:'content',     label:'🏭 Content Factory',    icon: Factory,  color:'#f59e0b' },
  { id:'experiments', label:'🧪 Test & Scale',       icon: TestTube, color:'#8b5cf6' },
  { id:'optimizer',   label:'⚡ Auto Optimizer',     icon: Cpu,      color:'#10b981' },
];

export default function Studio() {
  const [tab, setTab]         = useState('trends');
  const toast                 = useToast();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3, color:'#e2e8f0' }}>
            AUTO MONEY STUDIO
          </h1>
          <span style={{ fontSize:9, padding:'3px 8px', borderRadius:20, fontWeight:700, letterSpacing:1,
            background:'rgba(245,158,11,.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.3)' }}>
            🔥 HUB IA
          </span>
        </div>
        <p style={{ fontSize:12, color:'#475569' }}>
          Détecte · Génère · Teste · Optimise — Machine à revenus automatisée
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, padding:'4px',
        background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9,
            cursor:'pointer', fontSize:12, fontWeight:600, letterSpacing:.3,
            border:'1px solid transparent', transition:'all .18s',
            background: tab === t.id ? 'rgba(0,212,255,.08)' : 'transparent',
            borderColor: tab === t.id ? 'rgba(0,212,255,.2)' : 'transparent',
            color: tab === t.id ? t.color : '#475569',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'trends'      && <TrendEngine toast={toast} />}
      {tab === 'content'     && <ContentFactory toast={toast} />}
      {tab === 'experiments' && <TestScale toast={toast} />}
      {tab === 'optimizer'   && <AutoOptimizer toast={toast} />}
    </div>
  );
}

// ══ A. TREND ENGINE ═══════════════════════════════════════════════════════════
function TrendEngine({ toast }) {
  const [trends, setTrends]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [niche, setNiche]     = useState('');
  const [manual, setManual]   = useState(false);

  useEffect(() => { api.trends().then(setTrends).catch(() => {}); }, []);

  const detect = async () => {
    setLoading(true);
    try {
      const r = await api.aiTrends({ niche, platforms:['TikTok','YouTube','Instagram'] });
      setTrends(t => [...(r.trends || []), ...t]);
      toast(`${r.trends?.length || 0} tendances détectées !`, 'ok');
    } catch(e) { toast(e.message, 'err'); }
    setLoading(false);
  };

  const addManual = async () => {
    if (!niche.trim()) return;
    try {
      const t = await api.addTrend({ niche, platform: 'Multi', description: '' });
      setTrends(prev => [t, ...prev]);
      setNiche(''); setManual(false);
      toast('Tendance ajoutée', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer ?')) return;
    await api.deleteTrend(id);
    setTrends(t => t.filter(x => x.id !== id));
    toast('Supprimé', 'info');
  };

  const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#00d4ff' : '#f59e0b';

  return (
    <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16 }}>
      {/* Controls */}
      <div>
        <div style={C}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:14 }}>DÉTECTER DES NICHES</div>
          <input style={{ ...inp, marginBottom:10 }} placeholder="Niche (ex: IA, Finance, Fitness)"
            value={niche} onChange={e => setNiche(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && detect()} />
          <button onClick={detect} disabled={loading} style={{ ...btn('cyan'), width:'100%', justifyContent:'center' }}>
            {loading ? <><Loader size={13} className="spin" /> Analyse en cours...</> : <><Sparkles size={13} /> Détecter avec l'IA</>}
          </button>
          <div style={{ marginTop:10, display:'flex', gap:6 }}>
            <button onClick={() => setManual(!manual)} style={{ ...btn('ghost'), flex:1, justifyContent:'center' }}>
              <Plus size={12} /> Manuel
            </button>
          </div>
          {manual && (
            <div style={{ marginTop:10 }}>
              <input style={{ ...inp, marginBottom:8 }} placeholder="Nom de la niche"
                value={niche} onChange={e => setNiche(e.target.value)} />
              <button onClick={addManual} style={{ ...btn('green'), width:'100%', justifyContent:'center' }}>
                Ajouter
              </button>
            </div>
          )}
        </div>
        <div style={{ ...C, marginTop:12 }}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:10 }}>SCORING</div>
          {[['🟢','Score ≥ 80','Hot — agir maintenant'],['🔵','Score 60-79','Prometteuse'],['🟡','Score < 60','À surveiller']].map(([e,t,d]) => (
            <div key={t} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
              <span>{e}</span>
              <div>
                <div style={{ fontSize:11, color:'#e2e8f0', fontWeight:600 }}>{t}</div>
                <div style={{ fontSize:10, color:'#475569' }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend cards */}
      <div>
        {trends.length === 0 && !loading && (
          <div style={{ ...C, textAlign:'center', padding:40 }}>
            <Radio size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
            <div style={{ color:'#475569', fontSize:13 }}>Lancez une détection pour voir les tendances rentables</div>
          </div>
        )}
        <div style={{ display:'grid', gap:10 }}>
          {trends.map(t => (
            <div key={t.id} className="card-hover" style={{ ...C, padding:'16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:3 }}>{t.niche}</div>
                  <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                    padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>{t.platform}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div className="font-display" style={{ fontSize:22, fontWeight:700, color: scoreColor(t.score) }}>
                    {t.score}
                  </div>
                  <button onClick={() => del(t.id)} style={{ ...btn('red'), padding:'5px 8px' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {t.description && (
                <p style={{ fontSize:12, color:'#94a3b8', marginBottom:10, lineHeight:1.6 }}>{t.description}</p>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { l:'💰 Revenu', v:t.revenue_potential, max:10, c:'#10b981' },
                  { l:'⚔️ Concur.', v:10-t.competition, max:10, c:'#00d4ff' },
                  { l:'🔥 Viralité', v:t.virality, max:10, c:'#f59e0b' },
                ].map(({ l, v, max, c }) => (
                  <div key={l} style={{ background:'#13132a', borderRadius:8, padding:10 }}>
                    <div style={{ fontSize:10, color:'#475569', marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:c, marginBottom:4 }}>{v}/{max}</div>
                    <div className="score-bar">
                      <div className="score-fill" style={{ width:`${(v/max)*100}%`, background:c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══ B. CONTENT FACTORY ════════════════════════════════════════════════════════
function ContentFactory({ toast }) {
  const [ideas, setIdeas]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [batchLoad, setBatch]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [form, setForm]           = useState({ title:'', platform:'TikTok', content_type:'video', brief:'', tone:'engageant' });

  useEffect(() => { api.contentIdeas().then(setIdeas).catch(() => {}); }, []);

  const gen = async () => {
    if (!form.title.trim()) { toast('Titre requis', 'err'); return; }
    setLoading(true);
    try {
      const idea = await api.generateContent(form);
      setIdeas(prev => [idea, ...prev]);
      setForm(f => ({ ...f, title:'', brief:'' }));
      toast('Contenu généré !', 'ok');
    } catch(e) { toast(e.message, 'err'); }
    setLoading(false);
  };

  const batch = async () => {
    setBatch(true);
    try {
      const r = await api.batchContent();
      if (r.ideas) { setIdeas(prev => [...r.ideas, ...prev]); toast(`${r.ideas.length} idées générées !`, 'ok'); }
    } catch(e) { toast(e.message, 'err'); }
    setBatch(false);
  };

  const del = async (id) => {
    await api.deleteIdea(id);
    setIdeas(i => i.filter(x => x.id !== id));
  };

  const typeIcon = { video:'🎬', post:'📝', hook:'🪝', product:'📦', email:'📧' };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:16 }}>
      {/* Form */}
      <div style={C}>
        <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:14 }}>GÉNÉRER DU CONTENU</div>
        {[
          { label:'Titre / Idée', el:<input style={inp} placeholder="Ex: 5 erreurs qui coûtent cher..."
              value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} /> },
          { label:'Plateforme', el:<select style={inp} value={form.platform} onChange={e => setForm(f=>({...f,platform:e.target.value}))}>
              {['TikTok','YouTube','Instagram','Twitter','LinkedIn','Substack'].map(p=><option key={p}>{p}</option>)}
            </select> },
          { label:'Format', el:<select style={inp} value={form.content_type} onChange={e => setForm(f=>({...f,content_type:e.target.value}))}>
              <option value="video">🎬 Script vidéo</option>
              <option value="post">📝 Post réseau</option>
              <option value="hook">🪝 Hooks viraux</option>
              <option value="product">📦 Fiche produit</option>
              <option value="email">📧 Email marketing</option>
            </select> },
          { label:'Ton', el:<select style={inp} value={form.tone} onChange={e => setForm(f=>({...f,tone:e.target.value}))}>
              {['engageant','professionnel','inspirant','humoristique','urgent'].map(t=><option key={t}>{t}</option>)}
            </select> },
          { label:'Brief (optionnel)', el:<textarea style={{ ...inp, minHeight:70, resize:'vertical' }}
              placeholder="Contexte, audience, angle..."
              value={form.brief} onChange={e => setForm(f=>({...f,brief:e.target.value}))} /> },
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:10, color:'#475569', letterSpacing:1, marginBottom:5, textTransform:'uppercase' }}>{label}</label>
            {el}
          </div>
        ))}
        <button onClick={gen} disabled={loading} style={{ ...btn('yellow'), width:'100%', justifyContent:'center', marginBottom:8 }}>
          {loading ? <><Loader size={13} className="spin" /> Génération...</> : <><Sparkles size={13} /> Générer avec l'IA</>}
        </button>
        <button onClick={batch} disabled={batchLoad} style={{ ...btn('ghost'), width:'100%', justifyContent:'center' }}>
          {batchLoad ? <><Loader size={13} className="spin" /> En cours...</> : <><Factory size={13} /> Batch × 6 idées</>}
        </button>
      </div>

      {/* Ideas list */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {ideas.length === 0 && (
          <div style={{ ...C, textAlign:'center', padding:40 }}>
            <Factory size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
            <div style={{ color:'#475569', fontSize:13 }}>Générez votre premier contenu ou lancez un batch</div>
          </div>
        )}
        {ideas.map(idea => (
          <div key={idea.id} className="card-hover" style={C}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1, marginRight:12 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:16 }}>{typeIcon[idea.content_type] || '📄'}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{idea.title}</span>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'#13132a',
                    border:'1px solid #2a2a4a', color:'#94a3b8' }}>{idea.platform}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div className="font-display" style={{ fontSize:18, fontWeight:700,
                  color: idea.score >= 80 ? '#10b981' : '#00d4ff' }}>{idea.score}</div>
                <button onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}
                  style={{ ...btn('ghost'), padding:'5px 10px', fontSize:11 }}>
                  {expanded === idea.id ? '▲' : '▼'}
                </button>
                <button onClick={() => del(idea.id)} style={{ ...btn('red'), padding:'5px 8px' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {expanded === idea.id && idea.body && (
              <div style={{ marginTop:12, padding:14, background:'#13132a',
                borderRadius:8, border:'1px solid #1e1e3a' }}>
                <div className="ai-prose">{idea.body}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══ C. TEST & SCALE ══════════════════════════════════════════════════════════
function TestScale({ toast }) {
  const [exps, setExps]           = useState([]);
  const [analyzing, setAnalyzing] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ title:'', hypothesis:'', variant_a:'', variant_b:'', platform:'' });

  useEffect(() => { api.experiments().then(setExps).catch(() => {}); }, []);

  const add = async () => {
    if (!form.title || !form.variant_a || !form.variant_b) { toast('Remplis tous les champs', 'err'); return; }
    try {
      const e = await api.addExperiment(form);
      setExps(prev => [e, ...prev]);
      setForm({ title:'', hypothesis:'', variant_a:'', variant_b:'', platform:'' });
      setShowForm(false);
      toast('Test créé !', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const analyze = async (id) => {
    setAnalyzing(id);
    try {
      const r = await api.analyzeExp(id);
      setExps(prev => prev.map(e => e.id === id ? r.experiment : e));
      toast(`Gagnant: Variante ${r.winner === 'a' ? 'A' : r.winner === 'b' ? 'B' : 'Égalité'}`, 'ok');
    } catch(e) { toast(e.message, 'err'); }
    setAnalyzing(null);
  };

  const del = async (id) => {
    if (!confirm('Supprimer ce test ?')) return;
    await api.deleteExp(id);
    setExps(e => e.filter(x => x.id !== id));
  };

  const winnerStyle = (w, v) => ({
    background: w === v ? 'rgba(16,185,129,.08)' : '#13132a',
    border: `1px solid ${w === v ? 'rgba(16,185,129,.3)' : '#1e1e3a'}`,
    borderRadius:8, padding:'10px 14px', flex:1, position:'relative',
  });

  return (
    <div>
      {/* Add button */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button onClick={() => setShowForm(!showForm)} style={btn('purple')}>
          <Plus size={13} /> Nouveau test A/B
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ ...C, marginBottom:16 }}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:14 }}>CRÉER UN TEST A/B</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Titre du test</label>
              <input style={inp} placeholder="Ex: Accroche vidéo A vs B" value={form.title}
                onChange={e => setForm(f=>({...f,title:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Plateforme</label>
              <input style={inp} placeholder="TikTok / YouTube..." value={form.platform}
                onChange={e => setForm(f=>({...f,platform:e.target.value}))} />
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Hypothèse</label>
            <input style={inp} placeholder="Si on change X, les résultats Y vont augmenter parce que Z"
              value={form.hypothesis} onChange={e => setForm(f=>({...f,hypothesis:e.target.value}))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:10, color:'#10b981', display:'block', marginBottom:5 }}>✅ Variante A</label>
              <textarea style={{ ...inp, minHeight:80 }} placeholder="Description variante A..."
                value={form.variant_a} onChange={e => setForm(f=>({...f,variant_a:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#8b5cf6', display:'block', marginBottom:5 }}>🔵 Variante B</label>
              <textarea style={{ ...inp, minHeight:80 }} placeholder="Description variante B..."
                value={form.variant_b} onChange={e => setForm(f=>({...f,variant_b:e.target.value}))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={add} style={btn('purple')}><Plus size={13} /> Créer le test</button>
            <button onClick={() => setShowForm(false)} style={btn('ghost')}>Annuler</button>
          </div>
        </div>
      )}

      {exps.length === 0 && !showForm && (
        <div style={{ ...C, textAlign:'center', padding:48 }}>
          <TestTube size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
          <div style={{ color:'#475569', fontSize:13 }}>Créez votre premier test A/B pour optimiser vos résultats</div>
        </div>
      )}

      <div style={{ display:'grid', gap:12 }}>
        {exps.map(e => (
          <div key={e.id} style={C}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:4 }}>{e.title}</div>
                <div style={{ display:'flex', gap:8 }}>
                  {e.platform && <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                    padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>{e.platform}</span>}
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                    ...(e.status==='running' ? { background:'rgba(0,212,255,.08)', color:'#00d4ff', border:'1px solid rgba(0,212,255,.2)' }
                      : e.status==='completed' ? { background:'rgba(16,185,129,.08)', color:'#10b981', border:'1px solid rgba(16,185,129,.2)' }
                      : { background:'#13132a', color:'#94a3b8', border:'1px solid #1e1e3a' }) }}>
                    {e.status === 'running' ? '⏳ En cours' : e.status === 'completed' ? '✅ Terminé' : e.status}
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {e.status === 'running' && (
                  <button onClick={() => analyze(e.id)} disabled={analyzing === e.id} style={btn('cyan')}>
                    {analyzing === e.id ? <><Loader size={12} className="spin" /> Analyse...</> : <><Play size={12} /> Analyser</>}
                  </button>
                )}
                <button onClick={() => del(e.id)} style={{ ...btn('red'), padding:'7px 10px' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Variants */}
            <div style={{ display:'flex', gap:10, marginBottom: e.insights ? 12 : 0 }}>
              <div style={winnerStyle(e.winner, 'a')}>
                {e.winner === 'a' && <span style={{ position:'absolute', top:8, right:8, fontSize:9,
                  background:'rgba(16,185,129,.15)', color:'#10b981', padding:'2px 6px', borderRadius:20, fontWeight:700 }}>GAGNANT</span>}
                <div style={{ fontSize:10, color:'#10b981', fontWeight:700, marginBottom:5 }}>VARIANTE A</div>
                <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{e.variant_a}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', color:'#2a2a4a', fontWeight:700 }}>VS</div>
              <div style={winnerStyle(e.winner, 'b')}>
                {e.winner === 'b' && <span style={{ position:'absolute', top:8, right:8, fontSize:9,
                  background:'rgba(139,92,246,.15)', color:'#8b5cf6', padding:'2px 6px', borderRadius:20, fontWeight:700 }}>GAGNANT</span>}
                <div style={{ fontSize:10, color:'#8b5cf6', fontWeight:700, marginBottom:5 }}>VARIANTE B</div>
                <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{e.variant_b}</div>
              </div>
            </div>

            {e.insights && (
              <div style={{ marginTop:12, padding:12, background:'rgba(16,185,129,.04)',
                border:'1px solid rgba(16,185,129,.15)', borderRadius:8 }}>
                <div style={{ fontSize:10, color:'#10b981', letterSpacing:1, marginBottom:6 }}>💡 ANALYSE IA</div>
                <div className="ai-prose">{e.insights}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══ D. AUTO OPTIMIZER ════════════════════════════════════════════════════════
function AutoOptimizer({ toast }) {
  const [plan, setPlan]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [chatHistory, setHistory] = useState([]);
  const [msg, setMsg]             = useState('');
  const [chatLoad, setChatLoad]   = useState(false);
  const chatRef                   = useRef(null);

  const optimize = async () => {
    setLoading(true);
    try {
      const r = await api.optimize();
      setPlan(r.plan);
      toast('Plan d\'optimisation généré !', 'ok');
    } catch(e) { toast(e.message, 'err'); }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!msg.trim()) return;
    const userMsg = msg;
    setMsg('');
    const newHistory = [...chatHistory, { role:'user', content: userMsg }];
    setHistory(newHistory);
    setChatLoad(true);
    try {
      const r = await api.chat({ message: userMsg, history: chatHistory });
      setHistory([...newHistory, { role:'assistant', content: r.response }]);
    } catch(e) {
      setHistory([...newHistory, { role:'assistant', content:'⚠️ ' + e.message }]);
    }
    setChatLoad(false);
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16 }}>
      {/* Optimizer */}
      <div>
        <div style={C}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:10, color:'#475569', letterSpacing:2 }}>PLAN D'OPTIMISATION IA</div>
            <button onClick={optimize} disabled={loading} style={btn('green')}>
              {loading ? <><Loader size={13} className="spin" /> Génération...</> : <><Cpu size={13} /> Générer le plan</>}
            </button>
          </div>
          {plan ? (
            <div className="ai-prose" style={{ maxHeight:500, overflowY:'auto' }}>{plan}</div>
          ) : (
            <div style={{ textAlign:'center', padding:48 }}>
              <Cpu size={40} style={{ color:'#2a2a4a', marginBottom:12 }} />
              <div style={{ color:'#475569', fontSize:13, marginBottom:8 }}>
                L'IA analyse vos données et génère un plan pour maximiser vos revenus
              </div>
              <div style={{ fontSize:11, color:'#2a2a4a' }}>
                Tendances · Expériences · Opportunités → Plan d'action concret
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ ...C, marginTop:12 }}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:12 }}>⚡ ACTIONS RAPIDES</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Détecter tendances', action:() => {}, color:'#00d4ff', tab:'trends' },
              { label:'Générer contenu ×6', action:() => {}, color:'#f59e0b', tab:'content' },
              { label:'Scanner opportunités', action:() => {}, color:'#10b981', tab:'opps' },
            ].map(a => (
              <div key={a.label} style={{ padding:'14px', background:'#13132a',
                border:`1px solid ${a.color}20`, borderRadius:10, textAlign:'center', cursor:'pointer',
                transition:'all .2s' }}>
                <div style={{ fontSize:12, fontWeight:600, color:a.color }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div style={{ ...C, display:'flex', flexDirection:'column', height:'fit-content', maxHeight:580 }}>
        <div style={{ fontSize:10, color:'#8b5cf6', letterSpacing:2, marginBottom:12, fontWeight:700 }}>
          🤖 CRÉA-IA ASSISTANT
        </div>
        <div ref={chatRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column',
          gap:10, marginBottom:12, minHeight:300, maxHeight:380 }}>
          {chatHistory.length === 0 && (
            <div style={{ color:'#475569', fontSize:12, lineHeight:1.7, padding:'10px 0' }}>
              👋 Je suis CRÉA-IA. Posez-moi des questions sur vos revenus, vos stratégies, ou demandez un plan de contenu.
            </div>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} style={{
              padding:'10px 13px', borderRadius:10, fontSize:12, lineHeight:1.6, wordBreak:'break-word',
              maxWidth:'90%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user'
                ? 'rgba(0,212,255,.1)' : 'rgba(139,92,246,.08)',
              border: `1px solid ${m.role === 'user' ? 'rgba(0,212,255,.2)' : 'rgba(139,92,246,.2)'}`,
              color:'#e2e8f0', whiteSpace:'pre-wrap',
            }}>
              {m.content}
            </div>
          ))}
          {chatLoad && (
            <div style={{ padding:'10px 13px', borderRadius:10, background:'rgba(139,92,246,.06)',
              border:'1px solid rgba(139,92,246,.2)', fontSize:12, color:'#94a3b8', display:'flex', gap:6 }}>
              <Loader size={12} className="spin" /> CRÉA-IA réfléchit...
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
          {['📊 Meilleure plateforme ?', '💡 Conseils semaine', '💰 Résumé revenus'].map(q => (
            <button key={q} onClick={() => { setMsg(q); }}
              style={{ fontSize:10, padding:'3px 9px', borderRadius:20, background:'#13132a',
                border:'1px solid #2a2a4a', color:'#94a3b8', cursor:'pointer' }}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Posez une question..."
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            style={{ ...inp, flex:1, height:40, resize:'none' }} />
          <button onClick={sendChat} disabled={chatLoad} style={{
            ...btn('purple'), padding:'9px 14px', flexShrink:0,
          }}>
            {chatLoad ? <Loader size={13} className="spin" /> : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}

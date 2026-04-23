import React, { useState, useEffect } from 'react';
import { Target, Sparkles, Plus, Trash2, Loader, TrendingUp } from 'lucide-react';
import { api, fmt } from '../lib/api';
import { useToast } from '../components/Layout';

const C    = { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 };
const inp  = { width:'100%', padding:'9px 13px', background:'#13132a', border:'1px solid #1e1e3a', borderRadius:8, color:'#e2e8f0', fontFamily:'Inter,sans-serif', fontSize:13 };
const B    = (c='cyan') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600, letterSpacing:.4, border:'1px solid transparent', transition:'all .2s',
  ...(c==='cyan'   ? { background:'rgba(0,212,255,.08)',  color:'#00d4ff', borderColor:'rgba(0,212,255,.3)' }  : {}),
  ...(c==='green'  ? { background:'rgba(16,185,129,.08)', color:'#10b981', borderColor:'rgba(16,185,129,.3)' } : {}),
  ...(c==='red'    ? { background:'rgba(239,68,68,.06)',  color:'#ef4444', borderColor:'rgba(239,68,68,.25)' } : {}),
  ...(c==='ghost'  ? { background:'transparent',          color:'#94a3b8', borderColor:'#1e1e3a' }             : {}),
});

const PRIO = {
  urgent: { label:'🔴 URGENT', color:'#ef4444', bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.25)' },
  high:   { label:'🟡 HAUTE',  color:'#f59e0b', bg:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.25)' },
  medium: { label:'🔵 MOYEN',  color:'#8b5cf6', bg:'rgba(139,92,246,.08)',border:'rgba(139,92,246,.25)' },
  low:    { label:'⚪ BASSE',  color:'#94a3b8', bg:'rgba(148,163,184,.06)',border:'#1e1e3a' },
};

export default function Opportunities() {
  const [opps, setOpps]       = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]   = useState('all');
  const [form, setForm]       = useState({ title:'', niche:'', platform:'', description:'', revenue_estimate:0 });
  const toast = useToast();

  useEffect(() => { api.opportunities().then(setOpps).catch(() => {}); }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const r = await api.aiScanOpps();
      setOpps(prev => [...(r.opportunities || []), ...prev]);
      toast(`${r.opportunities?.length || 0} opportunités détectées !`, 'ok');
    } catch(e) { toast(e.message, 'err'); }
    setScanning(false);
  };

  const add = async () => {
    if (!form.title.trim()) { toast('Titre requis', 'err'); return; }
    try {
      const o = await api.addOpportunity(form);
      setOpps(prev => [o, ...prev]);
      setForm({ title:'', niche:'', platform:'', description:'', revenue_estimate:0 });
      setShowForm(false);
      toast('Opportunité ajoutée', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer cette opportunité ?')) return;
    await api.deleteOpp(id);
    setOpps(o => o.filter(x => x.id !== id));
    toast('Supprimé', 'info');
  };

  const filtered = filter === 'all' ? opps : opps.filter(o => o.priority === filter);
  const totalPotential = opps.reduce((s, o) => s + (o.revenue_estimate || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3, color:'#e2e8f0' }}>
            OPPORTUNITÉS
          </h1>
          <p style={{ fontSize:12, color:'#475569', marginTop:3 }}>
            Opportunités business détectées & priorisées par score IA
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowForm(!showForm)} style={B('ghost')}>
            <Plus size={13} /> Ajouter
          </button>
          <button onClick={scan} disabled={scanning} style={B('cyan')}>
            {scanning ? <><Loader size={13} className="spin" /> Scan IA...</> : <><Sparkles size={13} /> Scan IA</>}
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total opportunités', val:opps.length, color:'#00d4ff' },
          { label:'Urgent / High',      val:opps.filter(o=>['urgent','high'].includes(o.priority)).length, color:'#ef4444' },
          { label:'Potentiel total',    val:fmt(totalPotential)+'/m', color:'#10b981' },
          { label:'Score moyen',        val: opps.length ? Math.round(opps.reduce((s,o)=>s+o.score,0)/opps.length) : 0, color:'#8b5cf6' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...C, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${color},transparent)` }} />
            <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:6 }}>{label}</div>
            <div className="font-display" style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ ...C, marginBottom:16 }}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:14 }}>NOUVELLE OPPORTUNITÉ</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Titre *</label>
              <input style={inp} placeholder="Ex: Formation Notion Premium" value={form.title}
                onChange={e => setForm(f=>({...f,title:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Plateforme</label>
              <input style={inp} placeholder="Gumroad, TikTok..." value={form.platform}
                onChange={e => setForm(f=>({...f,platform:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Niche</label>
              <input style={inp} placeholder="Productivité, IA, Finance..." value={form.niche}
                onChange={e => setForm(f=>({...f,niche:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Revenu estimé (€/m)</label>
              <input style={inp} type="number" placeholder="0" value={form.revenue_estimate}
                onChange={e => setForm(f=>({...f,revenue_estimate:+e.target.value||0}))} />
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Description</label>
            <textarea style={{ ...inp, minHeight:70, resize:'vertical' }} placeholder="Décris l'opportunité..."
              value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={add} style={B('green')}><Plus size={13} /> Créer</button>
            <button onClick={() => setShowForm(false)} style={B('ghost')}>Annuler</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['all','urgent','high','medium','low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:11, fontWeight:600,
            border:'1px solid transparent', transition:'all .18s',
            background: filter === f ? 'rgba(0,212,255,.08)' : 'transparent',
            borderColor: filter === f ? 'rgba(0,212,255,.25)' : '#1e1e3a',
            color: filter === f ? '#00d4ff' : '#94a3b8',
          }}>
            {f === 'all' ? 'Toutes' : PRIO[f]?.label || f}
            <span style={{ marginLeft:6, fontSize:10, color:'#475569' }}>
              {f === 'all' ? opps.length : opps.filter(o=>o.priority===f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Opportunities grid */}
      {filtered.length === 0 && (
        <div style={{ ...C, textAlign:'center', padding:48 }}>
          <Target size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
          <div style={{ color:'#475569', fontSize:13 }}>
            Aucune opportunité — lancez un scan IA pour en détecter
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {filtered.sort((a,b)=>b.score-a.score).map(o => {
          const p = PRIO[o.priority] || PRIO.medium;
          return (
            <div key={o.id} className="card-hover" style={{
              background:'#0e0e1c', border:`1px solid ${p.border}`,
              borderRadius:12, padding:20, position:'relative', overflow:'hidden',
            }}>
              {/* Score arc */}
              <div style={{ position:'absolute', top:16, right:16 }}>
                <div style={{ width:48, height:48, borderRadius:'50%',
                  background:`conic-gradient(${p.color} ${o.score*3.6}deg, #1e1e3a 0deg)`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#0e0e1c',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="font-display" style={{ fontSize:11, fontWeight:700, color:p.color }}>{o.score}</span>
                  </div>
                </div>
              </div>

              <div style={{ paddingRight:60 }}>
                <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, fontWeight:700,
                  background:p.bg, color:p.color, border:`1px solid ${p.border}`, marginBottom:8, display:'inline-block' }}>
                  {p.label}
                </span>
                <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:6, lineHeight:1.4 }}>
                  {o.title}
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                  {o.niche && <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                    padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>{o.niche}</span>}
                  {o.platform && <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                    padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>{o.platform}</span>}
                </div>
                {o.description && (
                  <p style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:10 }}>{o.description}</p>
                )}
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                paddingTop:12, borderTop:'1px solid #1e1e3a', marginTop:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <TrendingUp size={13} style={{ color:'#10b981' }} />
                  <span style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>
                    ~{fmt(o.revenue_estimate)}/mois
                  </span>
                </div>
                <button onClick={() => del(o.id)} style={{ ...B('red'), padding:'5px 8px' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Zap, Target, ArrowRight, Star, Activity } from 'lucide-react';
import { api, fmt, fmtK } from '../lib/api';
import { useToast } from '../components/Layout';

const S = { // inline style helpers
  card: { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 },
  label: { fontSize:10, color:'#475569', letterSpacing:2, textTransform:'uppercase', marginBottom:6 },
  val:   { fontFamily:'Orbitron,sans-serif', fontSize:22, fontWeight:700 },
  sec:   { fontSize:12, color:'#94a3b8', marginTop:4 },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [snap, setSnap] = useState(false);
  const toast  = useToast();
  const nav    = useNavigate();

  useEffect(() => {
    api.dashboard().then(setData).catch(e => toast('Erreur dashboard: ' + e.message, 'err'));
  }, []);

  const doSnap = async () => {
    setSnap(true);
    try { const r = await api.snapshot(); toast(`Snapshot ${r.month} — ${fmt(r.total)}`, 'ok'); }
    catch(e) { toast(e.message, 'err'); }
    setSnap(false);
  };

  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#475569' }}>
      <Activity size={20} style={{ marginRight:8 }} className="spin" /> Chargement...
    </div>
  );

  const chartData = data.revenue_chart.length
    ? data.revenue_chart.map(r => ({ name: r.month, Revenus: r.total }))
    : [{ name: 'Aucune donnée', Revenus: 0 }];

  const prioColor = { urgent:'#ef4444', high:'#f59e0b', medium:'#8b5cf6', low:'#94a3b8' };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3, color:'#e2e8f0' }}>
            TABLEAU DE BORD
          </h1>
          <p style={{ fontSize:12, color:'#475569', marginTop:3 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => nav('/studio')} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
            background:'linear-gradient(135deg,rgba(245,158,11,.15),rgba(239,68,68,.1))',
            border:'1px solid rgba(245,158,11,.3)', borderRadius:8,
            color:'#f59e0b', fontSize:12, fontWeight:600, cursor:'pointer', letterSpacing:.5,
          }}>
            <Zap size={13} /> AUTO STUDIO
          </button>
          <button onClick={doSnap} disabled={snap} style={{
            padding:'8px 14px', background:'#13132a', border:'1px solid #1e1e3a',
            borderRadius:8, color:'#94a3b8', fontSize:12, cursor:'pointer',
          }}>
            {snap ? '...' : '📸 Snapshot'}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Revenus / mois', val:fmt(data.total_revenue), sec:'Total consolidé', color:'#00d4ff', icon: TrendingUp },
          { label:'Abonnés totaux', val:fmtK(data.total_followers), sec:`${data.platform_count} plateformes`, color:'#8b5cf6', icon: Users },
          { label:'Tendances actives', val:data.top_trends.length, sec:'Niches détectées', color:'#10b981', icon: Activity },
          { label:'Opportunités hot', val:data.hot_opportunities.length, sec:'À saisir maintenant', color:'#f59e0b', icon: Target },
        ].map(({ label, val, sec, color, icon: Icon }) => (
          <div key={label} className="card-hover" style={{ ...S.card, cursor:'default',
            borderColor: 'rgba(0,0,0,0)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${color},transparent)` }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={S.label}>{label}</div>
              <Icon size={16} style={{ color, opacity:.6 }} />
            </div>
            <div style={{ ...S.val, color }}>{val}</div>
            <div style={S.sec}>{sec}</div>
          </div>
        ))}
      </div>

      {/* Chart + Top platforms */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:20 }}>
        {/* Revenue chart */}
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={S.label}>ÉVOLUTION DES REVENUS</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => fmt(v).replace(',00 €','€')} />
              <Tooltip
                contentStyle={{ background:'#13132a', border:'1px solid #2a2a4a', borderRadius:8, fontSize:12 }}
                labelStyle={{ color:'#94a3b8' }}
                formatter={v => [fmt(v), 'Revenus']}
              />
              <Area type="monotone" dataKey="Revenus" stroke="#00d4ff" strokeWidth={2}
                fill="url(#gc)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top platforms */}
        <div style={S.card}>
          <div style={{ ...S.label, marginBottom:14 }}>TOP PLATEFORMES</div>
          {data.platforms.slice(0,5).map((p, i) => {
            const maxRev = data.platforms[0]?.revenue || 1;
            const pct    = Math.min((p.revenue / maxRev) * 100, 100);
            return (
              <div key={p.id} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#e2e8f0', fontWeight:500 }}>{p.name}</span>
                  <span style={{ fontSize:12, color:'#00d4ff', fontWeight:600 }}>{fmt(p.revenue)}</span>
                </div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width:`${pct}%`,
                    background:`linear-gradient(90deg,${p.color || '#00d4ff'},${p.color || '#00d4ff'}88)` }} />
                </div>
              </div>
            );
          })}
          {!data.platforms.length && (
            <div style={{ textAlign:'center', color:'#475569', padding:'20px 0', fontSize:12 }}>
              Aucune plateforme
            </div>
          )}
        </div>
      </div>

      {/* Hot opportunities + Top trends */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Hot opportunities */}
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={S.label}>🔥 OPPORTUNITÉS CHAUDES</div>
            <button onClick={() => nav('/opportunities')} style={{
              display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
              color:'#00d4ff', fontSize:11, cursor:'pointer',
            }}>Voir tout <ArrowRight size={12} /></button>
          </div>
          {data.hot_opportunities.length === 0 && (
            <div style={{ textAlign:'center', color:'#475569', padding:'20px 0', fontSize:12 }}>
              Aucune opportunité — lancez un scan IA
            </div>
          )}
          {data.hot_opportunities.map(o => (
            <div key={o.id} style={{ padding:'12px 0', borderBottom:'1px solid #1e1e3a', cursor:'pointer' }}
              onClick={() => nav('/opportunities')}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{o.title}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#10b981' }}>~{fmt(o.revenue_estimate)}/m</span>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span className={`badge-${o.priority}`} style={{ fontSize:9, padding:'2px 7px',
                  borderRadius:20, fontWeight:700, letterSpacing:1 }}>
                  {o.priority.toUpperCase()}
                </span>
                <span style={{ fontSize:11, color:'#475569' }}>{o.niche}</span>
                <span style={{ marginLeft:'auto', fontSize:11 }}>
                  <Star size={10} style={{ color:'#f59e0b', marginRight:2 }} />
                  {o.score}/100
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Top trends */}
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={S.label}>📡 TENDANCES ACTIVES</div>
            <button onClick={() => nav('/studio')} style={{
              display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
              color:'#00d4ff', fontSize:11, cursor:'pointer',
            }}>Studio <ArrowRight size={12} /></button>
          </div>
          {data.top_trends.length === 0 && (
            <div style={{ textAlign:'center', color:'#475569', padding:'20px 0', fontSize:12 }}>
              Aucune tendance — lancez le Trend Engine
            </div>
          )}
          {data.top_trends.map(t => (
            <div key={t.id} style={{ padding:'12px 0', borderBottom:'1px solid #1e1e3a' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{t.niche}</span>
                <span style={{ fontSize:11, color:'#8b5cf6' }}>{t.platform}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[
                  { l:'Revenu', v:t.revenue_potential, c:'#10b981' },
                  { l:'Concur.', v:10 - t.competition, c:'#00d4ff' },
                  { l:'Viralité', v:t.virality, c:'#f59e0b' },
                ].map(({ l, v, c }) => (
                  <div key={l}>
                    <div style={{ fontSize:9, color:'#475569', marginBottom:3 }}>{l}</div>
                    <div className="score-bar">
                      <div className="score-fill" style={{ width:`${v*10}%`, background:c }} />
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

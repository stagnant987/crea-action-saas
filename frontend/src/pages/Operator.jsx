import React, { useState, useEffect } from 'react';
import { Bot, Zap, Target, TrendingUp, CheckCircle, Clock, DollarSign, Loader, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { api, fmt } from '../lib/api';
import { useToast } from '../components/Layout';

const C   = { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 };
const B   = (c='cyan') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, letterSpacing:.5, border:'1px solid transparent', transition:'all .2s',
  ...(c==='cyan'   ? { background:'rgba(0,212,255,.1)',   color:'#00d4ff', borderColor:'rgba(0,212,255,.35)' }  : {}),
  ...(c==='violet' ? { background:'rgba(139,92,246,.1)', color:'#a78bfa', borderColor:'rgba(139,92,246,.35)' } : {}),
  ...(c==='green'  ? { background:'rgba(16,185,129,.1)',  color:'#10b981', borderColor:'rgba(16,185,129,.35)' } : {}),
  ...(c==='ghost'  ? { background:'transparent',           color:'#475569', borderColor:'#1e1e3a' }             : {}),
});

const SCORE_COLOR = (s) => s >= 85 ? '#10b981' : s >= 70 ? '#f59e0b' : '#94a3b8';

function Section({ icon: Icon, title, color, children, badge }) {
  return (
    <div style={{ ...C, marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:'1px solid #1e1e3a' }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`${color}15`, border:`1px solid ${color}30`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:'#e2e8f0' }}>{title}</span>
        {badge && <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 8px', borderRadius:20, fontWeight:700,
          background:`${color}15`, color, border:`1px solid ${color}30` }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Operator() {
  const [brief, setBrief]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState(0);
  const toast = useToast();

  useEffect(() => {
    api.operatorLastBrief().then(b => { if (b) setBrief(b); }).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const b = await api.operatorBrief();
      setBrief(b);
      toast('Brief du jour généré !', 'ok');
    } catch(e) { toast(e.message || 'Erreur IA', 'err'); }
    setLoading(false);
  };

  const tabs = ['📊 Analyse', '✍️ Contenus', '🎯 Décisions', '⚡ Actions', '💸 Monétisation'];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3,
            background:'linear-gradient(90deg,#a78bfa,#00d4ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            AI OPERATOR
          </h1>
          <p style={{ fontSize:12, color:'#475569', marginTop:3 }}>
            Ton copilote stratégique quotidien — analyse, génère, décide, agit
          </p>
        </div>
        <button onClick={generate} disabled={loading} style={B('violet')}>
          {loading ? <><Loader size={13} className="spin" /> Génération...</> : <><Bot size={13} /> Générer le brief du jour</>}
        </button>
      </div>

      {/* Empty state */}
      {!brief && !loading && (
        <div style={{ ...C, textAlign:'center', padding:64 }}>
          <Bot size={48} style={{ color:'#2a2a4a', marginBottom:16 }} />
          <div className="font-display" style={{ fontSize:13, color:'#e2e8f0', marginBottom:8, letterSpacing:2 }}>
            AI OPERATOR PRÊT
          </div>
          <p style={{ fontSize:13, color:'#475569', marginBottom:24, maxWidth:400, margin:'0 auto 24px', lineHeight:1.7 }}>
            Clique sur "Générer le brief du jour" pour recevoir ton analyse complète : tendances, 10 contenus, décisions et actions immédiates.
          </p>
          <button onClick={generate} style={{ ...B('violet'), fontSize:13, padding:'12px 24px' }}>
            <Bot size={15} /> Lancer l'AI Operator
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ ...C, textAlign:'center', padding:48 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(139,92,246,.1)',
            border:'2px solid rgba(139,92,246,.3)', display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 16px' }}>
            <Bot size={24} style={{ color:'#a78bfa' }} />
          </div>
          <div style={{ fontSize:13, color:'#a78bfa', fontWeight:600, marginBottom:8 }}>AI Operator en cours d'analyse...</div>
          <div style={{ fontSize:12, color:'#475569' }}>Détection des tendances · Génération de 10 contenus · Prise de décision</div>
        </div>
      )}

      {/* Brief content */}
      {brief && !loading && (
        <>
          {/* KPI bar */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Niche du jour',      val: brief.analyse?.niche_du_jour?.split(' ').slice(0,3).join(' ') || '—', color:'#a78bfa' },
              { label:'Contenus générés',   val: brief.contenus?.length || 0,                                            color:'#00d4ff' },
              { label:'Revenus actuels',    val: fmt(brief.revenue_actuel || 0),                                          color:'#10b981' },
              { label:'Actions du jour',    val: brief.actions?.length || 0,                                              color:'#f59e0b' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...C, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
                <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:6 }}>{label}</div>
                <div className="font-display" style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                padding:'8px 16px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600,
                border:'1px solid transparent', transition:'all .18s', whiteSpace:'nowrap',
                background: tab === i ? 'rgba(139,92,246,.12)' : 'transparent',
                borderColor: tab === i ? 'rgba(139,92,246,.3)' : '#1e1e3a',
                color: tab === i ? '#a78bfa' : '#475569',
              }}>{t}</button>
            ))}
          </div>

          {/* TAB 0 — Analyse */}
          {tab === 0 && brief.analyse && (
            <>
              {/* Niche du jour */}
              <div style={{ ...C, marginBottom:16, background:'rgba(139,92,246,.04)', border:'1px solid rgba(139,92,246,.2)' }}>
                <div style={{ fontSize:9, color:'#a78bfa', letterSpacing:2, fontWeight:700, marginBottom:8 }}>🎯 NICHE DU JOUR</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#e2e8f0', marginBottom:6 }}>{brief.analyse.niche_du_jour}</div>
                <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>{brief.analyse.raison}</div>
              </div>

              {/* 3 tendances */}
              <Section icon={TrendingUp} title="3 TENDANCES RENTABLES" color="#00d4ff">
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {brief.analyse.tendances?.map((t, i) => (
                    <div key={i} style={{ display:'flex', gap:14, padding:'12px 14px',
                      background:'#13132a', borderRadius:10, border:'1px solid #1e1e3a' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,212,255,.1)',
                        border:'1px solid rgba(0,212,255,.2)', display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#00d4ff' }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{t.niche}</span>
                          <span style={{ fontSize:11, color:'#10b981', fontWeight:600 }}>{t.potentiel}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#475569', marginBottom:3 }}>📱 {t.plateforme}</div>
                        <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>{t.pourquoi}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* TAB 1 — Contenus */}
          {tab === 1 && brief.contenus && (
            <Section icon={Zap} title={`${brief.contenus.length} CONTENUS GÉNÉRÉS`} color="#f59e0b" badge="PRÊTS À POSTER">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:12 }}>
                {brief.contenus.map((c, i) => (
                  <div key={i} style={{ background:'#13132a', borderRadius:10, border:'1px solid #1e1e3a',
                    padding:14, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
                      background:`linear-gradient(90deg,${SCORE_COLOR(c.score)},transparent)` }} />
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, fontWeight:700,
                        background:'rgba(245,158,11,.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)' }}>
                        {c.plateforme}
                      </span>
                      <span style={{ fontSize:11, fontWeight:700, color:SCORE_COLOR(c.score) }}>Score {c.score}</span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:8, lineHeight:1.4 }}>{c.titre}</div>
                    <div style={{ fontSize:12, color:'#f59e0b', fontWeight:600, marginBottom:6 }}>🎣 {c.hook}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:8 }}>{c.script}</div>
                    <div style={{ fontSize:11, color:'#475569', marginBottom:6 }}>🎨 {c.visuel}</div>
                    <div style={{ fontSize:11, color:'#10b981', fontWeight:600, padding:'4px 10px',
                      background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.15)', borderRadius:20, display:'inline-block' }}>
                      👉 {c.cta}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* TAB 2 — Décisions */}
          {tab === 2 && brief.decisions && brief.contenus && (
            <Section icon={Target} title="TOP 5 SÉLECTIONNÉS PAR L'IA" color="#10b981" badge="MEILLEURS CONTENUS">
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {brief.decisions.top5_ids?.map((idx, rank) => {
                  const c = brief.contenus[idx];
                  if (!c) return null;
                  return (
                    <div key={rank} style={{ display:'flex', gap:14, padding:'14px', background:'#13132a',
                      borderRadius:10, border:'1px solid rgba(16,185,129,.2)' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(16,185,129,.1)',
                        border:'1px solid rgba(16,185,129,.3)', display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0, fontWeight:700, color:'#10b981', fontSize:13 }}>
                        #{rank+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{c.titre}</span>
                          <span style={{ fontSize:9, padding:'2px 8px', borderRadius:20, background:'rgba(245,158,11,.1)',
                            color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)', fontWeight:700 }}>{c.plateforme}</span>
                        </div>
                        <div style={{ fontSize:12, color:'#94a3b8' }}>
                          <span style={{ color:'#10b981', fontWeight:600 }}>Pourquoi : </span>
                          {brief.decisions.explications?.[rank]}
                        </div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:SCORE_COLOR(c.score), alignSelf:'center' }}>
                        {c.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* TAB 3 — Actions */}
          {tab === 3 && brief.actions && (
            <Section icon={CheckCircle} title="ACTIONS IMMÉDIATES" color="#ef4444" badge="AUJOURD'HUI">
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {brief.actions.map((a, i) => (
                  <div key={i} style={{ display:'flex', gap:14, padding:'14px 16px', background:'#13132a',
                    borderRadius:10, border:`1px solid ${a.urgent ? 'rgba(239,68,68,.25)' : '#1e1e3a'}` }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background: a.urgent ? 'rgba(239,68,68,.1)' : 'rgba(0,212,255,.1)',
                      border:`1px solid ${a.urgent ? 'rgba(239,68,68,.3)' : 'rgba(0,212,255,.2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:12, color: a.urgent ? '#ef4444' : '#00d4ff' }}>
                      {a.ordre}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:a.lien ? 6 : 0 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{a.action}</span>
                        {a.urgent && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20,
                          background:'rgba(239,68,68,.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,.25)',
                          fontWeight:700 }}>URGENT</span>}
                      </div>
                      {a.lien && a.lien !== 'N/A' && a.lien !== '' && (
                        <div style={{ fontSize:11, color:'#475569' }}>🔗 {a.lien}</div>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color:'#2a2a4a', alignSelf:'center' }} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* TAB 4 — Monétisation */}
          {tab === 4 && brief.monetisation && (
            <>
              <div style={{ ...C, marginBottom:16, background:'rgba(16,185,129,.04)', border:'1px solid rgba(16,185,129,.2)' }}>
                <div style={{ fontSize:9, color:'#10b981', letterSpacing:2, fontWeight:700, marginBottom:12 }}>💸 STRATÉGIE DE MONÉTISATION DU JOUR</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { label:'Type',           val: brief.monetisation.type },
                    { label:'Produit/Offre',  val: brief.monetisation.produit },
                    { label:'Prix suggéré',   val: brief.monetisation.prix },
                    { label:'Plateforme',     val: brief.monetisation.plateforme },
                    { label:'Revenu estimé',  val: brief.monetisation.revenu_estime },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ padding:'10px 14px', background:'#13132a', borderRadius:8, border:'1px solid #1e1e3a' }}>
                      <div style={{ fontSize:10, color:'#475569', marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, padding:'12px 16px', background:'rgba(16,185,129,.08)',
                  border:'1px solid rgba(16,185,129,.2)', borderRadius:10 }}>
                  <div style={{ fontSize:11, color:'#475569', marginBottom:4 }}>Call-to-Action recommandé</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#10b981' }}>👉 {brief.monetisation.cta}</div>
                </div>
              </div>

              {brief.optimisation && (
                <Section icon={RefreshCw} title="OPTIMISATION — DEMAIN" color="#8b5cf6">
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'📈 À faire demain',  val: brief.optimisation.demain,      color:'#00d4ff' },
                      { label:'🔧 À améliorer',     val: brief.optimisation.amélioration, color:'#f59e0b' },
                      { label:'❌ À éviter',        val: brief.optimisation.a_eviter,     color:'#ef4444' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ padding:'12px 14px', background:'#13132a',
                        borderRadius:8, border:`1px solid ${color}20` }}>
                        <div style={{ fontSize:10, color, fontWeight:700, marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          <div style={{ textAlign:'center', marginTop:8 }}>
            <button onClick={generate} disabled={loading} style={{ ...B('ghost'), fontSize:11 }}>
              <RefreshCw size={11} /> Regénérer le brief
            </button>
            <span style={{ fontSize:10, color:'#2a2a4a', marginLeft:12 }}>
              Généré le {new Date(brief.generated_at).toLocaleString('fr-FR')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

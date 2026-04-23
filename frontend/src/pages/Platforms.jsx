import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Globe, Users, Link2, Link2Off, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api, fmt, fmtK } from '../lib/api';
import { useToast } from '../components/Layout';

const C   = { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 };
const inp = { width:'100%', padding:'9px 13px', background:'#13132a', border:'1px solid #1e1e3a', borderRadius:8, color:'#e2e8f0', fontFamily:'Inter,sans-serif', fontSize:13 };
const B   = (c='cyan') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, border:'1px solid transparent', transition:'all .2s',
  ...(c==='cyan'    ? { background:'rgba(0,212,255,.08)',  color:'#00d4ff', borderColor:'rgba(0,212,255,.3)' }  : {}),
  ...(c==='green'   ? { background:'rgba(16,185,129,.08)', color:'#10b981', borderColor:'rgba(16,185,129,.3)' } : {}),
  ...(c==='red'     ? { background:'rgba(239,68,68,.06)',  color:'#ef4444', borderColor:'rgba(239,68,68,.25)' } : {}),
  ...(c==='violet'  ? { background:'rgba(139,92,246,.08)', color:'#a78bfa', borderColor:'rgba(139,92,246,.3)' } : {}),
  ...(c==='ghost'   ? { background:'transparent',          color:'#94a3b8', borderColor:'#1e1e3a' }             : {}),
  ...(c==='orange'  ? { background:'rgba(245,158,11,.08)', color:'#f59e0b', borderColor:'rgba(245,158,11,.3)' } : {}),
});

const PLATFORM_TYPES = [
  { value:'video',        label:'🎬 Vidéo' },
  { value:'social',       label:'📱 Réseau social' },
  { value:'subscription', label:'💳 Abonnement' },
  { value:'affiliate',    label:'🔗 Affiliation' },
  { value:'ecommerce',    label:'🛒 E-commerce' },
  { value:'newsletter',   label:'📧 Newsletter' },
  { value:'other',        label:'🔧 Autre' },
];

const COLORS = ['#00d4ff','#8b5cf6','#10b981','#f59e0b','#ef4444','#e1306c','#ff424d','#1ed760','#a970ff'];

// Map platform names to OAuth providers
const PROVIDER_MAP = {
  'youtube':   'youtube',
  'tiktok':    'tiktok',
  'instagram': 'instagram',
  'patreon':   'patreon',
};

function getProvider(platformName) {
  return PROVIDER_MAP[platformName?.toLowerCase()] || null;
}

function ConnectButton({ platform, connection, onSync, syncing }) {
  const provider = getProvider(platform.name);
  if (!provider) return null;

  const connect = async () => {
    try {
      const res = await fetch(`/api/connect/${provider}/url?platform_id=${platform.id}`);
      const data = await res.json();
      if (data.error) { alert('Erreur: ' + data.error); return; }
      window.open(data.url, '_blank', 'width=600,height=700');
    } catch(e) { alert(e.message); }
  };

  if (connection) {
    return (
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
          color: connection.sync_status === 'ok' ? '#10b981' : '#f59e0b' }}>
          {connection.sync_status === 'ok'
            ? <CheckCircle size={11} />
            : <Clock size={11} />}
          <span>{connection.username || 'Connecté'}</span>
        </div>
        <button onClick={() => onSync(platform.id)} disabled={syncing}
          style={{ ...B('ghost'), padding:'4px 8px', fontSize:11 }}>
          <RefreshCw size={10} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sync...' : 'Sync'}
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} style={{ ...B('violet'), padding:'5px 10px', fontSize:11 }}>
      <Link2 size={11} /> Connecter
    </button>
  );
}

export default function Platforms() {
  const [platforms, setPlatforms]   = useState([]);
  const [connections, setConns]     = useState({});
  const [expanded, setExpanded]     = useState({});
  const [showForm, setShowForm]     = useState(false);
  const [addingAccFor, setAddingAcc] = useState(null);
  const [form, setForm]             = useState({ name:'', type:'social', color:'#00d4ff' });
  const [accForm, setAccForm]       = useState({ name:'', username:'', revenue:0, followers:0 });
  const [syncing, setSyncing]       = useState({});
  const [syncingAll, setSyncingAll] = useState(false);
  const toast = useToast();

  const loadData = () => {
    api.platforms().then(setPlatforms).catch(() => {});
    fetch('/api/connections').then(r=>r.json()).then(list => {
      const map = {};
      list.forEach(c => { map[c.platform_id] = c; });
      setConns(map);
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();
    // Check if returning from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) { toast(`${params.get('connected')} connecté !`, 'ok'); loadData(); window.history.replaceState({}, '', '/platforms'); }
    if (params.get('error'))     { toast('Erreur: ' + params.get('error'), 'err'); window.history.replaceState({}, '', '/platforms'); }
  }, []);

  const syncOne = async (platformId) => {
    setSyncing(s => ({ ...s, [platformId]: true }));
    try {
      const res = await fetch(`/api/platforms/${platformId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast(data.error, 'err'); return; }
      toast('Données mises à jour !', 'ok');
      loadData();
    } catch(e) { toast(e.message, 'err'); }
    setSyncing(s => ({ ...s, [platformId]: false }));
  };

  const syncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/sync/all', { method: 'POST' });
      const data = await res.json();
      toast(`${data.synced} plateforme(s) synchronisée(s)`, 'ok');
      loadData();
    } catch(e) { toast(e.message, 'err'); }
    setSyncingAll(false);
  };

  const addPlatform = async () => {
    if (!form.name.trim()) { toast('Nom requis', 'err'); return; }
    try {
      const p = await api.addPlatform(form);
      setPlatforms(prev => [...prev, { ...p, accounts:[] }]);
      setForm({ name:'', type:'social', color:'#00d4ff' });
      setShowForm(false);
      toast('Plateforme ajoutée', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const deletePlatform = async (id) => {
    if (!confirm('Supprimer cette plateforme et tous ses comptes ?')) return;
    await api.deletePlatform(id);
    setPlatforms(p => p.filter(x => x.id !== id));
    toast('Supprimé', 'info');
  };

  const addAccount = async (platformId) => {
    if (!accForm.name.trim()) { toast('Nom du compte requis', 'err'); return; }
    try {
      const acc = await api.addAccount(platformId, accForm);
      setPlatforms(prev => prev.map(p => p.id === platformId
        ? { ...p, accounts: [...(p.accounts||[]), acc] } : p));
      setAccForm({ name:'', username:'', revenue:0, followers:0 });
      setAddingAcc(null);
      toast('Compte ajouté', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const deleteAccount = async (accId, platformId) => {
    if (!confirm('Supprimer ce compte ?')) return;
    await api.deleteAccount(accId);
    setPlatforms(prev => prev.map(p => p.id === platformId
      ? { ...p, accounts: p.accounts.filter(a => a.id !== accId) } : p));
    toast('Compte supprimé', 'info');
  };

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));
  const totalRevenue   = platforms.reduce((s,p)=>s+(p.revenue||0),0);
  const totalFollowers = platforms.reduce((s,p)=>s+(p.followers||0),0);
  const connectedCount = Object.keys(connections).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3, color:'#e2e8f0' }}>
            PLATEFORMES & COMPTES
          </h1>
          <p style={{ fontSize:12, color:'#475569', marginTop:3 }}>
            Connectez vos vrais comptes — données synchronisées automatiquement
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {connectedCount > 0 && (
            <button onClick={syncAll} disabled={syncingAll} style={B('green')}>
              <RefreshCw size={13} style={{ animation: syncingAll ? 'spin 1s linear infinite' : 'none' }} />
              {syncingAll ? 'Sync...' : `Sync tout (${connectedCount})`}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} style={B('cyan')}>
            <Plus size={13} /> Ajouter une plateforme
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Plateformes',       val:platforms.length,      color:'#00d4ff' },
          { label:'Connectées (réel)', val:connectedCount,        color:'#a78bfa' },
          { label:'Revenus / mois',    val:fmt(totalRevenue),     color:'#10b981' },
          { label:'Abonnés totaux',    val:fmtK(totalFollowers),  color:'#8b5cf6' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...C, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }} />
            <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:6 }}>{label}</div>
            <div className="font-display" style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Info banner si aucune connexion */}
      {connectedCount === 0 && platforms.length > 0 && (
        <div style={{ ...C, marginBottom:16, background:'rgba(139,92,246,.04)', border:'1px solid rgba(139,92,246,.2)', display:'flex', gap:12, alignItems:'center' }}>
          <Link2 size={20} style={{ color:'#a78bfa', flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:3 }}>
              Connectez vos vrais comptes pour des données en temps réel
            </div>
            <div style={{ fontSize:12, color:'#475569' }}>
              Clique sur <strong style={{ color:'#a78bfa' }}>Connecter</strong> sur chaque plateforme (YouTube, Instagram, TikTok, Patreon) pour synchroniser tes vraies stats.
            </div>
          </div>
        </div>
      )}

      {/* Add Platform Form */}
      {showForm && (
        <div style={{ ...C, marginBottom:16 }}>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:14 }}>NOUVELLE PLATEFORME</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 180px', gap:10, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Nom *</label>
              <input style={inp} placeholder="Ex: YouTube, TikTok..." value={form.name}
                onChange={e => setForm(f=>({...f,name:e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && addPlatform()} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Type</label>
              <select style={inp} value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {PLATFORM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:5 }}>Couleur</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f=>({...f,color:c}))}
                    style={{ width:20, height:20, borderRadius:'50%', background:c, cursor:'pointer',
                      border: form.color === c ? '2px solid #fff' : '2px solid transparent', flexShrink:0 }} />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addPlatform} style={B('cyan')}><Plus size={13} /> Créer</button>
            <button onClick={() => setShowForm(false)} style={B('ghost')}>Annuler</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {platforms.length === 0 && !showForm && (
        <div style={{ ...C, textAlign:'center', padding:48 }}>
          <Globe size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
          <div style={{ color:'#475569', fontSize:13, marginBottom:12 }}>
            Aucune plateforme — ajoutez vos canaux de revenus
          </div>
        </div>
      )}

      {/* Platforms list */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {platforms.map(p => {
          const conn    = connections[p.id];
          const provider = getProvider(p.name);
          return (
            <div key={p.id} style={{ ...C, padding:0 }}>
              {/* Platform header */}
              <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
                <div onClick={() => toggle(p.id)} style={{ display:'flex', alignItems:'center', gap:12, flex:1, cursor:'pointer' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:p.color || '#00d4ff', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{p.name}</span>
                      {conn && (
                        <span style={{ fontSize:9, padding:'1px 7px', borderRadius:20, fontWeight:700,
                          background:'rgba(16,185,129,.1)', color:'#10b981', border:'1px solid rgba(16,185,129,.25)' }}>
                          ● LIVE
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                      <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                        padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>
                        {PLATFORM_TYPES.find(t=>t.value===p.type)?.label || p.type}
                      </span>
                      {conn?.last_sync && (
                        <span style={{ fontSize:10, color:'#475569' }}>
                          Sync: {new Date(conn.last_sync).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'#475569' }}>Revenus</div>
                    <div className="font-display" style={{ fontSize:15, fontWeight:700, color:'#10b981' }}>{fmt(p.revenue)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'#475569' }}>Abonnés</div>
                    <div className="font-display" style={{ fontSize:15, fontWeight:700, color:'#00d4ff' }}>{fmtK(p.followers)}</div>
                  </div>

                  {/* Connect button */}
                  {provider && (
                    <ConnectButton platform={p} connection={conn}
                      onSync={syncOne} syncing={!!syncing[p.id]} />
                  )}

                  <div style={{ display:'flex', gap:6 }}>
                    <div onClick={() => toggle(p.id)} style={{ cursor:'pointer' }}>
                      {expanded[p.id]
                        ? <ChevronDown size={16} style={{ color:'#94a3b8' }} />
                        : <ChevronRight size={16} style={{ color:'#94a3b8' }} />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deletePlatform(p.id); }}
                      style={{ ...B('red'), padding:'5px 8px' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded: accounts */}
              {expanded[p.id] && (
                <div style={{ borderTop:'1px solid #1e1e3a', padding:'16px 20px' }}>
                  {(p.accounts||[]).length === 0 && addingAccFor !== p.id && (
                    <div style={{ color:'#475569', fontSize:12, marginBottom:12 }}>
                      Aucun sous-compte manuel — {conn ? 'données synchronisées automatiquement' : 'ajoutez-en un'}
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                    {(p.accounts||[]).map(acc => (
                      <div key={acc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                        background:'#13132a', borderRadius:10, border:'1px solid #1e1e3a' }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:`${p.color || '#00d4ff'}20`,
                          border:`1px solid ${p.color || '#00d4ff'}40`, display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:13, fontWeight:700, color:p.color || '#00d4ff', flexShrink:0 }}>
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{acc.name}</div>
                          {acc.username && <div style={{ fontSize:11, color:'#475569' }}>{acc.username}</div>}
                        </div>
                        <div style={{ textAlign:'right', marginRight:12 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#10b981' }}>{fmt(acc.revenue)}</div>
                          <div style={{ fontSize:11, color:'#475569' }}>{fmtK(acc.followers)} abonnés</div>
                        </div>
                        <button onClick={() => deleteAccount(acc.id, p.id)} style={{ ...B('red'), padding:'5px 8px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Revenue manual update when connected */}
                  {conn && (
                    <div style={{ padding:'10px 14px', background:'rgba(16,185,129,.04)',
                      border:'1px solid rgba(16,185,129,.15)', borderRadius:8, fontSize:12, color:'#475569' }}>
                      <span style={{ color:'#10b981' }}>✓ Compte connecté</span> — les abonnés sont synchronisés automatiquement.
                      Pour les revenus, tu peux les saisir manuellement ci-dessous (YouTube/TikTok ne les expose pas via API).
                    </div>
                  )}

                  {/* Revenue manual entry for connected platforms */}
                  {conn && (
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <input style={{ ...inp, width:200 }} type="number" placeholder="Revenus réels ce mois (€)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            fetch(`/api/platforms/${p.id}`, { method:'PUT',
                              headers:{'Content-Type':'application/json'},
                              body: JSON.stringify({ revenue: +e.target.value, followers: p.followers }) })
                              .then(() => { loadData(); toast('Revenus mis à jour', 'ok'); })
                              .catch(() => {});
                          }
                        }} />
                      <span style={{ fontSize:11, color:'#475569', alignSelf:'center' }}>Entrée pour valider</span>
                    </div>
                  )}

                  {/* Add account form */}
                  {addingAccFor === p.id ? (
                    <div style={{ padding:'14px', background:'rgba(0,212,255,.03)',
                      border:'1px solid rgba(0,212,255,.15)', borderRadius:10, marginTop:12 }}>
                      <div style={{ fontSize:10, color:'#00d4ff', letterSpacing:2, marginBottom:12 }}>AJOUTER UN COMPTE MANUEL</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                        <div>
                          <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:4 }}>Nom *</label>
                          <input style={inp} placeholder="Nom du compte" value={accForm.name}
                            onChange={e => setAccForm(f=>({...f,name:e.target.value}))} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:4 }}>Pseudo</label>
                          <input style={inp} placeholder="@username" value={accForm.username}
                            onChange={e => setAccForm(f=>({...f,username:e.target.value}))} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:4 }}>Revenus (€/mois)</label>
                          <input style={inp} type="number" placeholder="0" value={accForm.revenue}
                            onChange={e => setAccForm(f=>({...f,revenue:+e.target.value||0}))} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, color:'#475569', display:'block', marginBottom:4 }}>Abonnés</label>
                          <input style={inp} type="number" placeholder="0" value={accForm.followers}
                            onChange={e => setAccForm(f=>({...f,followers:+e.target.value||0}))} />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => addAccount(p.id)} style={B('green')}><Plus size={12} /> Ajouter</button>
                        <button onClick={() => { setAddingAcc(null); setAccForm({ name:'', username:'', revenue:0, followers:0 }); }}
                          style={B('ghost')}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingAcc(p.id)} style={{ ...B('ghost'), width:'100%', justifyContent:'center', marginTop:12 }}>
                      <Plus size={12} /> Ajouter un compte manuel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

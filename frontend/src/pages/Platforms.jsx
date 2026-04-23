import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Globe, Users } from 'lucide-react';
import { api, fmt, fmtK } from '../lib/api';
import { useToast } from '../components/Layout';

const C   = { background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:12, padding:20 };
const inp = { width:'100%', padding:'9px 13px', background:'#13132a', border:'1px solid #1e1e3a', borderRadius:8, color:'#e2e8f0', fontFamily:'Inter,sans-serif', fontSize:13 };
const B   = (c='cyan') => ({ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, border:'1px solid transparent', transition:'all .2s',
  ...(c==='cyan'  ? { background:'rgba(0,212,255,.08)',  color:'#00d4ff', borderColor:'rgba(0,212,255,.3)' }  : {}),
  ...(c==='green' ? { background:'rgba(16,185,129,.08)', color:'#10b981', borderColor:'rgba(16,185,129,.3)' } : {}),
  ...(c==='red'   ? { background:'rgba(239,68,68,.06)',  color:'#ef4444', borderColor:'rgba(239,68,68,.25)' } : {}),
  ...(c==='ghost' ? { background:'transparent',          color:'#94a3b8', borderColor:'#1e1e3a' }             : {}),
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

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [expanded, setExpanded]   = useState({});
  const [showForm, setShowForm]   = useState(false);
  const [addingAccFor, setAddingAcc] = useState(null);
  const [form, setForm]           = useState({ name:'', type:'social', color:'#00d4ff' });
  const [accForm, setAccForm]     = useState({ name:'', username:'', revenue:0, followers:0 });
  const toast = useToast();

  useEffect(() => { api.platforms().then(setPlatforms).catch(() => {}); }, []);

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
        ? { ...p, accounts: [...(p.accounts||[]), acc] }
        : p
      ));
      setAccForm({ name:'', username:'', revenue:0, followers:0 });
      setAddingAcc(null);
      toast('Compte ajouté', 'ok');
    } catch(e) { toast(e.message, 'err'); }
  };

  const deleteAccount = async (accId, platformId) => {
    if (!confirm('Supprimer ce compte ?')) return;
    await api.deleteAccount(accId);
    setPlatforms(prev => prev.map(p => p.id === platformId
      ? { ...p, accounts: p.accounts.filter(a => a.id !== accId) }
      : p
    ));
    toast('Compte supprimé', 'info');
  };

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const totalRevenue   = platforms.reduce((s,p)=>s+(p.revenue||0),0);
  const totalFollowers = platforms.reduce((s,p)=>s+(p.followers||0),0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize:15, fontWeight:700, letterSpacing:3, color:'#e2e8f0' }}>
            PLATEFORMES & COMPTES
          </h1>
          <p style={{ fontSize:12, color:'#475569', marginTop:3 }}>
            Gérez vos plateformes et les comptes associés
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={B('cyan')}>
          <Plus size={13} /> Ajouter une plateforme
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Plateformes',      val:platforms.length,          color:'#00d4ff' },
          { label:'Revenus / mois',   val:fmt(totalRevenue),         color:'#10b981' },
          { label:'Abonnés totaux',   val:fmtK(totalFollowers),      color:'#8b5cf6' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...C, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,${color},transparent)` }} />
            <div style={{ fontSize:10, color:'#475569', letterSpacing:2, marginBottom:6 }}>{label}</div>
            <div className="font-display" style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

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
                      border: form.color === c ? `2px solid #fff` : '2px solid transparent',
                      flexShrink:0 }} />
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

      {/* Platforms list */}
      {platforms.length === 0 && !showForm && (
        <div style={{ ...C, textAlign:'center', padding:48 }}>
          <Globe size={32} style={{ color:'#2a2a4a', marginBottom:12 }} />
          <div style={{ color:'#475569', fontSize:13, marginBottom:12 }}>
            Aucune plateforme — ajoutez vos canaux de revenus
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {platforms.map(p => (
          <div key={p.id} style={{ ...C, padding:0 }}>
            {/* Platform header */}
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
              onClick={() => toggle(p.id)}>
              {/* Color dot */}
              <div style={{ width:10, height:10, borderRadius:'50%', background:p.color || '#00d4ff', flexShrink:0 }} />

              {/* Info */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{p.name}</div>
                <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#94a3b8', background:'#13132a',
                    padding:'2px 8px', borderRadius:20, border:'1px solid #2a2a4a' }}>
                    {PLATFORM_TYPES.find(t=>t.value===p.type)?.label || p.type}
                  </span>
                  {(p.accounts||[]).length > 0 && (
                    <span style={{ fontSize:11, color:'#475569' }}>
                      <Users size={11} style={{ marginRight:3, verticalAlign:'middle' }} />
                      {p.accounts.length} compte{p.accounts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, color:'#475569' }}>Revenus</div>
                  <div className="font-display" style={{ fontSize:15, fontWeight:700, color:'#10b981' }}>
                    {fmt(p.revenue)}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, color:'#475569' }}>Abonnés</div>
                  <div className="font-display" style={{ fontSize:15, fontWeight:700, color:'#00d4ff' }}>
                    {fmtK(p.followers)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {expanded[p.id] ? <ChevronDown size={16} style={{ color:'#94a3b8' }} />
                    : <ChevronRight size={16} style={{ color:'#94a3b8' }} />}
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
                {/* Account list */}
                {(p.accounts||[]).length === 0 && addingAccFor !== p.id && (
                  <div style={{ color:'#475569', fontSize:12, marginBottom:12 }}>
                    Aucun compte — ajoutez-en un
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

                {/* Add account form */}
                {addingAccFor === p.id ? (
                  <div style={{ padding:'14px', background:'rgba(0,212,255,.03)',
                    border:'1px solid rgba(0,212,255,.15)', borderRadius:10 }}>
                    <div style={{ fontSize:10, color:'#00d4ff', letterSpacing:2, marginBottom:12 }}>AJOUTER UN COMPTE</div>
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
                  <button onClick={() => setAddingAcc(p.id)} style={{ ...B('ghost'), width:'100%', justifyContent:'center' }}>
                    <Plus size={12} /> Ajouter un compte
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

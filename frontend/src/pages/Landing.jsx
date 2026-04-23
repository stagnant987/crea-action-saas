import React, { useState } from 'react';
import { Bot, TrendingUp, Zap, Target, Shield, Eye, EyeOff, Loader, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Bot,        color:'#a78bfa', title:'AI Operator',        desc:'Analyse, génère 10 contenus et prend les décisions pour toi chaque jour.' },
  { icon: TrendingUp, color:'#00d4ff', title:'Trend Engine',        desc:'Détecte les niches rentables avant tout le monde grâce à l\'IA.' },
  { icon: Zap,        color:'#f59e0b', title:'Auto Money Studio',   desc:'Génère du contenu optimisé pour chaque plateforme en 1 clic.' },
  { icon: Target,     color:'#10b981', title:'Opportunités',        desc:'Score IA sur chaque opportunité business détectée automatiquement.' },
];

function AuthModal({ mode: initMode, onClose, onSuccess }) {
  const [mode, setMode]         = useState(initMode);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name };
      const res  = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur'); setLoading(false); return; }
      onSuccess(data.token, data.user);
    } catch { setError('Erreur réseau'); }
    setLoading(false);
  };

  const inp = {
    width:'100%', padding:'11px 14px', background:'#0e0e1c', border:'1px solid #2a2a4a',
    borderRadius:10, color:'#e2e8f0', fontSize:14, outline:'none', boxSizing:'border-box',
    fontFamily:'Inter,sans-serif', transition:'border-color .2s',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:20,
        padding:32, width:'100%', maxWidth:420, position:'relative',
        boxShadow:'0 20px 60px rgba(0,0,0,.8)' }}>

        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16,
          background:'none', border:'none', color:'#475569', cursor:'pointer' }}>
          <X size={18} />
        </button>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(139,92,246,.15)',
            border:'1px solid rgba(139,92,246,.3)', display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 12px' }}>
            <Bot size={22} style={{ color:'#a78bfa' }} />
          </div>
          <div className="font-display" style={{ fontSize:14, fontWeight:700, letterSpacing:3,
            background:'linear-gradient(90deg,#a78bfa,#00d4ff)', WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent' }}>
            CREA ACTION
          </div>
          <div style={{ fontSize:13, color:'#475569', marginTop:6 }}>
            {mode === 'login' ? 'Bienvenue, connecte-toi' : 'Crée ton compte gratuitement'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:'#475569', display:'block', marginBottom:6, letterSpacing:1 }}>
                TON PRÉNOM
              </label>
              <input style={inp} placeholder="Ex: Alexandre" value={name}
                onChange={e => setName(e.target.value)} autoFocus />
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:'#475569', display:'block', marginBottom:6, letterSpacing:1 }}>
              EMAIL
            </label>
            <input style={inp} type="email" placeholder="ton@email.com" value={email}
              onChange={e => setEmail(e.target.value)} autoFocus={mode === 'login'} required />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, color:'#475569', display:'block', marginBottom:6, letterSpacing:1 }}>
              MOT DE PASSE
            </label>
            <div style={{ position:'relative' }}>
              <input style={{ ...inp, paddingRight:44 }} type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', color:'#475569', cursor:'pointer' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.08)',
              border:'1px solid rgba(239,68,68,.2)', borderRadius:8, fontSize:13,
              color:'#ef4444', marginBottom:16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px', borderRadius:10, cursor:'pointer',
            border:'none', fontFamily:'Inter,sans-serif', fontSize:14, fontWeight:700,
            background: loading ? '#1e1e3a' : 'linear-gradient(135deg,#8b5cf6,#00d4ff)',
            color: loading ? '#475569' : '#fff', transition:'all .2s', letterSpacing:.5,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {loading ? <><Loader size={16} className="spin" /> Chargement...</> :
              mode === 'login' ? '🚀 Se connecter' : '✨ Créer mon compte'}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#475569' }}>
          {mode === 'login' ? (
            <>Pas encore de compte ?{' '}
              <button onClick={() => { setMode('register'); setError(''); }}
                style={{ background:'none', border:'none', color:'#a78bfa', cursor:'pointer', fontWeight:600 }}>
                S'inscrire gratuitement
              </button>
            </>
          ) : (
            <>Déjà un compte ?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}
                style={{ background:'none', border:'none', color:'#00d4ff', cursor:'pointer', fontWeight:600 }}>
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { login }       = useAuth();
  const [modal, setModal] = useState(null); // 'login' | 'register' | null

  const handleSuccess = (token, user) => {
    login(token, user);
    setModal(null);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#07070f', color:'#e2e8f0',
      fontFamily:'Inter,sans-serif', overflowX:'hidden' }}>

      {/* Glow backgrounds */}
      <div style={{ position:'fixed', top:'-20%', left:'-10%', width:600, height:600,
        borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.12),transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-5%', width:500, height:500,
        borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,.08),transparent 70%)', pointerEvents:'none' }} />

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'20px 40px', borderBottom:'1px solid #1e1e3a', backdropFilter:'blur(20px)',
        position:'sticky', top:0, zIndex:100, background:'rgba(7,7,15,.8)' }}>
        <div>
          <div className="font-display" style={{ fontSize:14, fontWeight:700, letterSpacing:3,
            background:'linear-gradient(90deg,#a78bfa,#00d4ff)', WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent' }}>
            CREA ACTION
          </div>
          <div style={{ fontSize:10, color:'#475569', letterSpacing:2 }}>AUTO MONEY STUDIO</div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setModal('login')} style={{
            padding:'9px 20px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
            background:'transparent', border:'1px solid #2a2a4a', color:'#94a3b8', transition:'all .2s',
          }}>Se connecter</button>
          <button onClick={() => setModal('register')} style={{
            padding:'9px 20px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700,
            background:'linear-gradient(135deg,#8b5cf6,#00d4ff)', border:'none', color:'#fff', transition:'all .2s',
          }}>Commencer gratuitement</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign:'center', padding:'100px 20px 80px', maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px',
          background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.25)',
          borderRadius:20, fontSize:12, color:'#a78bfa', marginBottom:32, fontWeight:600 }}>
          <Bot size={13} /> AI Operator · Auto Money Studio
        </div>

        <h1 style={{ fontSize:56, fontWeight:800, lineHeight:1.1, marginBottom:24,
          background:'linear-gradient(135deg,#ffffff 0%,#a78bfa 50%,#00d4ff 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Génère des revenus<br />avec l'IA comme copilote
        </h1>

        <p style={{ fontSize:18, color:'#94a3b8', lineHeight:1.7, marginBottom:40, maxWidth:560, margin:'0 auto 40px' }}>
          Crea Action analyse tes plateformes, détecte les tendances, génère 10 contenus par jour et t'indique exactement quoi faire pour maximiser tes revenus.
        </p>

        <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => setModal('register')} style={{
            padding:'16px 36px', borderRadius:12, cursor:'pointer', fontSize:15, fontWeight:700,
            background:'linear-gradient(135deg,#8b5cf6,#00d4ff)', border:'none', color:'#fff',
            boxShadow:'0 0 40px rgba(139,92,246,.3)', transition:'all .2s', letterSpacing:.3,
          }}>
            🚀 Commencer gratuitement
          </button>
          <button onClick={() => setModal('login')} style={{
            padding:'16px 36px', borderRadius:12, cursor:'pointer', fontSize:15, fontWeight:600,
            background:'transparent', border:'1px solid #2a2a4a', color:'#94a3b8', transition:'all .2s',
          }}>
            Se connecter →
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:32, justifyContent:'center', marginTop:60, flexWrap:'wrap' }}>
          {[
            { val:'10',   label:'Contenus / jour' },
            { val:'24/7', label:'IA active' },
            { val:'4',    label:'Plateformes connectées' },
            { val:'100%', label:'Automatisé' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div className="font-display" style={{ fontSize:28, fontWeight:800,
                background:'linear-gradient(90deg,#a78bfa,#00d4ff)', WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent' }}>{val}</div>
              <div style={{ fontSize:12, color:'#475569', marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'60px 40px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, color:'#475569', letterSpacing:3, marginBottom:12 }}>FONCTIONNALITÉS</div>
          <h2 style={{ fontSize:32, fontWeight:700, color:'#e2e8f0' }}>Tout ce dont tu as besoin</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{ background:'#0e0e1c', border:'1px solid #1e1e3a', borderRadius:16,
              padding:24, transition:'all .2s', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
                background:`linear-gradient(90deg,${color},transparent)` }} />
              <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`,
                border:`1px solid ${color}25`, display:'flex', alignItems:'center',
                justifyContent:'center', marginBottom:16 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ textAlign:'center', padding:'80px 20px' }}>
        <div style={{ background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)',
          borderRadius:24, padding:'60px 40px', maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:32, fontWeight:700, marginBottom:16, color:'#e2e8f0' }}>
            Prêt à générer tes premiers revenus ?
          </h2>
          <p style={{ color:'#475569', marginBottom:32, fontSize:15 }}>
            Rejoins Crea Action et laisse l'IA travailler pour toi.
          </p>
          <button onClick={() => setModal('register')} style={{
            padding:'16px 48px', borderRadius:12, cursor:'pointer', fontSize:16, fontWeight:700,
            background:'linear-gradient(135deg,#8b5cf6,#00d4ff)', border:'none', color:'#fff',
            boxShadow:'0 0 40px rgba(139,92,246,.3)',
          }}>
            Créer mon compte gratuit ✨
          </button>
        </div>
      </section>

      {modal && (
        <AuthModal mode={modal} onClose={() => setModal(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}

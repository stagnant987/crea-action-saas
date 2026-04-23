import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Zap, Target, FlaskConical,
  Settings, Bell, RefreshCw, TrendingUp, Menu, X, Bot, LogOut,
} from 'lucide-react';
import { api, fmt } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Toast context ─────────────────────────────────────────────────────────────
export const ToastCtx = createContext(null);

export function useToast() { return useContext(ToastCtx); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  const colors = { ok: '#10b981', err: '#ef4444', info: '#00d4ff' };
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} className="toast-enter" style={{
            background:'#13132a', border:`1px solid ${colors[t.type]}40`,
            borderLeft:`3px solid ${colors[t.type]}`, borderRadius:10,
            padding:'10px 16px', fontSize:13, color:'#e2e8f0',
            boxShadow:'0 4px 20px rgba(0,0,0,.5)', minWidth:260,
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',        color: '#00d4ff' },
  { to: '/operator',      icon: Bot,             label: 'AI Operator',      color: '#a78bfa', hot: true },
  { to: '/studio',        icon: Zap,             label: 'Auto Money Studio', color: '#f59e0b' },
  { to: '/opportunities', icon: Target,           label: 'Opportunités',     color: '#10b981' },
  { to: '/tests',         icon: FlaskConical,     label: 'Tests & Scale',    color: '#8b5cf6' },
  { to: '/platforms',     icon: Settings,         label: 'Plateformes',      color: '#94a3b8' },
];

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const [revenue, setRevenue]   = useState(0);
  const [insight, setInsight]   = useState('');
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    api.dashboard().then(d => setRevenue(d.total_revenue)).catch(() => {});
    api.dailyInsight().then(d => setInsight(d.insight)).catch(() => {});
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#07070f' }}>

        {/* Overlay mobile */}
        {sideOpen && (
          <div onClick={() => setSideOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:40 }} />
        )}

        {/* ── Sidebar ── */}
        <aside style={{
          width: 220, flexShrink:0, background:'#0e0e1c',
          borderRight:'1px solid #1e1e3a', display:'flex', flexDirection:'column',
          padding:'20px 0', position: window.innerWidth < 768 ? 'fixed' : 'relative',
          top:0, left: sideOpen || window.innerWidth >= 768 ? 0 : -220,
          height:'100vh', zIndex:50, transition:'left .25s ease',
        }}>
          {/* Logo */}
          <div style={{ padding:'0 16px 24px', borderBottom:'1px solid #1e1e3a' }}>
            <div className="font-display" style={{ fontSize:13, fontWeight:700, letterSpacing:3,
              background:'linear-gradient(90deg,#00d4ff,#8b5cf6)', WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent' }}>
              CREA ACTION
            </div>
            <div style={{ fontSize:10, color:'#475569', marginTop:4, letterSpacing:2 }}>AUTO MONEY STUDIO</div>
          </div>

          {/* Revenue pill */}
          <div style={{ margin:'16px', padding:'10px 14px', background:'rgba(0,212,255,.04)',
            border:'1px solid rgba(0,212,255,.15)', borderRadius:10 }}>
            <div style={{ fontSize:9, color:'#475569', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
              Revenus / mois
            </div>
            <div className="font-display" style={{ fontSize:20, fontWeight:700, color:'#00d4ff',
              textShadow:'0 0 20px rgba(0,212,255,.4)' }}>
              {fmt(revenue)}
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding:'8px 10px', flex:1 }}>
            {NAV.map(({ to, icon: Icon, label, color, hot }) => (
              <NavLink key={to} to={to} onClick={() => setSideOpen(false)}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                  borderRadius:8, cursor:'pointer', textDecoration:'none',
                  marginBottom:2, border:'1px solid transparent', transition:'all .18s',
                  background: isActive ? 'rgba(0,212,255,.06)' : 'transparent',
                  borderColor: isActive ? 'rgba(0,212,255,.2)' : 'transparent',
                  color: isActive ? color : '#94a3b8',
                })}>
                <Icon size={15} />
                <span style={{ fontSize:13, fontWeight:500, letterSpacing:.3 }}>{label}</span>
                {hot && <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 6px', borderRadius:20,
                  background:'rgba(245,158,11,.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.3)',
                  fontWeight:700, letterSpacing:1 }}>HOT</span>}
              </NavLink>
            ))}
          </nav>

          {/* AI insight */}
          {insight && (
            <div style={{ margin:'0 12px 16px', padding:'10px 12px',
              background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)',
              borderRadius:10, fontSize:11, color:'#94a3b8', lineHeight:1.6 }}>
              <div style={{ fontSize:9, color:'#8b5cf6', letterSpacing:2, marginBottom:5, fontWeight:700 }}>
                💡 IA DU JOUR
              </div>
              {insight.slice(0, 140)}{insight.length > 140 ? '...' : ''}
            </div>
          )}

          {/* User + logout */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid #1e1e3a' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:12, color:'#e2e8f0', fontWeight:600 }}>{user?.name || user?.email?.split('@')[0]}</div>
                <div style={{ fontSize:10, color:'#2a2a4a', marginTop:2 }}>{user?.plan || 'free'}</div>
              </div>
              <button onClick={logout} title="Se déconnecter"
                style={{ background:'none', border:'1px solid #1e1e3a', borderRadius:7,
                  color:'#475569', cursor:'pointer', padding:'5px 7px',
                  display:'flex', alignItems:'center', transition:'all .2s' }}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Topbar */}
          <header style={{ height:60, background:'#0e0e1c', borderBottom:'1px solid #1e1e3a',
            display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
            <button onClick={() => setSideOpen(!sideOpen)}
              style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer',
                display: window.innerWidth < 768 ? 'flex' : 'none' }}>
              {sideOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div style={{ flex:1 }} />

            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)',
                borderRadius:20, fontSize:11, color:'#10b981' }}>
                <span className="pulse-glow" style={{ width:6, height:6, borderRadius:'50%',
                  background:'#10b981', display:'inline-block' }} />
                LIVE
              </div>
              <button onClick={() => window.location.reload()}
                style={{ background:'#13132a', border:'1px solid #1e1e3a', borderRadius:8,
                  color:'#94a3b8', width:34, height:34, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                <RefreshCw size={14} />
              </button>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex:1, overflowY:'auto', padding:24 }}>
            <div className="slide-in">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

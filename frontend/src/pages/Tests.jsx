import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowRight } from 'lucide-react';

export default function Tests() {
  const nav = useNavigate();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', textAlign:'center' }}>
      <FlaskConical size={48} style={{ color:'#8b5cf6', marginBottom:20, opacity:.6 }} />
      <h1 className="font-display" style={{ fontSize:14, fontWeight:700, letterSpacing:3, color:'#e2e8f0', marginBottom:8 }}>
        TEST &amp; SCALE
      </h1>
      <p style={{ fontSize:13, color:'#475569', marginBottom:20, maxWidth:380, lineHeight:1.7 }}>
        Les tests A/B sont intégrés directement dans le <strong style={{ color:'#e2e8f0' }}>Auto Money Studio</strong>, onglet "🧪 Test &amp; Scale".
      </p>
      <button onClick={() => nav('/studio')}
        style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
          background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)',
          borderRadius:10, color:'#a78bfa', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        Aller au Studio <ArrowRight size={14} />
      </button>
    </div>
  );
}

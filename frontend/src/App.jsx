import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Studio from './pages/Studio';
import Opportunities from './pages/Opportunities';
import Tests from './pages/Tests';
import Platforms from './pages/Platforms';
import Operator from './pages/Operator';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height:'100vh', background:'#07070f', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:13, fontWeight:700, letterSpacing:3,
            background:'linear-gradient(90deg,#a78bfa,#00d4ff)', WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent', marginBottom:16 }}>
            CREA ACTION
          </div>
          <div style={{ width:32, height:32, border:'2px solid #1e1e3a', borderTopColor:'#a78bfa',
            borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/operator"      element={<Operator />} />
        <Route path="/studio"        element={<Studio />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/tests"         element={<Tests />} />
        <Route path="/platforms"     element={<Platforms />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

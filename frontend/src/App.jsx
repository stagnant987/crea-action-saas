import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Studio from './pages/Studio';
import Opportunities from './pages/Opportunities';
import Tests from './pages/Tests';
import Platforms from './pages/Platforms';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/studio"        element={<Studio />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/tests"         element={<Tests />} />
        <Route path="/platforms"     element={<Platforms />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

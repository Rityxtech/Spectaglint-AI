import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Intelligence from './pages/Intelligence';
import Logs from './pages/Logs';
import Config from './pages/Config';
import Settings from './pages/Settings';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import JobBoard from './pages/JobBoard';
import ExtensionInstall from './pages/ExtensionInstall';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/install-extension" element={<ExtensionInstall />} />

        {/* Dashboard routes protected by guard */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feed" element={<Intelligence />} />
            <Route path="/history" element={<Logs />} />
            <Route path="/config" element={<Config />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/job-hunt" element={<JobBoard />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

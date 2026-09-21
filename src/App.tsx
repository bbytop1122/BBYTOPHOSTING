import React, { useState, useEffect } from 'react';
import { User, VPSInstance } from './types';
import { Landing } from './components/Landing';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { TerminalView } from './components/TerminalView';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'register' | 'user_dashboard' | 'admin_dashboard' | 'terminal'>(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
      const u: User = JSON.parse(savedUser);
      return u.role === 'admin' ? 'admin_dashboard' : 'user_dashboard';
    }
    return 'landing';
  });

  const [selectedVps, setSelectedVps] = useState<VPSInstance | null>(null);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('nexus_user', JSON.stringify(loggedInUser));
    if (loggedInUser.role === 'admin') {
      setCurrentView('admin_dashboard');
    } else {
      setCurrentView('user_dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexus_user');
    setCurrentView('landing');
  };

  const handleOpenTerminal = (vps: VPSInstance) => {
    setSelectedVps(vps);
    setCurrentView('terminal');
  };

  if (currentView === 'terminal' && selectedVps) {
    return <TerminalView vps={selectedVps} onBack={() => setCurrentView(user?.role === 'admin' ? 'admin_dashboard' : 'user_dashboard')} />;
  }

  if (currentView === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} onNavigate={(view) => setCurrentView(view)} />;
  }

  if (currentView === 'register') {
    return <Register onRegisterSuccess={handleLoginSuccess} onNavigate={(view) => setCurrentView(view)} />;
  }

  if (currentView === 'user_dashboard' && user) {
    return <UserDashboard user={user} onLogout={handleLogout} onOpenTerminal={handleOpenTerminal} />;
  }

  if (currentView === 'admin_dashboard' && user) {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <Landing onNavigate={(view) => setCurrentView(view)} />;
}

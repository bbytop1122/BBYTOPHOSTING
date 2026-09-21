import React, { useState, useEffect } from 'react';
import { Server, Terminal, Play, Square, RotateCw, ExternalLink, Cpu, HardDrive, Shield, Activity, LogOut, User as UserIcon } from 'lucide-react';
import { User, VPSInstance } from '../types';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onOpenTerminal: (vps: VPSInstance) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, onOpenTerminal }) => {
  const [vpsList, setVpsList] = useState<VPSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVps = async () => {
    try {
      const res = await fetch(`/api/vps?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      if (data.success) {
        setVpsList(data.vpsList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVps();
    const interval = setInterval(fetchVps, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAction = async (vpsId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(vpsId);
    try {
      const res = await fetch(`/api/vps/${vpsId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        fetchVps();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-600/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">NexusVPS</span>
            <span className="text-xs block text-cyan-400 font-mono tracking-widest uppercase">User Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <UserIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-slate-200">{user.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Virtual Private Servers</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your assigned VPS instances, monitor real-time resource specs, and access terminals.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-medium text-slate-300">
              Active Instances: <span className="text-emerald-400 font-bold">{vpsList.length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading your VPS instances...</div>
        ) : vpsList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">No VPS Assigned Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your administrator has not created any virtual servers for your account yet. Contact support or wait for provisioning.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {vpsList.map(vps => (
              <div key={vps.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tight text-white">{vps.hostname}</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                        vps.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        vps.status === 'restarting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {vps.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{vps.name} • Host Node: <span className="text-slate-300">{vps.nodeName}</span></p>
                  </div>
                  <button
                    onClick={() => onOpenTerminal(vps)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                  >
                    <Terminal className="w-4 h-4" /> Terminal Access
                  </button>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">CPU Usage</div>
                    <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-400" /> {vps.cpuUsage}%
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">RAM Allocation</div>
                    <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400" /> {vps.ramGb} GB
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Disk Space</div>
                    <div className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-teal-400" /> {vps.diskGb} GB
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">Uptime</div>
                    <div className="text-sm font-bold text-white mt-1.5 truncate">
                      {formatUptime(vps.uptimeSeconds)}
                    </div>
                  </div>
                </div>

                {/* Connection details & credentials */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>IP Address:</span>
                    <span className="text-white font-semibold">{vps.ipAddress}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Root Password:</span>
                    <span className="text-amber-400 font-semibold">{vps.rootPass}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Virtualization:</span>
                    <span className="text-indigo-400 uppercase">{vps.vpsType} ({vps.os})</span>
                  </div>
                </div>

                {/* Actions & sshx */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionLoading === vps.id}
                      onClick={() => handleAction(vps.id, 'start')}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Play className="w-3.5 h-3.5" /> Start
                    </button>
                    <button
                      disabled={actionLoading === vps.id}
                      onClick={() => handleAction(vps.id, 'stop')}
                      className="bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                    <button
                      disabled={actionLoading === vps.id}
                      onClick={() => handleAction(vps.id, 'restart')}
                      className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Restart
                    </button>
                  </div>

                  <a
                    href={vps.sshxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> sshx.io Access
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

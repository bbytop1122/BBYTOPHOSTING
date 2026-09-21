import React from 'react';
import { Server, Shield, Terminal, Cpu, HardDrive, Zap, ArrowRight, CheckCircle2, Code2 } from 'lucide-react';

interface LandingProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'user_dashboard' | 'admin_dashboard') => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              NexusVPS
            </span>
            <span className="text-xs block text-indigo-400 font-mono tracking-widest uppercase">Pro Manager</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('login')}
            className="text-slate-300 hover:text-white px-4 py-2 text-sm font-medium transition"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center lg:text-left grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5" /> Enterprise Multi-Node VPS Virtualization
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Deploy & Manage <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
              QEMU & Docker VMs
            </span> With Ease
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            The ultimate professional VPS manager panel. Connect remote nodes via python agent script, manage Ubuntu & Debian OS templates, launch isolated containers or KVM VMs, and grant instant terminal or sshx.io access.
          </p>
          <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
            <button
              onClick={() => onNavigate('login')}
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-8 py-3.5 rounded-xl font-semibold shadow-xl shadow-indigo-500/20 transition flex items-center gap-3"
            >
              <span>Access Control Panel</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 px-8 py-3.5 rounded-xl font-semibold transition flex items-center gap-2"
            >
              <Code2 className="w-5 h-5 text-indigo-400" />
              <span>Deploy Node Agent</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800/80 text-left">
            <div>
              <div className="text-2xl font-bold text-white">99.99%</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Node Uptime Tracking</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Ubuntu & Debian</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">OS Versions (10-13, 20-24)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">KVM & Docker</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Full Privileged Support</div>
            </div>
          </div>
        </div>

        {/* Hero Visual Card */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              </div>
              <span className="text-xs font-mono text-slate-400">nodeserver.py active</span>
            </div>
            
            <div className="space-y-4 font-mono text-xs text-left">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div className="text-emerald-400 font-semibold mb-1"># Node Health Status: ONLINE</div>
                <div className="text-slate-400">CPU Load: 24.5% (4 Cores)</div>
                <div className="text-slate-400">RAM: 12.4 GB / 32.0 GB used</div>
                <div className="text-slate-400">KVM Acceleration: Enabled (/dev/kvm)</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div className="text-indigo-400 font-semibold mb-1"># Active VPS Instances</div>
                <div className="flex justify-between text-slate-300 py-1 border-b border-slate-900">
                  <span>web-prod-01 (Ubuntu 22.04)</span>
                  <span className="text-emerald-400">Running</span>
                </div>
                <div className="flex justify-between text-slate-300 py-1">
                  <span>cache-redis-02 (Debian 12)</span>
                  <span className="text-emerald-400">Running</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> Secure Token Auth</span>
              <span className="text-indigo-400 font-medium">Nexus v2.4 Pro</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl font-bold">Engineered for High Performance VPS Hosting</h2>
          <p className="text-slate-400">Everything administrators and users need to manage multi-node virtualization infrastructure seamlessly.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Multi-Node Management</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Add local or remote nodes easily via Python agent (`nodeserver.py`). Automated background health monitoring checks CPU, RAM, Disk, and online connectivity continuously.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">QEMU & Docker Support</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Deploy lightning-fast QEMU KVM virtual machines or privileged Docker containers with full `systemctl` service management, custom ISO templates, and hardware acceleration toggles.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold">Web Terminal & sshx.io</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Users get instant browser terminal access routed to dedicated pages, root password visibility, live usage specs, uptime trackers, and one-click sshx.io remote tunneling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

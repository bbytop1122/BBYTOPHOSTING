import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, ArrowLeft, Play, RefreshCw, Cpu, Shield, Globe } from 'lucide-react';
import { VPSInstance } from '../types';

interface TerminalViewProps {
  vps: VPSInstance;
  onBack: () => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ vps, onBack }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([
    { type: 'output', text: `NexusVPS Secure Web Terminal v2.4` },
    { type: 'output', text: `Connected to VPS: ${vps.hostname} (${vps.ipAddress}) [Type: ${vps.vpsType.toUpperCase()}, OS: ${vps.os}]` },
    { type: 'output', text: `Type 'help' to see available commands.` },
    { type: 'output', text: `` }
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const newHistory = [...history, { type: 'input' as const, text: `root@${vps.hostname}:~# ${cmd}` }];
    setInput('');

    const lower = cmd.toLowerCase();
    if (lower === 'clear') {
      setHistory([]);
      return;
    } else if (lower === 'help') {
      newHistory.push({
        type: 'output',
        text: `Available simulated commands:\n  - htop / top : View live CPU & RAM usage\n  - uname -a   : Show kernel details\n  - df -h      : Show disk space\n  - systemctl status : View systemd services\n  - docker ps  : List containers (if Docker enabled)\n  - clear      : Clear screen\n  - exit       : Return to dashboard`
      });
    } else if (lower === 'exit') {
      onBack();
      return;
    } else if (lower === 'htop' || lower === 'top') {
      newHistory.push({
        type: 'output',
        text: `Tasks: 42 total, 1 running, 41 sleeping. CPU: ${vps.cpuUsage}% usr, 0.4% sys\nMem: ${vps.ramGb}GB RAM (${vps.ramUsage}% used), Swap: 0B used.`
      });
    } else if (lower === 'uname -a') {
      newHistory.push({
        type: 'output',
        text: `Linux ${vps.hostname} 6.5.0-generic #24-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
      });
    } else if (lower === 'df -h') {
      newHistory.push({
        type: 'output',
        text: `Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        ${vps.diskGb}G  ${(vps.diskGb * 0.35).toFixed(1)}G  ${(vps.diskGb * 0.65).toFixed(1)}G  35% /`
      });
    } else if (lower.startsWith('systemctl')) {
      newHistory.push({
        type: 'output',
        text: `● ${vps.hostname} systemd manager active\n   State: running\n   Running services: ssh, networking, cron, docker`
      });
    } else if (lower === 'docker ps') {
      newHistory.push({
        type: 'output',
        text: `CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES\na1b2c3d4e5f6   nginx:alpine   "/docker-entrypoint.…"   2 hours ago     Up 2 hours     80/tcp    web_proxy`
      });
    } else {
      newHistory.push({
        type: 'output',
        text: `bash: ${cmd}: command not found. Type 'help' for available commands.`
      });
    }

    setHistory(newHistory);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-tight text-white">{vps.hostname}</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {vps.status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-cyan-400" /> {vps.ipAddress}</span>
          <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-indigo-400" /> {vps.cpuCores} Cores / {vps.ramGb}GB RAM</span>
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-amber-400" /> Root Password: {vps.rootPass}</span>
        </div>
      </header>

      {/* Terminal Container */}
      <div className="flex-1 p-6 max-w-6xl w-full mx-auto flex flex-col">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="ml-2 font-mono text-slate-300">root@{vps.hostname}: ~ (bash)</span>
            </div>
            <div className="text-indigo-400 font-semibold uppercase text-[10px] tracking-wider">
              {vps.vpsType} virtual machine
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-3 text-sm text-slate-200">
            {history.map((item, idx) => (
              <div key={idx} className={item.type === 'input' ? 'text-cyan-400 font-semibold' : 'text-slate-300 whitespace-pre-wrap'}>
                {item.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleCommand} className="bg-slate-950 border-t border-slate-800 p-4 flex items-center gap-3">
            <span className="text-emerald-400 text-sm font-bold">root@{vps.hostname}:~#</span>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-white text-sm focus:outline-none font-mono"
              placeholder="Type command (e.g. htop, df -h, docker ps)..."
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-sans font-semibold transition"
            >
              Execute
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

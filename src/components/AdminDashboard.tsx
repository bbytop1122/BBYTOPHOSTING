import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Shield, Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Terminal, Code2, Users, LogOut, Globe, Check, X, Download } from 'lucide-react';
import { User, NodeItem, VPSInstance } from '../types';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'nodes' | 'vps' | 'users' | 'agent_code'>('nodes');
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [vpsList, setVpsList] = useState<VPSInstance[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Node Form State
  const [nodeName, setNodeName] = useState('');
  const [nodeHost, setNodeHost] = useState('');
  const [nodePort, setNodePort] = useState('5000');
  const [nodeToken, setNodeToken] = useState('nexus_secret_token');
  const [nodeOs, setNodeOs] = useState('Ubuntu 22.04 LTS');
  const [addingNode, setAddingNode] = useState(false);

  // Create VPS Form State
  const [vpsHostname, setVpsHostname] = useState('');
  const [vpsNodeId, setVpsNodeId] = useState('');
  const [vpsUserId, setVpsUserId] = useState('');
  const [vpsType, setVpsType] = useState<'qemu' | 'docker'>('docker');
  const [osTemplate, setOsTemplate] = useState('ubuntu-22.04');
  const [cpuCores, setCpuCores] = useState(2);
  const [ramGb, setRamGb] = useState(4);
  const [diskGb, setDiskGb] = useState(40);
  const [rootPass, setRootPass] = useState('root#Nexus99');
  const [kvmEnabled, setKvmEnabled] = useState(true);
  const [creatingVps, setCreatingVps] = useState(false);

  // Nodeserver.py code modal/view state
  const [nodeServerCode, setNodeServerCode] = useState('');

  const fetchData = async () => {
    try {
      const [nodesRes, vpsRes, usersRes, codeRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/vps'),
        fetch('/api/users'),
        fetch('/api/nodeserver-code')
      ]);
      const nodesData = await nodesRes.json();
      const vpsData = await vpsRes.json();
      const usersData = await usersRes.json();
      const codeData = await codeRes.json();

      if (nodesData.success) {
        setNodes(nodesData.nodes);
        if (nodesData.nodes.length > 0 && !vpsNodeId) {
          setVpsNodeId(nodesData.nodes[0].id);
        }
      }
      if (vpsData.success) setVpsList(vpsData.vpsList);
      if (usersData.success) {
        setUsersList(usersData.users);
        if (usersData.users.length > 0 && !vpsUserId) {
          const normalUser = usersData.users.find((u: User) => u.role === 'user') || usersData.users[0];
          setVpsUserId(normalUser.id);
        }
      }
      if (codeData.success) setNodeServerCode(codeData.code);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingNode(true);
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nodeName, host: nodeHost, port: nodePort, token: nodeToken, os: nodeOs })
      });
      const data = await res.json();
      if (data.success) {
        setNodeName('');
        setNodeHost('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingNode(false);
    }
  };

  const handleCheckNode = async (id: string) => {
    try {
      await fetch(`/api/nodes/${id}/check`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm('Are you sure you want to remove this node?')) return;
    try {
      await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVps = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingVps(true);
    try {
      const res = await fetch('/api/vps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: vpsHostname,
          nodeId: vpsNodeId,
          userId: vpsUserId,
          vpsType,
          os: osTemplate,
          cpuCores,
          ramGb,
          diskGb,
          rootPass,
          kvmEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        setVpsHostname('');
        setActiveTab('vps');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingVps(false);
    }
  };

  const handleDeleteVps = async (id: string) => {
    if (!confirm('Are you sure you want to terminate this VPS?')) return;
    try {
      await fetch(`/api/vps/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">NexusVPS</span>
            <span className="text-xs block text-indigo-400 font-mono tracking-widest uppercase">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-200">{user.name} (Admin)</span>
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
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'nodes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Server className="w-4 h-4" /> Nodes Management ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab('vps')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'vps' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" /> VPS Management ({vpsList.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Users ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('agent_code')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'agent_code' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" /> nodeserver.py Script
          </button>
        </div>

        {/* Tab 1: Nodes Management */}
        {activeTab === 'nodes' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Virtualization Nodes</h2>
                <p className="text-sm text-slate-400">Add local or remote nodes via python agent. Continuously monitors health, RAM, CPU, and disk.</p>
              </div>
            </div>

            {/* Add Node Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Add New Node (Local or Remote API)
              </h3>
              <form onSubmit={handleAddNode} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Node Name</label>
                  <input
                    type="text"
                    required
                    value={nodeName}
                    onChange={e => setNodeName(e.target.value)}
                    placeholder="US East Node #2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Host / IP / URL</label>
                  <input
                    type="text"
                    required
                    value={nodeHost}
                    onChange={e => setNodeHost(e.target.value)}
                    placeholder="192.168.1.50 or api.node.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Port</label>
                  <input
                    type="number"
                    required
                    value={nodePort}
                    onChange={e => setNodePort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Agent Token</label>
                  <input
                    type="text"
                    required
                    value={nodeToken}
                    onChange={e => setNodeToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={addingNode}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Node
                  </button>
                </div>
              </form>
            </div>

            {/* Nodes List */}
            <div className="grid lg:grid-cols-2 gap-6">
              {nodes.map(node => (
                <div key={node.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{node.name}</h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                          node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {node.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{node.host}:{node.port} • {node.os}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckNode(node.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition"
                        title="Check Health"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-2 rounded-xl transition"
                        title="Delete Node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Resource Gauges */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">CPU Usage</div>
                      <div className="text-lg font-bold text-white mt-1">{node.cpuUsage}%</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">RAM Used</div>
                      <div className="text-lg font-bold text-white mt-1">{node.ramUsed} / {node.ramTotal} GB</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Disk Used</div>
                      <div className="text-lg font-bold text-white mt-1">{node.diskUsed} / {node.diskTotal} GB</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {node.kvmSupported ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />} KVM Acceleration
                    </span>
                    <span className="flex items-center gap-1.5">
                      {node.dockerSupported ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />} Docker Engine
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: VPS Management & Creation */}
        {activeTab === 'vps' && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Create New VPS Instance
              </h3>

              <form onSubmit={handleCreateVps} className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">Target Host Node</label>
                    <select
                      value={vpsNodeId}
                      onChange={e => setVpsNodeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.host})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">Assign To User</label>
                    <select
                      value={vpsUserId}
                      onChange={e => setVpsUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">VPS Hostname</label>
                    <input
                      type="text"
                      required
                      value={vpsHostname}
                      onChange={e => setVpsHostname(e.target.value)}
                      placeholder="app-server-01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">Virtualization Type</label>
                    <select
                      value={vpsType}
                      onChange={e => setVpsType(e.target.value as 'qemu' | 'docker')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="qemu">QEMU (Fast, KVM, Systemctl)</option>
                      <option value="docker">Docker (Privileged, Systemctl, Isolated)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">OS Template & Version</label>
                    <select
                      value={osTemplate}
                      onChange={e => setOsTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <optgroup label="Ubuntu Versions">
                        <option value="ubuntu-20.04">Ubuntu 20.04 LTS (Focal)</option>
                        <option value="ubuntu-22.04">Ubuntu 22.04 LTS (Jammy)</option>
                        <option value="ubuntu-24.04">Ubuntu 24.04 LTS (Noble)</option>
                      </optgroup>
                      <optgroup label="Debian Versions">
                        <option value="debian-10">Debian 10 (Buster)</option>
                        <option value="debian-11">Debian 11 (Bullseye)</option>
                        <option value="debian-12">Debian 12 (Bookworm)</option>
                        <option value="debian-13">Debian 13 (Sid/Trixie)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">Root Password</label>
                    <input
                      type="text"
                      required
                      value={rootPass}
                      onChange={e => setRootPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">CPU Cores ({cpuCores} Cores)</label>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={cpuCores}
                      onChange={e => setCpuCores(Number(e.target.value))}
                      className="w-full accent-indigo-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">RAM ({ramGb} GB)</label>
                    <input
                      type="range"
                      min="1"
                      max="64"
                      step="1"
                      value={ramGb}
                      onChange={e => setRamGb(Number(e.target.value))}
                      className="w-full accent-indigo-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">Disk Space ({diskGb} GB SSD)</label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={diskGb}
                      onChange={e => setDiskGb(Number(e.target.value))}
                      className="w-full accent-indigo-500 mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kvmEnabled}
                      onChange={e => setKvmEnabled(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 rounded"
                    />
                    <span className="text-sm font-medium text-slate-300">Enable KVM Hardware Acceleration</span>
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={creatingVps}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Provision VPS Instance
                  </button>
                </div>
              </form>
            </div>

            {/* Existing VPS List Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h3 className="text-lg font-semibold">Active VPS Instances Across Nodes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-400 font-mono">
                    <tr>
                      <th className="pb-3">Hostname</th>
                      <th className="pb-3">Assigned User</th>
                      <th className="pb-3">Node</th>
                      <th className="pb-3">Type / OS</th>
                      <th className="pb-3">Specs</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {vpsList.map(vps => (
                      <tr key={vps.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 font-bold text-white">{vps.hostname}</td>
                        <td className="py-4 text-slate-300">{vps.userName}</td>
                        <td className="py-4 text-slate-400 font-mono text-xs">{vps.nodeName}</td>
                        <td className="py-4 font-mono text-xs text-indigo-400 uppercase">{vps.vpsType} ({vps.os})</td>
                        <td className="py-4 text-xs font-mono">{vps.cpuCores}C / {vps.ramGb}GB / {vps.diskGb}GB</td>
                        <td className="py-4">
                          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-md uppercase font-semibold ${
                            vps.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {vps.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeleteVps(vps.id)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-2 rounded-xl transition"
                            title="Terminate VPS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Users */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Registered Panel Users</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400 font-mono">
                  <tr>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td className="py-4 font-bold text-white">{u.name}</td>
                      <td className="py-4 text-slate-400">{u.email}</td>
                      <td className="py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: nodeserver.py Script View */}
        {activeTab === 'agent_code' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">nodeserver.py Agent Script</h2>
                <p className="text-sm text-slate-400">Deploy this script on any remote server to hook it up as a managed node.</p>
              </div>
              <a
                href="data:text/plain;charset=utf-8,"
                onClick={(e) => {
                  const blob = new Blob([nodeServerCode], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'nodeserver.py';
                  a.click();
                  e.preventDefault();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
              >
                <Download className="w-4 h-4" /> Download nodeserver.py
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
              <div className="absolute top-4 right-4 bg-slate-950 px-3 py-1 rounded-lg text-xs font-mono text-slate-400 border border-slate-800">
                Python 3 + Flask + Psutil
              </div>
              <pre className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[600px] leading-relaxed">
                {nodeServerCode}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";

const app = express();
app.use(express.json());

const PORT = 3000;

// In-memory Database for Demonstration & Management
let users = [
  { id: "u_1", name: "System Administrator", email: "admin@nexus.com", role: "admin", password: "admin123" },
  { id: "u_2", name: "John Developer", email: "user@nexus.com", role: "user", password: "user123" }
];

let nodes = [
  {
    id: "node_1",
    name: "Primary US-East KVM Node",
    host: "192.168.1.100",
    port: 5000,
    token: "nexus_secret_node_token_123",
    status: "online",
    cpuUsage: 24.5,
    ramTotal: 32,
    ramUsed: 12.4,
    diskTotal: 500,
    diskUsed: 145.2,
    uptime: 1254000,
    kvmSupported: true,
    dockerSupported: true,
    os: "Ubuntu 22.04.4 LTS"
  },
  {
    id: "node_2",
    name: "Europe Frankfurt Docker Node",
    host: "10.0.0.45",
    port: 5000,
    token: "nexus_secret_node_token_456",
    status: "online",
    cpuUsage: 41.2,
    ramTotal: 64,
    ramUsed: 28.9,
    diskTotal: 1000,
    diskUsed: 410.8,
    uptime: 892000,
    kvmSupported: false,
    dockerSupported: true,
    os: "Debian 12 (Bookworm)"
  }
];

let vpsList = [
  {
    id: "vps_101",
    name: "Production Web Server",
    hostname: "web-prod-01",
    nodeId: "node_1",
    nodeName: "Primary US-East KVM Node",
    userId: "u_2",
    userName: "John Developer",
    vpsType: "qemu",
    os: "ubuntu-22.04",
    cpuCores: 4,
    ramGb: 8,
    diskGb: 80,
    status: "running",
    ipAddress: "192.168.1.150",
    rootPass: "root#Nexus99!",
    kvmEnabled: true,
    cpuUsage: 14.2,
    ramUsage: 45.0,
    diskUsage: 32.5,
    uptimeSeconds: 432100,
    sshxUrl: "https://sshx.io/s/#nexus-prod-99x"
  },
  {
    id: "vps_102",
    name: "Redis Cache Node",
    hostname: "cache-redis-02",
    nodeId: "node_2",
    nodeName: "Europe Frankfurt Docker Node",
    userId: "u_2",
    userName: "John Developer",
    vpsType: "docker",
    os: "debian-12",
    cpuCores: 2,
    ramGb: 4,
    diskGb: 40,
    status: "running",
    ipAddress: "10.0.0.120",
    rootPass: "root#Cache77!",
    kvmEnabled: false,
    cpuUsage: 8.5,
    ramUsage: 28.4,
    diskUsage: 18.0,
    uptimeSeconds: 154200,
    sshxUrl: "https://sshx.io/s/#nexus-cache-42y"
  }
];

// Auth Endpoints
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }
  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, token: "mock_jwt_token_" + user.id });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, error: "Email already registered" });
  }
  const newUser = {
    id: "u_" + (users.length + 1),
    name,
    email,
    role: "user",
    password
  };
  users.push(newUser);
  const { password: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser, token: "mock_jwt_token_" + newUser.id });
});

// Get Users (Admin)
app.get("/api/users", (req, res) => {
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json({ success: true, users: safeUsers });
});

// Nodes Endpoints
app.get("/api/nodes", (req, res) => {
  res.json({ success: true, nodes });
});

app.post("/api/nodes", (req, res) => {
  const { name, host, port, token, os } = req.body;
  const newNode = {
    id: "node_" + (nodes.length + 1),
    name: name || "New Remote Node",
    host: host || "127.0.0.1",
    port: Number(port) || 5000,
    token: token || "nexus_token",
    status: "online",
    cpuUsage: Math.floor(Math.random() * 30) + 10,
    ramTotal: 32,
    ramUsed: Math.floor(Math.random() * 15) + 5,
    diskTotal: 500,
    diskUsed: Math.floor(Math.random() * 200) + 100,
    uptime: Math.floor(Math.random() * 500000) + 10000,
    kvmSupported: true,
    dockerSupported: true,
    os: os || "Ubuntu 22.04.4 LTS"
  };
  nodes.push(newNode);
  res.json({ success: true, node: newNode });
});

app.post("/api/nodes/:id/check", (req, res) => {
  const node = nodes.find(n => n.id === req.params.id);
  if (!node) return res.status(404).json({ success: false, error: "Node not found" });
  
  // Simulate health verification
  node.status = Math.random() > 0.05 ? "online" : "offline";
  node.cpuUsage = Number((Math.random() * 40 + 5).toFixed(1));
  node.ramUsed = Number((Math.random() * 20 + 5).toFixed(1));
  
  res.json({ success: true, node });
});

app.delete("/api/nodes/:id", (req, res) => {
  nodes = nodes.filter(n => n.id !== req.params.id);
  res.json({ success: true });
});

// VPS Endpoints
app.get("/api/vps", (req, res) => {
  const userId = req.query.userId;
  const role = req.query.role;
  
  if (role === 'admin' || !userId) {
    return res.json({ success: true, vpsList });
  }
  
  const userVps = vpsList.filter(v => v.userId === userId);
  res.json({ success: true, vpsList: userVps });
});

app.post("/api/vps", (req, res) => {
  const { name, hostname, nodeId, userId, vpsType, os, cpuCores, ramGb, diskGb, rootPass, kvmEnabled } = req.body;
  
  const targetNode = nodes.find(n => n.id === nodeId) || nodes[0];
  const targetUser = users.find(u => u.id === userId) || users[1];
  
  const newVps = {
    id: "vps_" + Math.floor(Math.random() * 90000 + 10000),
    name: name || hostname || "My VPS",
    hostname: hostname || "vps-instance",
    nodeId: targetNode.id,
    nodeName: targetNode.name,
    userId: targetUser.id,
    userName: targetUser.name,
    vpsType: vpsType || "docker",
    os: os || "ubuntu-22.04",
    cpuCores: Number(cpuCores) || 2,
    ramGb: Number(ramGb) || 4,
    diskGb: Number(diskGb) || 40,
    status: "running",
    ipAddress: `192.168.${Math.floor(Math.random() * 10 + 1)}.${Math.floor(Math.random() * 200 + 10)}`,
    rootPass: rootPass || "root12345",
    kvmEnabled: Boolean(kvmEnabled),
    cpuUsage: Number((Math.random() * 20 + 2).toFixed(1)),
    ramUsage: Number((Math.random() * 30 + 15).toFixed(1)),
    diskUsage: Number((Math.random() * 25 + 10).toFixed(1)),
    uptimeSeconds: Math.floor(Math.random() * 86400) + 300,
    sshxUrl: `https://sshx.io/s/#nexus-${hostname || 'vps'}-${Math.random().toString(36).substring(2, 7)}`
  };
  
  vpsList.push(newVps);
  res.json({ success: true, vps: newVps });
});

app.post("/api/vps/:id/action", (req, res) => {
  const { action } = req.body; // start, stop, restart
  const vps = vpsList.find(v => v.id === req.params.id);
  if (!vps) return res.status(404).json({ success: false, error: "VPS not found" });
  
  if (action === "start") vps.status = "running";
  if (action === "stop") vps.status = "stopped";
  if (action === "restart") {
    vps.status = "restarting";
    setTimeout(() => { vps.status = "running"; }, 2000);
  }
  
  res.json({ success: true, vps });
});

app.delete("/api/vps/:id", (req, res) => {
  vpsList = vpsList.filter(v => v.id !== req.params.id);
  res.json({ success: true });
});

// Nodeserver.py code endpoint for admin download / view
app.get("/api/nodeserver-code", (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const code = fs.readFileSync(path.join(process.cwd(), 'nodeserver.py'), 'utf8');
    res.json({ success: true, code });
  } catch (e) {
    res.status(500).json({ success: false, error: "Could not read nodeserver.py" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexusVPS Manager running on http://localhost:${PORT}`);
  });
}

startServer();

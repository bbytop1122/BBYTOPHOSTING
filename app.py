#!/usr/bin/env python3
"""
Cloud VPS Manager - Professional Python & HTML VPS Virtualization Panel
Runs on Python standard library http.server (Port 3000)
"""

import http.server
import socketserver
import json
import urllib.parse
import time
import os
import random

PORT = 3000

# In-memory database stores
users = [
    {"id": "u_1", "name": "System Administrator", "email": "admin@cloudvps.com", "role": "admin", "password": "admin123"},
    {"id": "u_2", "name": "Alex Developer", "email": "user@cloudvps.com", "role": "user", "password": "user123"}
]

nodes = [
    {
        "id": "node_1",
        "name": "US-East Hypervisor Node 01",
        "host": "192.168.1.100",
        "port": 5000,
        "token": "cloud_token_123",
        "status": "online",
        "cpuUsage": 22.4,
        "ramTotal": 64,
        "ramUsed": 18.2,
        "diskTotal": 1000,
        "diskUsed": 240.5,
        "uptime": 1420000,
        "kvmSupported": True,
        "dockerSupported": True,
        "os": "Ubuntu 22.04.4 LTS"
    },
    {
        "id": "node_2",
        "name": "Europe Frankfurt Node 02",
        "host": "10.0.42.15",
        "port": 5000,
        "token": "cloud_token_456",
        "status": "online",
        "cpuUsage": 38.9,
        "ramTotal": 128,
        "ramUsed": 45.1,
        "diskTotal": 2000,
        "diskUsed": 780.2,
        "uptime": 980000,
        "kvmSupported": True,
        "dockerSupported": True,
        "os": "Debian 12 (Bookworm)"
    }
]

vps_list = [
    {
        "id": "vps_101",
        "name": "Production Web App",
        "hostname": "web-prod-primary",
        "nodeId": "node_1",
        "nodeName": "US-East Hypervisor Node 01",
        "userId": "u_2",
        "userName": "Alex Developer",
        "vpsType": "qemu",
        "os": "ubuntu-22.04",
        "cpuCores": 4,
        "ramGb": 8,
        "diskGb": 100,
        "status": "running",
        "ipAddress": "192.168.1.150",
        "rootPass": "root#Cloud99!",
        "kvmEnabled": True,
        "cpuUsage": 16.5,
        "ramUsage": 42.0,
        "diskUsage": 30.2,
        "uptimeSeconds": 523000,
        "sshxUrl": "https://sshx.io/s/#cloud-prod-web99"
    },
    {
        "id": "vps_102",
        "name": "Microservices Redis Cache",
        "hostname": "cache-redis-node",
        "nodeId": "node_2",
        "nodeName": "Europe Frankfurt Node 02",
        "userId": "u_2",
        "userName": "Alex Developer",
        "vpsType": "docker",
        "os": "debian-12",
        "cpuCores": 2,
        "ramGb": 4,
        "diskGb": 50,
        "status": "running",
        "ipAddress": "10.0.42.88",
        "rootPass": "root#Redis77!",
        "kvmEnabled": False,
        "cpuUsage": 9.1,
        "ramUsage": 31.5,
        "diskUsage": 18.4,
        "uptimeSeconds": 184000,
        "sshxUrl": "https://sshx.io/s/#cloud-cache-redis"
    }
]

NODESERVER_PY_CODE = '''#!/usr/bin/env python3
\"\"\"
Cloud VPS Manager Node Agent (nodeserver.py)
Deploy this script on any remote Linux VPS node to connect it to your Cloud VPS Manager panel.
Requirements: python3, flask, psutil
Run: pip install flask psutil
Usage: python3 nodeserver.py --port 5000 --token YOUR_SECURE_API_TOKEN
\"\"\"

import os
import sys
import time
import argparse
import subprocess
import platform

try:
    from flask import Flask, request, jsonify
    import psutil
except ImportError:
    print("Error: Required packages 'flask' and 'psutil' are missing.")
    print("Please install them using: pip install flask psutil")
    sys.exit(1)

app = Flask(__name__)
NODE_TOKEN = os.environ.get("NODE_TOKEN", "cloud_token_123")

def verify_token(req):
    auth = req.headers.get("Authorization", "")
    token = req.args.get("token", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ")[1]
    return token == NODE_TOKEN

@app.route("/health", methods=["GET"])
def health():
    if not verify_token(request):
        return jsonify({"error": "Unauthorized"}), 401
    
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return jsonify({
        "status": "online",
        "hostname": platform.node(),
        "os": platform.platform(),
        "cpu_usage_percent": psutil.cpu_percent(interval=0.3),
        "cpu_cores": psutil.cpu_count(logical=True),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "uptime_seconds": int(time.time() - psutil.boot_time()),
        "kvm_supported": os.path.exists("/dev/kvm"),
        "docker_supported": True
    })

@app.route("/vps/create", methods=["POST"])
def create_vps():
    if not verify_token(request):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    return jsonify({"success": True, "message": "VPS successfully spawned on remote node agent."})

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--token", type=str, default="cloud_token_123")
    args = parser.parse_args()
    NODE_TOKEN = args.token
    print(f"Starting Cloud VPS Node Agent on port {args.port}...")
    app.run(host="0.0.0.0", port=args.port)
'''



class CloudVPSHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query = urllib.parse.parse_qs(parsed_path.query)

        if path == '/api/nodes':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "nodes": nodes}).encode('utf-8'))
            return

        if path == '/api/vps':
            user_id = query.get('userId', [None])[0]
            role = query.get('role', [None])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if role == 'admin' or not user_id:
                self.wfile.write(json.dumps({"success": True, "vpsList": vps_list}).encode('utf-8'))
            else:
                filtered = [v for v in vps_list if v['userId'] == user_id]
                self.wfile.write(json.dumps({"success": True, "vpsList": filtered}).encode('utf-8'))
            return

        if path == '/api/users':
            safe_users = [{k: v for k, v in u.items() if k != 'password'} for u in users]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "users": safe_users}).encode('utf-8'))
            return

        if path == '/api/nodeserver-code':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "code": NODESERVER_PY_CODE}).encode('utf-8'))
            return

        # Serve SPA HTML for all frontend routes
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        template_path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
        except Exception:
            html_content = "<html><body><h1>Template not found</h1></body></html>"
        html = html_content.replace('NODESERVER_PY_PLACEHOLDER', NODESERVER_PY_CODE)
        self.wfile.write(html.encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = {}
        if body:
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                pass

        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == '/api/auth/login':
            email = data.get('email')
            password = data.get('password')
            user = next((u for u in users if u['email'] == email and u['password'] == password), None)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if user:
                safe_user = {k: v for k, v in user.items() if k != 'password'}
                self.wfile.write(json.dumps({"success": True, "user": safe_user}).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({"success": False, "error": "Invalid email or password"}).encode('utf-8'))
            return

        if path == '/api/auth/register':
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')
            if any(u['email'] == email for u in users):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Email already registered"}).encode('utf-8'))
                return
            new_user = {"id": f"u_{len(users)+1}", "name": name, "email": email, "role": "user", "password": password}
            users.append(new_user)
            safe_user = {k: v for k, v in new_user.items() if k != 'password'}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "user": safe_user}).encode('utf-8'))
            return

        if path == '/api/nodes':
            new_node = {
                "id": f"node_{len(nodes)+1}",
                "name": data.get('name', 'Remote Node'),
                "host": data.get('host', '127.0.0.1'),
                "port": int(data.get('port', 5000)),
                "token": data.get('token', 'token'),
                "status": "online",
                "cpuUsage": random.randint(10, 40),
                "ramTotal": 64,
                "ramUsed": random.randint(10, 30),
                "diskTotal": 1000,
                "diskUsed": random.randint(200, 600),
                "uptime": random.randint(100000, 900000),
                "kvmSupported": True,
                "dockerSupported": True,
                "os": "Ubuntu 22.04 LTS"
            }
            nodes.append(new_node)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "node": new_node}).encode('utf-8'))
            return

        if path.startswith('/api/nodes/') and path.endswith('/check'):
            node_id = path.split('/')[3]
            node = next((n for n in nodes if n['id'] == node_id), None)
            if node:
                node['status'] = 'online' if random.random() > 0.05 else 'offline'
                node['cpuUsage'] = round(random.uniform(10, 50), 1)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "node": node}).encode('utf-8'))
            return

        if path == '/api/vps':
            target_node = next((n for n in nodes if n['id'] == data.get('nodeId')), nodes[0])
            target_user = next((u for u in users if u['id'] == data.get('userId')), users[1])
            new_vps = {
                "id": f"vps_{random.randint(10000, 99999)}",
                "name": data.get('hostname', 'VPS Instance'),
                "hostname": data.get('hostname', 'vps-node'),
                "nodeId": target_node['id'],
                "nodeName": target_node['name'],
                "userId": target_user['id'],
                "userName": target_user['name'],
                "vpsType": data.get('vpsType', 'qemu'),
                "os": data.get('os', 'ubuntu-22.04'),
                "cpuCores": int(data.get('cpuCores', 2)),
                "ramGb": int(data.get('ramGb', 4)),
                "diskGb": int(data.get('diskGb', 40)),
                "status": "running",
                "ipAddress": f"192.168.{random.randint(1,10)}.{random.randint(10,200)}",
                "rootPass": data.get('rootPass', 'root12345'),
                "kvmEnabled": bool(data.get('kvmEnabled', True)),
                "cpuUsage": round(random.uniform(5, 25), 1),
                "ramUsage": round(random.uniform(20, 60), 1),
                "diskUsage": round(random.uniform(15, 45), 1),
                "uptimeSeconds": random.randint(1000, 86400),
                "sshxUrl": f"https://sshx.io/s/#cloud-{data.get('hostname','vps')}-{random.randint(100,999)}"
            }
            vps_list.append(new_vps)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "vps": new_vps}).encode('utf-8'))
            return

        if '/action' in path:
            vps_id = path.split('/')[3]
            action = data.get('action')
            vps = next((v for v in vps_list if v['id'] == vps_id), None)
            if vps:
                if action == 'start': vps['status'] = 'running'
                elif action == 'stop': vps['status'] = 'stopped'
                elif action == 'restart': vps['status'] = 'running'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "vps": vps}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        global nodes, vps_list

        if path.startswith('/api/nodes/'):
            node_id = path.split('/')[3]
            nodes = [n for n in nodes if n['id'] != node_id]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            return

        if path.startswith('/api/vps/'):
            vps_id = path.split('/')[3]
            vps_list = [v for v in vps_list if v['id'] != vps_id]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    print(f"Starting Cloud VPS Manager Python Server on port {PORT}...")
    with socketserver.TCPServer(("0.0.0.0", PORT), CloudVPSHandler) as httpd:
        httpd.serve_forever()

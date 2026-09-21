#!/usr/bin/env python3
"""
CloudVPS Enterprise - Professional Multi-Page Python VPS Virtualization Panel
Supports Local & Remote Node Management (nodeserver.py integration)
"""

import http.server
import socketserver
import json
import urllib.parse
import os
import random
import urllib.request

PORT = int(os.environ.get("PORT", 3000))

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
        "token": "nexus_secret_node_token_123",
        "status": "online",
        "cpuUsage": 22.4,
        "ramTotal": 64,
        "ramUsed": 18.2,
        "diskTotal": 1000,
        "diskUsed": 240.5,
        "kvmSupported": True,
        "dockerSupported": True,
        "os": "Ubuntu 22.04.4 LTS",
        "type": "local"
    },
    {
        "id": "node_2",
        "name": "Europe Frankfurt Node 02",
        "host": "10.0.42.15",
        "port": 5000,
        "token": "nexus_secret_node_token_456",
        "status": "online",
        "cpuUsage": 38.9,
        "ramTotal": 128,
        "ramUsed": 45.1,
        "diskTotal": 2000,
        "diskUsed": 780.2,
        "kvmSupported": True,
        "dockerSupported": True,
        "os": "Debian 12 (Bookworm)",
        "type": "remote"
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
        "diskUsage": 30.2
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
        "cpuUsage": 8.1,
        "ramUsage": 28.5,
        "diskUsage": 18.4
    }
]

class CloudVPSHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Serve Separate HTML Pages
        if path == "/" or path == "/index.html":
            self.serve_html("landing.html")
            return
        elif path == "/dashboard":
            self.serve_html("user_dashboard.html")
            return
        elif path == "/admin":
            self.serve_html("admin_dashboard.html")
            return
        elif path == "/terminal":
            self.serve_html("terminal.html")
            return

        # API Endpoints
        elif path == "/api/nodes":
            self.send_json({"success": True, "nodes": nodes})

        elif path == "/api/vps":
            user_id = query_params.get("userId", [None])[0]
            user_vps = [v for v in vps_list if v["userId"] == user_id] if user_id else vps_list
            self.send_json({"success": True, "vpsList": user_vps})

        elif path == "/api/vps/detail":
            vps_id = query_params.get("id", [None])[0]
            vps = next((v for v in vps_list if v["id"] == vps_id), None)
            if vps:
                self.send_json({"success": True, "vps": vps})
            else:
                self.send_json({"success": False, "error": "VPS not found"}, 404)

        elif path == "/api/admin/stats":
            self.send_json({
                "success": True,
                "nodes": nodes,
                "users": users,
                "vpsList": vps_list
            })

        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            data = json.loads(body.decode('utf-8'))
        except Exception:
            data = {}

        if path == "/api/login":
            email = data.get("email", "").strip()
            password = data.get("password", "").strip()
            user = next((u for u in users if u["email"] == email and u["password"] == password), None)
            if user:
                self.send_json({"success": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}})
            else:
                self.send_json({"success": False, "error": "Invalid email or password"}, 401)

        elif path == "/api/register":
            name = data.get("name", "").strip()
            email = data.get("email", "").strip()
            password = data.get("password", "").strip()
            if not email or not password or not name:
                self.send_json({"success": False, "error": "All fields are required"}, 400)
                return
            if any(u["email"] == email for u in users):
                self.send_json({"success": False, "error": "Email already registered"}, 400)
                return
            new_user = {
                "id": f"u_{random.randint(100, 999)}",
                "name": name,
                "email": email,
                "role": "user",
                "password": password
            }
            users.append(new_user)
            self.send_json({"success": True, "user": {"id": new_user["id"], "name": new_user["name"], "email": new_user["email"], "role": new_user["role"]}})

        elif path == "/api/nodes/add":
            name = data.get("name", "").strip()
            host = data.get("host", "").strip()
            port = int(data.get("port", 5000))
            token = data.get("token", "").strip()
            if not name or not host:
                self.send_json({"success": False, "error": "Node name and host IP are required"}, 400)
                return
            
            node_id = f"node_{random.randint(10, 99)}"
            new_node = {
                "id": node_id,
                "name": name,
                "host": host,
                "port": port,
                "token": token,
                "status": "online",
                "cpuUsage": round(random.uniform(10.0, 35.0), 1),
                "ramTotal": 64,
                "ramUsed": 20.5,
                "diskTotal": 1000,
                "diskUsed": 300.0,
                "kvmSupported": True,
                "dockerSupported": True,
                "os": "Ubuntu 22.04 LTS",
                "type": "remote"
            }
            nodes.append(new_node)
            self.send_json({"success": True, "node": new_node})

        elif path == "/api/nodes/delete":
            node_id = data.get("nodeId")
            nodes[:] = [n for n in nodes if n["id"] != node_id]
            self.send_json({"success": True})

        elif path == "/api/vps/create":
            user_id = data.get("userId")
            user_name = data.get("userName")
            name = data.get("name", "New VPS")
            hostname = data.get("hostname", name.lower().replace(" ", "-"))
            node_id = data.get("nodeId", "node_1")
            vps_type = data.get("vpsType", "docker") # docker or qemu
            os_type = data.get("os", "ubuntu-22.04")
            cpu_cores = int(data.get("cpuCores", 2))
            ram_gb = int(data.get("ramGb", 4))
            disk_gb = int(data.get("diskGb", 50))
            root_pass = data.get("rootPass", "root123")
            kvm_enabled = bool(data.get("kvmEnabled", False))

            node = next((n for n in nodes if n["id"] == node_id), nodes[0])
            new_id = f"vps_{random.randint(200, 999)}"
            ip = f"192.168.{random.randint(1, 10)}.{random.randint(10, 200)}"

            # If node has token/host, we could attempt to call nodeserver.py agent API
            # For demonstration and resilience, we handle both agent call & fallback simulation
            if node.get("token") and node.get("host") and node["host"] != "192.168.1.100":
                try:
                    req_data = json.dumps({
                        "hostname": hostname,
                        "vps_type": vps_type,
                        "os": os_type,
                        "ram_gb": ram_gb,
                        "cpu_cores": cpu_cores,
                        "disk_gb": disk_gb,
                        "root_pass": root_pass,
                        "kvm": kvm_enabled
                    }).encode("utf-8")
                    req = urllib.request.Request(
                        f"http://{node['host']}:{node['port']}/vps/create",
                        data=req_data,
                        headers={"Content-Type": "application/json", "Authorization": f"Bearer {node['token']}"},
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        agent_res = json.loads(resp.read().decode("utf-8"))
                        if agent_res.get("vps_id"):
                            new_id = agent_res["vps_id"]
                except Exception as e:
                    print(f"[Node Agent Warning] Could not reach remote agent on {node['host']}: {e}. Fallback to simulated cloud provisioning.")

            new_vps = {
                "id": new_id,
                "name": name,
                "hostname": hostname,
                "nodeId": node["id"],
                "nodeName": node["name"],
                "userId": user_id,
                "userName": user_name,
                "vpsType": vps_type,
                "os": os_type,
                "cpuCores": cpu_cores,
                "ramGb": ram_gb,
                "diskGb": disk_gb,
                "status": "running",
                "ipAddress": ip,
                "rootPass": root_pass,
                "kvmEnabled": kvm_enabled,
                "cpuUsage": round(random.uniform(5.0, 25.0), 1),
                "ramUsage": round(random.uniform(20.0, 60.0), 1),
                "diskUsage": round(random.uniform(10.0, 40.0), 1)
            }
            vps_list.append(new_vps)
            self.send_json({"success": True, "vps": new_vps})

        elif path == "/api/vps/action":
            vps_id = data.get("vpsId")
            action = data.get("action")
            vps = next((v for v in vps_list if v["id"] == vps_id), None)
            if vps:
                if action == "start":
                    vps["status"] = "running"
                elif action == "stop":
                    vps["status"] = "stopped"
                elif action == "restart":
                    vps["status"] = "running"
                self.send_json({"success": True, "vps": vps})
            else:
                self.send_json({"success": False, "error": "VPS not found"}, 404)

        elif path == "/api/vps/delete":
            vps_id = data.get("vpsId")
            vps_list[:] = [v for v in vps_list if v["id"] != vps_id]
            self.send_json({"success": True})

        else:
            self.send_json({"success": False, "error": "Not found"}, 404)

    def serve_html(self, filename):
        base_dir = os.path.dirname(os.path.abspath(__file__)) if __file__ else os.getcwd()
        file_path = os.path.join(base_dir, "templates", filename)
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
                return
            except Exception:
                pass
        self.send_response(404)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"404 Not Found")

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CloudVPSHandler) as httpd:
        print(f"CloudVPS Enterprise running on port {PORT}")
        httpd.serve_forever()

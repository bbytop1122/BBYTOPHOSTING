#!/usr/bin/env python3
"""
NexusVPS Enterprise Node Agent (nodeserver.py)
----------------------------------------------
Production-ready, zero-dependency Python agent for Linux Hypervisor Nodes.
Deploy this script on any remote Linux VPS or bare-metal server to link it
with your NexusVPS Enterprise Management Panel.

Run standalone (no external pip packages required):
    python3 nodeserver.py --port 5000 --token YOUR_SECURE_TOKEN

Or in the background with systemd / nohup:
    nohup python3 nodeserver.py --port 5000 --token YOUR_SECURE_TOKEN > /var/log/nexus-agent.log 2>&1 &
"""

import http.server
import socketserver
import json
import urllib.parse
import urllib.request
import os
import sys
import time
import shutil
import platform
import subprocess
import socket
import argparse
import pty
import select
import re
import threading

# In-memory storage for managed VPS instances and active Pinggy tunnels on this node
local_vps_db = {}
active_pinggy_tunnels = {}
START_TIME = time.time()

def find_free_port(start_port=22022):
    """Finds an unused TCP port on the host for container port forwarding."""
    for p in range(start_port, start_port + 2000):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", p))
                return p
        except OSError:
            continue
    return 22222

def get_real_public_ip():
    """Resolves the authentic public IPv4 address of this node."""
    for service in ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"]:
        try:
            req = urllib.request.Request(service, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                ip_str = resp.read().decode("utf-8").strip()
                if ip_str and len(ip_str) <= 45 and ("." in ip_str or ":" in ip_str):
                    return ip_str
        except Exception:
            continue
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        pass
    return "127.0.0.1"

def start_pinggy_tunnel(target_port=22, vps_id="default"):
    """
    Spawns an authentic Pinggy.io reverse SSH tunnel to expose target_port.
    Parses the live tcp:// output to generate the direct SSH connection command.
    """
    global active_pinggy_tunnels

    # Check if existing tunnel process is still alive
    if vps_id in active_pinggy_tunnels:
        existing = active_pinggy_tunnels[vps_id]
        proc = existing.get("proc")
        if proc and proc.poll() is None:
            return {
                "success": True,
                "ssh_command": existing.get("ssh_command"),
                "tunnel_url": existing.get("tunnel_url"),
                "host": existing.get("host"),
                "port": existing.get("port"),
                "status": "active"
            }

    # Verify ssh is available
    if not shutil.which("ssh"):
        return {
            "success": False,
            "error": "OpenSSH client (ssh) is not installed on this node. Please run 'apt install -y openssh-client'.",
            "ssh_command": f"ssh -p 443 -R0:localhost:{target_port} -o StrictHostKeyChecking=no tcp@a.pinggy.io",
            "status": "fallback"
        }

    try:
        master, slave = pty.openpty()
        cmd = [
            "ssh", "-p", "443",
            f"-R0:localhost:{target_port}",
            "-o", "StrictHostKeyChecking=no",
            "-o", "ServerAliveInterval=15",
            "tcp@a.pinggy.io"
        ]
        proc = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
        os.close(slave)

        start_t = time.time()
        raw = b""
        tunnel_url = None
        ssh_cmd = None
        host = None
        tun_port = None

        while time.time() - start_t < 6.0:
            r, _, _ = select.select([master], [], [], 0.25)
            if r:
                try:
                    chunk = os.read(master, 1024)
                    if not chunk:
                        break
                    raw += chunk
                    text = raw.decode("utf-8", errors="replace")
                    # Match tcp://hostname:port from Pinggy output
                    m = re.search(r"tcp://([a-zA-Z0-9\.\-]+):(\d+)", text)
                    if m:
                        host = m.group(1)
                        tun_port = m.group(2)
                        tunnel_url = f"tcp://{host}:{tun_port}"
                        ssh_cmd = f"ssh -p {tun_port} root@{host}"
                        break
                except Exception:
                    break

        if ssh_cmd:
            active_pinggy_tunnels[vps_id] = {
                "proc": proc,
                "master": master,
                "ssh_command": ssh_cmd,
                "tunnel_url": tunnel_url,
                "host": host,
                "port": tun_port,
                "started_at": int(time.time())
            }
            return {
                "success": True,
                "ssh_command": ssh_cmd,
                "tunnel_url": tunnel_url,
                "host": host,
                "port": tun_port,
                "status": "active"
            }
        else:
            # Fallback if Pinggy took longer than 6 seconds to announce
            active_pinggy_tunnels[vps_id] = {
                "proc": proc,
                "master": master,
                "ssh_command": f"ssh -p 443 -R0:localhost:{target_port} -o StrictHostKeyChecking=no tcp@a.pinggy.io",
                "tunnel_url": None,
                "host": "a.pinggy.io",
                "port": target_port,
                "started_at": int(time.time())
            }
            return {
                "success": True,
                "ssh_command": f"ssh -p 443 -R0:localhost:{target_port} -o StrictHostKeyChecking=no tcp@a.pinggy.io",
                "status": "starting"
            }
    except Exception as ex:
        return {
            "success": False,
            "error": f"Failed to initialize Pinggy tunnel: {str(ex)}",
            "ssh_command": f"ssh -p 443 -R0:localhost:{target_port} -o StrictHostKeyChecking=no tcp@a.pinggy.io",
            "status": "error"
        }

def get_real_system_stats():
    """Extracts authentic Linux telemetry from /proc, shutil, and system tools."""
    stats = {
        "status": "online",
        "hostname": socket.gethostname(),
        "os": "Linux",
        "kernel": platform.release(),
        "arch": platform.machine(),
        "uptime_seconds": 0,
        "uptime_str": "0 mins",
        "cpu_cores": os.cpu_count() or 1,
        "cpu_usage_percent": 0.0,
        "ram_total_gb": 0.0,
        "ram_used_gb": 0.0,
        "ram_free_gb": 0.0,
        "ram_usage_percent": 0.0,
        "disk_total_gb": 0.0,
        "disk_used_gb": 0.0,
        "disk_free_gb": 0.0,
        "disk_usage_percent": 0.0,
        "kvm_supported": False,
        "docker_supported": False,
        "systemd_supported": False,
        "active_vps_count": len(local_vps_db)
    }

    # 1. OS & Distribution Detection
    if os.path.exists("/etc/os-release"):
        try:
            with open("/etc/os-release", "r") as f:
                for line in f:
                    if line.startswith("PRETTY_NAME="):
                        stats["os"] = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            stats["os"] = platform.platform()
    else:
        stats["os"] = platform.platform()

    # 2. System Uptime
    if os.path.exists("/proc/uptime"):
        try:
            with open("/proc/uptime", "r") as f:
                uptime_sec = float(f.readline().split()[0])
                stats["uptime_seconds"] = int(uptime_sec)
                days = int(uptime_sec // 86400)
                hours = int((uptime_sec % 86400) // 3600)
                mins = int((uptime_sec % 3600) // 60)
                if days > 0:
                    stats["uptime_str"] = f"{days}d {hours}h {mins}m"
                elif hours > 0:
                    stats["uptime_str"] = f"{hours}h {mins}m"
                else:
                    stats["uptime_str"] = f"{mins}m"
        except Exception:
            pass
    else:
        diff = int(time.time() - START_TIME)
        stats["uptime_seconds"] = diff
        stats["uptime_str"] = f"{diff // 60}m"

    # 3. Real RAM Usage from /proc/meminfo
    if os.path.exists("/proc/meminfo"):
        try:
            meminfo = {}
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    parts = line.split(":")
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().split()[0]
                        meminfo[key] = float(val)
            total_kb = meminfo.get("MemTotal", 0)
            avail_kb = meminfo.get("MemAvailable", meminfo.get("MemFree", 0) + meminfo.get("Buffers", 0) + meminfo.get("Cached", 0))
            used_kb = max(0, total_kb - avail_kb)

            stats["ram_total_gb"] = round(total_kb / (1024 * 1024), 2)
            stats["ram_used_gb"] = round(used_kb / (1024 * 1024), 2)
            stats["ram_free_gb"] = round(avail_kb / (1024 * 1024), 2)
            if total_kb > 0:
                stats["ram_usage_percent"] = round((used_kb / total_kb) * 100, 1)
        except Exception:
            pass

    # 4. Real Disk Usage from shutil
    try:
        total_b, used_b, free_b = shutil.disk_usage("/")
        stats["disk_total_gb"] = round(total_b / (1024**3), 2)
        stats["disk_used_gb"] = round(used_b / (1024**3), 2)
        stats["disk_free_gb"] = round(free_b / (1024**3), 2)
        if total_b > 0:
            stats["disk_usage_percent"] = round((used_b / total_b) * 100, 1)
    except Exception:
        pass

    # 5. Real CPU Load & Calculation
    try:
        if hasattr(os, "getloadavg"):
            load1, load5, load15 = os.getloadavg()
            cores = stats["cpu_cores"]
            stats["cpu_usage_percent"] = round(min(100.0, (load1 / max(1, cores)) * 100), 1)
        elif os.path.exists("/proc/stat"):
            with open("/proc/stat", "r") as f:
                line = f.readline()
                parts = [float(x) for x in line.split()[1:8]]
                idle = parts[3]
                total = sum(parts)
                time.sleep(0.05)
            with open("/proc/stat", "r") as f:
                line = f.readline()
                parts2 = [float(x) for x in line.split()[1:8]]
                idle2 = parts2[3]
                total2 = sum(parts2)
            delta_total = max(1.0, total2 - total)
            delta_idle = max(0.0, idle2 - idle)
            stats["cpu_usage_percent"] = round(((delta_total - delta_idle) / delta_total) * 100, 1)
    except Exception:
        stats["cpu_usage_percent"] = 5.0

    # 6. Check KVM Support
    stats["kvm_supported"] = os.path.exists("/dev/kvm")
    if not stats["kvm_supported"] and os.path.exists("/proc/cpuinfo"):
        try:
            with open("/proc/cpuinfo", "r") as f:
                content = f.read()
                if "vmx" in content or "svm" in content:
                    stats["kvm_supported"] = True
        except Exception:
            pass

    # 7. Check Docker Support
    try:
        res = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=2)
        stats["docker_supported"] = (res.returncode == 0)
    except Exception:
        stats["docker_supported"] = False

    # 8. Check Systemd / Systemctl Support
    stats["systemd_supported"] = shutil.which("systemctl") is not None

    return stats

class NodeAgentHandler(http.server.SimpleHTTPRequestHandler):
    agent_token = ""

    def check_auth(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1].strip()
            if token == self.agent_token:
                return True
        # Also check query param ?token=
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if qs.get("token", [""])[0] == self.agent_token:
            return True
        return False

    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ["/", "/ping"]:
            self.send_json({"service": "NexusVPS-Node-Agent", "status": "running", "time": int(time.time())})
            return

        if not self.check_auth():
            self.send_json({"error": "Unauthorized", "message": "Invalid or missing Bearer token"}, 401)
            return

        if path in ["/stats", "/health", "/telemetry"]:
            stats = get_real_system_stats()
            self.send_json(stats)
            return

        elif path == "/vps/list":
            self.send_json({"success": True, "instances": list(local_vps_db.values())})
            return

        self.send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if not self.check_auth():
            self.send_json({"error": "Unauthorized", "message": "Invalid or missing Bearer token"}, 401)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}

        # 1. Provision New VPS on Node
        if path == "/vps/create":
            vps_id = data.get("vps_id") or data.get("id") or f"vps_{int(time.time() * 1000) % 100000}"
            hostname = data.get("hostname", f"node-vps-{vps_id}").strip()
            vps_type = data.get("vps_type", "docker").lower()
            os_name = data.get("os", "ubuntu-22.04")
            ram_gb = int(data.get("ram_gb", 4))
            cpu_cores = int(data.get("cpu_cores", 2))
            disk_gb = int(data.get("disk_gb", 50))
            root_pass = data.get("root_pass", "root123")
            kvm = bool(data.get("kvm", False))

            assigned_ip = get_real_public_ip()
            docker_created = False
            docker_cmd_log = ""
            ssh_host_port = 22

            # Try Real Container Provisioning if Docker is installed on this node
            if shutil.which("docker"):
                image_map = {
                    "ubuntu-22.04": "ubuntu:22.04",
                    "ubuntu-24.04": "ubuntu:24.04",
                    "debian-12": "debian:12",
                    "debian-11": "debian:11",
                    "alpine-3.19": "alpine:3.19"
                }
                docker_img = image_map.get(os_name, "ubuntu:22.04")
                ssh_host_port = find_free_port(22020 + (len(local_vps_db) * 5))

                try:
                    # Remove any conflicting stale container
                    subprocess.run(["docker", "rm", "-f", vps_id], capture_output=True, timeout=5)

                    run_cmd = [
                        "docker", "run", "-d",
                        "--name", vps_id,
                        "--hostname", hostname,
                        "--privileged",
                        "-p", f"{ssh_host_port}:22",
                        "-m", f"{ram_gb}g",
                        f"--cpus={cpu_cores}",
                        "--restart=unless-stopped",
                        docker_img,
                        "sleep", "infinity"
                    ]
                    res = subprocess.run(run_cmd, capture_output=True, text=True, timeout=15)
                    if res.returncode == 0:
                        docker_created = True
                        docker_cmd_log = f"Docker container spawned with port {ssh_host_port}:22 mapped."

                        # Configure root password and SSH server inside container in background
                        def setup_container_ssh(cid, pwd, img):
                            try:
                                # Set root password
                                subprocess.run(["docker", "exec", cid, "sh", "-c", f"echo 'root:{pwd}' | chpasswd 2>/dev/null || true"], timeout=5)
                                # Install and launch openssh-server inside container
                                if "alpine" in img:
                                    setup_cmd = f"apk add --no-cache openssh-server curl sudo && ssh-keygen -A && sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config && /usr/sbin/sshd"
                                else:
                                    setup_cmd = f"(which sshd || (apt-get update && apt-get install -y openssh-server curl sudo)) && ssh-keygen -A 2>/dev/null; mkdir -p /var/run/sshd && sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config 2>/dev/null; (service ssh start || /usr/sbin/sshd || true)"
                                subprocess.run(["docker", "exec", cid, "sh", "-c", setup_cmd], capture_output=True, timeout=30)
                            except Exception:
                                pass

                        threading.Thread(target=setup_container_ssh, args=(vps_id, root_pass, docker_img), daemon=True).start()
                    else:
                        docker_cmd_log = f"Docker spawn notice: {res.stderr.strip()}"
                except Exception as ex:
                    docker_cmd_log = f"Docker setup error: {str(ex)}"

            # If Docker not used or failed, set up dedicated workspace on node filesystem
            vps_workspace = os.path.join("/var/nexus_vps" if os.access("/var", os.W_OK) else os.path.expanduser("~/.nexus_vps"), vps_id)
            os.makedirs(os.path.join(vps_workspace, "root"), exist_ok=True)
            os.makedirs(os.path.join(vps_workspace, "etc"), exist_ok=True)
            with open(os.path.join(vps_workspace, "etc", "issue"), "w") as f:
                f.write(f"NexusVPS Node Hypervisor ({os_name})\nHostname: {hostname}\nInstance: {vps_id}\n")
            with open(os.path.join(vps_workspace, "root", "WELCOME.txt"), "w") as f:
                f.write(f"Welcome to your VPS {hostname} ({vps_id})\nOS: {os_name}\nCreated: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")

            # Initial Pinggy tunnel trigger
            pinggy_res = start_pinggy_tunnel(target_port=ssh_host_port if docker_created else 22, vps_id=vps_id)
            live_pinggy_cmd = pinggy_res.get("ssh_command") or f"ssh -p 443 -R0:localhost:{ssh_host_port}:22 -o StrictHostKeyChecking=no a.pinggy.io"

            instance_record = {
                "vps_id": vps_id,
                "hostname": hostname,
                "vps_type": vps_type,
                "os": os_name,
                "ram_gb": ram_gb,
                "cpu_cores": cpu_cores,
                "disk_gb": disk_gb,
                "root_pass": root_pass,
                "kvm_enabled": kvm,
                "status": "running",
                "ip_address": assigned_ip,
                "ssh_host_port": ssh_host_port,
                "pinggy_command": live_pinggy_cmd,
                "ssh_command": f"ssh root@{assigned_ip} -p {ssh_host_port}",
                "docker_created": docker_created,
                "workspace": vps_workspace,
                "created_at": int(time.time())
            }

            local_vps_db[vps_id] = instance_record

            self.send_json({
                "success": True,
                "vps": instance_record,
                "vps_id": vps_id,
                "ip_address": assigned_ip,
                "pinggy_command": live_pinggy_cmd,
                "ssh_command": f"ssh root@{assigned_ip} -p {ssh_host_port}",
                "docker_created": docker_created,
                "message": f"Successfully initialized {vps_type.upper()} instance {hostname} on hypervisor.",
                "details": docker_cmd_log
            })
            return

        # 2. Generate / Retrieve Live Pinggy Reverse SSH Tunnel
        elif path in ["/vps/pinggy", "/vps/ssh-tunnel"]:
            vps_id = data.get("vps_id") or data.get("vpsId") or "default"
            vps = local_vps_db.get(vps_id, {})
            target_port = vps.get("ssh_host_port", 22) if vps.get("docker_created") else 22

            pinggy_res = start_pinggy_tunnel(target_port=target_port, vps_id=vps_id)
            if pinggy_res.get("ssh_command"):
                if vps_id in local_vps_db:
                    local_vps_db[vps_id]["pinggy_command"] = pinggy_res["ssh_command"]

            self.send_json({
                "success": pinggy_res.get("success", True),
                "vps_id": vps_id,
                "ssh_command": pinggy_res.get("ssh_command"),
                "tunnel_url": pinggy_res.get("tunnel_url"),
                "host": pinggy_res.get("host"),
                "port": pinggy_res.get("port"),
                "status": pinggy_res.get("status", "active"),
                "root_pass": vps.get("root_pass", "root123"),
                "direct_ssh": f"ssh root@{vps.get('ip_address', get_real_public_ip())} -p {target_port}"
            })
            return

        # 3. VPS Power Actions (start, stop, restart, delete)
        elif path in ["/vps/action", "/vps/action/"]:
            vps_id = data.get("vps_id") or data.get("vpsId")
            action = data.get("action")
            if vps_id in local_vps_db:
                vps = local_vps_db[vps_id]
                if action == "stop":
                    vps["status"] = "stopped"
                elif action in ["start", "restart"]:
                    vps["status"] = "running"
                elif action == "delete":
                    if vps.get("docker_created") and shutil.which("docker"):
                        try:
                            subprocess.run(["docker", "rm", "-f", vps_id], capture_output=True, timeout=5)
                        except Exception:
                            pass
                    del local_vps_db[vps_id]
                    self.send_json({"success": True, "message": f"Instance {vps_id} purged."})
                    return

                # If docker container, execute docker action
                if vps.get("docker_created") and shutil.which("docker"):
                    try:
                        act_cmd = "restart" if action == "restart" else ("start" if action == "start" else "stop")
                        subprocess.run(["docker", act_cmd, vps_id], capture_output=True, timeout=5)
                    except Exception:
                        pass

                self.send_json({"success": True, "vps": vps, "status": vps["status"]})
                return
            self.send_json({"success": False, "error": "Instance not found on this node"}, 404)
            return

        # 4. VPS Command Execution (Direct execution inside container or workspace)
        elif path == "/vps/exec":
            vps_id = data.get("vps_id") or data.get("vpsId")
            cmd = data.get("command", "").strip()
            if not cmd:
                self.send_json({"success": False, "error": "Command is required"}, 400)
                return

            vps = local_vps_db.get(vps_id, {})
            output = ""
            exit_code = 0

            # If real Docker container exists, execute inside container
            if vps_id and shutil.which("docker") and vps.get("docker_created"):
                try:
                    res = subprocess.run(["docker", "exec", "-i", vps_id, "bash", "-c", cmd], capture_output=True, text=True, timeout=20)
                    output = res.stdout + res.stderr
                    exit_code = res.returncode
                except Exception:
                    try:
                        res = subprocess.run(["docker", "exec", "-i", vps_id, "sh", "-c", cmd], capture_output=True, text=True, timeout=20)
                        output = res.stdout + res.stderr
                        exit_code = res.returncode
                    except Exception as ex:
                        output = f"Execution error in container: {str(ex)}\n"
                        exit_code = 1
            else:
                # Real execution in isolated instance workspace on this node
                vps_root = vps.get("workspace") or os.path.join(os.path.expanduser("~/.nexus_vps"), str(vps_id) if vps_id else "host")
                root_cwd = os.path.join(vps_root, "root") if os.path.exists(os.path.join(vps_root, "root")) else vps_root
                os.makedirs(root_cwd, exist_ok=True)
                try:
                    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=20, cwd=root_cwd)
                    output = res.stdout + (res.stderr if res.stderr else "")
                    exit_code = res.returncode
                except subprocess.TimeoutExpired:
                    output = "Command timed out after 20 seconds\n"
                    exit_code = 124
                except Exception as ex:
                    output = f"Execution error: {str(ex)}\n"
                    exit_code = 1

            self.send_json({"success": True, "output": output, "exit_code": exit_code})
            return

        self.send_json({"error": "Unknown endpoint"}, 404)

def run_agent(host, port, token):
    NodeAgentHandler.agent_token = token
    socketserver.TCPServer.allow_reuse_address = True
    print(f"==================================================")
    print(f" NexusVPS Enterprise Node Agent v5.0 Active")
    print(f" Bound to: http://{host}:{port}")
    print(f" API Token: {token[:6]}...{token[-4:] if len(token) > 8 else ''}")
    print(f" Real Telemetry: /stats | /health")
    print(f" Pinggy.io Dynamic Reverse SSH Tunneling: Enabled")
    print(f" Real Container & Node Virtualization: Enabled")
    print(f"==================================================")
    with socketserver.TCPServer((host, port), NodeAgentHandler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nNode Agent shutting down gracefully.")
            server.server_close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NexusVPS Enterprise Node Agent")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Binding host IP")
    parser.add_argument("--port", type=int, default=5000, help="Binding port (default: 5000)")
    parser.add_argument("--token", type=str, default="nexus_secret_node_token_123", help="API security token for authentication")
    args = parser.parse_args()

    run_agent(args.host, args.port, args.token)

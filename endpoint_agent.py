#!/usr/bin/env python3
"""
ACIRA-X Lightweight Endpoint Telemetry Agent
Collects host info, resource metrics, process logs, open ports, and sends them
every 10 seconds to the ACIRA-X central security console.
"""

import os
import sys
import json
import time
import uuid
import socket
import platform
import urllib.request
import urllib.error

# Attempt to import psutil, guide user to install if missing
try:
    import psutil
except ImportError:
    print("[-] Error: 'psutil' library is required by the ACIRA-X Endpoint Agent.")
    print("    Please install it using: pip install psutil")
    sys.exit(1)

# Config - Change this to Laptop 1's IP address when running across two devices
ACIRA_SERVER = "http://localhost:8000"
INTERVAL = 10 # In seconds

def get_agent_id():
    """Generates or retrieves a persistent unique identifier for this agent."""
    id_file = ".acira_agent_id"
    if os.path.exists(id_file):
        try:
            with open(id_file, "r") as f:
                agent_uuid = f.read().strip()
                if agent_uuid:
                    return agent_uuid
        except Exception:
            pass
            
    # Generate new uuid
    agent_uuid = f"AGT-{uuid.uuid4().hex[:8].upper()}"
    try:
        with open(id_file, "w") as f:
            f.write(agent_uuid)
    except Exception:
        pass
    return agent_uuid

def get_local_ip():
    """Gets the active network interface's local IP address."""
    try:
        # Connect to a public DNS server to find our routing IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # Fallback to hostname lookup
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def collect_telemetry(device_id):
    """Collects and returns the system health metrics snapshot."""
    hostname = socket.gethostname()
    ip_addr = get_local_ip()
    
    # OS Info
    os_info = f"{platform.system()} {platform.release()}"
    
    # System Metrics
    cpu_percent = psutil.cpu_percent(interval=0.2)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Process List (Top 15 sorted by CPU percent)
    processes = []
    for proc in psutil.process_iter(attrs=['pid', 'name', 'cpu_percent']):
        try:
            info = proc.info
            if info['cpu_percent'] is None:
                info['cpu_percent'] = 0.0
            processes.append({
                "pid": info['pid'],
                "name": info['name'],
                "cpu_percent": info['cpu_percent']
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
            
    # Sort processes by CPU usage descending
    processes = sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:15]
    
    # Listening Ports & Connections
    open_ports = []
    connections = []
    try:
        net_conns = psutil.net_connections(kind='inet')
        for conn in net_conns:
            # Listening ports
            if conn.status == 'LISTEN':
                if conn.laddr and conn.laddr.port not in open_ports:
                    open_ports.append(conn.laddr.port)
            # Active connections
            elif conn.status == 'ESTABLISHED':
                laddr_dict = {"ip": conn.laddr.ip, "port": conn.laddr.port}
                raddr_dict = {"ip": conn.raddr.ip, "port": conn.raddr.port} if conn.raddr else None
                if raddr_dict:
                    connections.append({
                        "laddr": laddr_dict,
                        "raddr": raddr_dict,
                        "status": conn.status
                    })
    except (psutil.AccessDenied, Exception) as e:
        # On some platforms / privilege levels, net_connections can be restricted
        pass
        
    # Read simulated failed login count
    failed_login_count = 0
    if os.path.exists("failed_logins.txt"):
        try:
            with open("failed_logins.txt", "r") as f:
                content = f.read().strip()
                if content:
                    failed_login_count = int(content)
        except Exception:
            pass

    return {
        "device_id": device_id,
        "hostname": hostname,
        "ip_address": ip_addr,
        "os_info": os_info,
        "cpu_percent": cpu_percent,
        "ram_percent": ram.percent,
        "disk_percent": disk.percent,
        "processes": processes,
        "open_ports": open_ports,
        "connections": connections,
        "failed_login_count": failed_login_count,
        "agent_version": "2.0.0"
    }

def send_telemetry(payload):
    """POSTs telemetry payload to ACIRA server."""
    url = f"{ACIRA_SERVER}/api/telemetry"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, 
        data=data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            res = response.read().decode('utf-8')
            return json.loads(res)
    except urllib.error.URLError as e:
        raise ConnectionError(f"Cannot reach ACIRA server at {ACIRA_SERVER}: {e.reason}")
    except Exception as e:
        raise RuntimeError(f"Failed to post telemetry: {e}")

def main():
    device_id = get_agent_id()
    print("=" * 60)
    print("    ACIRA-X ENDPOINT TELEMETRY AGENT (v2.0.0)")
    print("=" * 60)
    print(f"[+] Agent UUID:     {device_id}")
    print(f"[+] Hostname:       {socket.gethostname()}")
    print(f"[+] Endpoint IP:    {get_local_ip()}")
    print(f"[+] Target Server:  {ACIRA_SERVER}")
    print(f"[+] Poll Interval:  {INTERVAL} seconds")
    print("[-] Press Ctrl+C to stop the agent.")
    print("=" * 60)
    
    # Initialize failed_logins.txt if not exists
    if not os.path.exists("failed_logins.txt"):
        try:
            with open("failed_logins.txt", "w") as f:
                f.write("0")
        except Exception:
            pass

    while True:
        try:
            print(f"[{time.strftime('%H:%M:%S')}] Collecting system metrics...", end="", flush=True)
            payload = collect_telemetry(device_id)
            print(" Done. Sending telemetry...", end="", flush=True)
            response = send_telemetry(payload)
            print(f" Success! (Snapshot ID: {response.get('snapshot_id', 'N/A')})")
        except ConnectionError as e:
            print(f"\n[-] Network error: {e}")
        except KeyboardInterrupt:
            print("\n[!] Exiting ACIRA-X Endpoint Agent.")
            break
        except Exception as e:
            print(f"\n[-] Critical error: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()

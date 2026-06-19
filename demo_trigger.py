#!/usr/bin/env python3
"""
ACIRA-X Safe Cyber Threat Simulation Script
Triggers safe, simulated security events locally to demonstrate live threat
detection and autonomous incident response. 
Does NOT modify or compromise any actual system files.
"""

import os
import sys
import time
import shutil
import socket
import threading
import subprocess

# Flags for threads
cpu_spike_active = False
socket_backdoor_active = False
suspicious_proc = None
copied_file_path = None

def cpu_spiker():
    """Generates CPU utilization spike using a math loop."""
    global cpu_spike_active
    print("[+] CPU Spike Thread Started.")
    # Run multiple busy loops to spike multi-core CPUs
    while cpu_spike_active:
        _ = 99999 * 99999
    print("[+] CPU Spike Thread Stopped.")

def socket_backdoor():
    """Listens on a suspicious port (4444) to trigger network indicators."""
    global socket_backdoor_active
    print("[+] Backdoor Socket Thread Started (Listening on port 4444).")
    
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind(("0.0.0.0", 4444))
        server_socket.listen(1)
        server_socket.settimeout(1.0)
        
        while socket_backdoor_active:
            try:
                # Just accept connection and close it immediately
                client_sock, client_addr = server_socket.accept()
                print(f"[!] Warning: Connection received on backdoor port 4444 from {client_addr}")
                client_sock.close()
            except socket.timeout:
                continue
            except Exception:
                break
    except Exception as e:
        print(f"[-] Backdoor Socket Error: {e}")
    finally:
        server_socket.close()
        print("[+] Backdoor Socket Closed.")

def start_suspicious_process():
    """Copies current python executable to a blacklisted process name and runs it."""
    global suspicious_proc, copied_file_path
    
    is_windows = platform_check() == "Windows"
    base_name = "mimikatz_test.exe" if is_windows else "mimikatz_test"
    copied_file_path = os.path.join(os.getcwd(), base_name)
    
    print(f"[+] Creating mock malicious process binary: {base_name}")
    try:
        # Copy current python executable to mimic the process name
        shutil.copy(sys.executable, copied_file_path)
        
        # Run the copied executable in a subprocess, telling it to sleep for 60 seconds
        cmd = [copied_file_path, "-c", "import time; time.sleep(60)"]
        suspicious_proc = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        print(f"[+] Launched simulated process: {base_name} (PID: {suspicious_proc.pid})")
    except Exception as e:
        print(f"[-] Failed to launch suspicious process: {e}")

def platform_check():
    return platform.system()

import platform

def cleanup():
    """Cleans up all temporary files, processes, sockets, and counters."""
    global cpu_spike_active, socket_backdoor_active, suspicious_proc, copied_file_path
    
    print("\n" + "=" * 60)
    print("[-] INITIATING DEMO CLEANUP & RECOVERY...")
    print("=" * 60)
    
    # 1. Reset brute force file
    print("[-] Resetting failed login counter...")
    try:
        with open("failed_logins.txt", "w") as f:
            f.write("0")
    except Exception:
        pass
        
    # 2. Stop CPU spike
    if cpu_spike_active:
        print("[-] Stopping CPU spike threads...")
        cpu_spike_active = False
        
    # 3. Close port 4444
    if socket_backdoor_active:
        print("[-] Deactivating port 4444 backdoor listener...")
        socket_backdoor_active = False
        
    # 4. Terminate process
    if suspicious_proc:
        print(f"[-] Terminating process ID {suspicious_proc.pid} (mimikatz_test)...")
        try:
            suspicious_proc.terminate()
            suspicious_proc.wait(timeout=3)
        except Exception:
            try:
                suspicious_proc.kill()
            except Exception:
                pass
        suspicious_proc = None
        
    # 5. Delete temporary file
    if copied_file_path and os.path.exists(copied_file_path):
        print(f"[-] Deleting temporary binary: {os.path.basename(copied_file_path)}")
        try:
            os.remove(copied_file_path)
        except Exception as e:
            print(f"    [!] Delaying deletion: {e} (Will be released soon)")
            
    print("[+] Cleanup complete. System state restored to normal.")
    print("=" * 60 + "\n")

def main():
    global cpu_spike_active, socket_backdoor_active
    
    print("=" * 60)
    print("      ACIRA-X LIVE THREAT SIMULATOR FOR ACADEMIC DEMO")
    print("=" * 60)
    print("This script simulates suspicious endpoint behaviors in a controlled,")
    print("non-destructive way to trigger ACIRA-X alerts & autonomous responses.")
    print("=" * 60)
    print("Choose an option:")
    print("  1. Trigger SSH/Brute Force (Fires failed logins > 5)")
    print("  2. Trigger Suspicious Process Execution (Fires 'mimikatz_test')")
    print("  3. Trigger Port Exposure Backdoor (Listens on port 4444)")
    print("  4. Trigger High CPU Spike (>85% utilization)")
    print("  5. FULL LIVE DEMO SEQUENCE (Triggers ALL of the above sequentially)")
    print("  6. Stop & Clean Up Everything")
    print("=" * 60)
    
    try:
        choice = input("Enter choice (1-6): ").strip()
    except KeyboardInterrupt:
        print("\nExiting.")
        return

    if choice == "1":
        print("[+] Simulating brute force login failures...")
        with open("failed_logins.txt", "w") as f:
            f.write("7")
        print("[+] Counter updated to 7 attempts. Check ACIRA-X Alert center.")
        input("Press Enter to reset and cleanup...")
        cleanup()
        
    elif choice == "2":
        start_suspicious_process()
        input("Press Enter to terminate process and cleanup...")
        cleanup()
        
    elif choice == "3":
        socket_backdoor_active = True
        t = threading.Thread(target=socket_backdoor, daemon=True)
        t.start()
        input("Press Enter to close backdoor socket...")
        cleanup()
        
    elif choice == "4":
        cpu_spike_active = True
        # Launch 4 spiker threads for multi-core spike
        for _ in range(4):
            t = threading.Thread(target=cpu_spiker, daemon=True)
            t.start()
        input("Press Enter to stop CPU spiker...")
        cleanup()
        
    elif choice == "5":
        print("\n" + "=" * 60)
        print(">>> STARTING FULL LIVE DEMO THREAT PIPELINE (35 Seconds) <<<")
        print("=" * 60)
        
        # Stage A: Brute Force
        print("\n[Stage A] Simulating Brute Force Campaign...")
        with open("failed_logins.txt", "w") as f:
            f.write("8")
        time.sleep(4)
        
        # Stage B: Backdoor listener
        print("\n[Stage B] Exposing Suspicious Backdoor Listener (Port 4444)...")
        socket_backdoor_active = True
        t_sock = threading.Thread(target=socket_backdoor, daemon=True)
        t_sock.start()
        time.sleep(4)
        
        # Stage C: Run mimikatz_test process
        print("\n[Stage C] Executing Mimikatz Credential Dumper Tool...")
        start_suspicious_process()
        time.sleep(4)
        
        # Stage D: Spike CPU
        print("\n[Stage D] Launching Cryptomining Script (High CPU Spike)...")
        cpu_spike_active = True
        for _ in range(4):
            t_cpu = threading.Thread(target=cpu_spiker, daemon=True)
            t_cpu.start()
            
        print("\n" + "*" * 60)
        print("    DEMO IS ACTIVE! ALL 4 THREAT INDICATORS ARE LIVE.")
        print("    Observe ACIRA-X console: ")
        print("      - Alerts firing in real time")
        print("      - Endpoint Health gauges showing resource spikes")
        print("      - Autonomous Action Log recording reasoning steps")
        print("      - Incident History archiving the incident reports")
        print("*" * 60)
        
        # Countdown
        for i in range(20, 0, -1):
            sys.stdout.write(f"\rTime remaining before auto-cleanup: {i} seconds...")
            sys.stdout.flush()
            time.sleep(1)
            
        cleanup()
        
    elif choice == "6":
        cleanup()
    else:
        print("Invalid option.")

if __name__ == "__main__":
    main()

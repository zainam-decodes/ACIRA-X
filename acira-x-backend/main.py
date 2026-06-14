from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import time
import uuid
import hashlib
import os

from database import SessionLocal, engine, Base
import models
from datetime import datetime

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ACIRA-X API")

# Read allowed origins from environment variable, fallback to localhost for dev
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]
# Always include localhost for local development
ALLOWED_ORIGINS += ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins — safe for this demo app
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Seed initial data if missing
def seed_data():
    db = SessionLocal()
    if db.query(models.Endpoint).count() == 0:
        db.add_all([
            models.Endpoint(id="WIN-SOC-01", hostname="WIN-SOC-01", ip_address="10.0.4.15", os="Windows 11 Pro", status="Active", risk_level="Low"),
            models.Endpoint(id="MAC-DEV-09", hostname="MAC-DEV-09", ip_address="10.0.4.22", os="macOS Sonoma 14.2", status="Active", risk_level="Low"),
            models.Endpoint(id="SRV-DB-01", hostname="SRV-DB-01", ip_address="10.0.1.50", os="Ubuntu 22.04 LTS", status="Active", risk_level="Low"),
            models.Endpoint(id="SRV-WEB-02", hostname="SRV-WEB-02", ip_address="10.0.1.55", os="Ubuntu 22.04 LTS", status="Active", risk_level="Low"),
            models.Endpoint(id="WIN-DEV-03", hostname="WIN-DEV-03", ip_address="10.0.4.30", os="Windows 10 Enterprise", status="Active", risk_level="Low"),
        ])
        db.commit()
    db.close()

seed_data()

@app.get("/api/dashboard/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total_incidents = db.query(models.Incident).count()
    active_incidents = db.query(models.Incident).filter(models.Incident.status != "Resolved").count()
    isolated_endpoints = db.query(models.Endpoint).filter(models.Endpoint.status == "Isolated").count()
    protected_files = db.query(models.ProtectedFile).count()
    compromised_files = db.query(models.ProtectedFile).filter(models.ProtectedFile.status == "Compromised").count()
    
    return {
        "active_incidents": active_incidents,
        "critical_alerts": db.query(models.Alert).filter(models.Alert.status == "New").count(),
        "devices_protected": db.query(models.Endpoint).count(),
        "isolated_endpoints": isolated_endpoints,
        "threats_blocked_today": 89 + total_incidents,
        "mean_response_time": "1.2s",
        "security_score": 94 if active_incidents == 0 else max(10, 94 - (active_incidents * 15)),
        "protected_files": protected_files,
        "compromised_files": compromised_files,
    }

@app.get("/api/incidents")
def get_incidents(db: Session = Depends(get_db)):
    return db.query(models.Incident).order_by(models.Incident.created_at.desc()).all()

@app.get("/api/endpoints")
def get_endpoints(db: Session = Depends(get_db)):
    return db.query(models.Endpoint).all()

@app.post("/api/endpoints/{endpoint_id}/isolate")
def isolate_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    ep.status = "Isolated"
    ep.risk_level = "Critical"
    db.commit()
    return {"status": "Isolated", "endpoint_id": endpoint_id}

@app.post("/api/endpoints/{endpoint_id}/reconnect")
def reconnect_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    ep.status = "Active"
    ep.risk_level = "Low"
    db.commit()
    return {"status": "Active", "endpoint_id": endpoint_id}

@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).all()

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "Acknowledged"
    db.commit()
    return {"status": "Acknowledged"}

@app.get("/api/reports")
def get_reports(db: Session = Depends(get_db)):
    return db.query(models.Report).order_by(models.Report.generated_at.desc()).all()

@app.get("/api/threat-intel")
def get_threat_intel():
    return [
        {"id": 1, "indicator": "192.168.1.45", "type": "IP Address", "severity": "Critical", "description": "Known C2 Command & Control Server - Cobalt Strike Beacon", "source": "AlienVault OTX", "last_seen": "2026-06-03T12:00:00"},
        {"id": 2, "indicator": "e3b0c44298fc1c149afbf4c8996fb924", "type": "File Hash (MD5)", "severity": "Critical", "description": "LockBit 3.0 Ransomware Payload - Dropper Stage", "source": "VirusTotal", "last_seen": "2026-06-03T10:30:00"},
        {"id": 3, "indicator": "malicious-login.acira-phish.xyz", "type": "Domain", "severity": "High", "description": "Active Phishing Kit - Credential Harvesting", "source": "PhishTank", "last_seen": "2026-06-03T11:45:00"},
        {"id": 4, "indicator": "185.220.101.34", "type": "IP Address", "severity": "High", "description": "Tor Exit Node - Used for Brute Force campaigns", "source": "AbuseIPDB", "last_seen": "2026-06-03T09:15:00"},
        {"id": 5, "indicator": "CVE-2024-21413", "type": "CVE", "severity": "Critical", "description": "Microsoft Outlook RCE Vulnerability - Actively Exploited", "source": "NVD/CISA", "last_seen": "2026-06-03T08:00:00"},
        {"id": 6, "indicator": "b94f6f125c79e3a5ffaa826f584c10d7", "type": "File Hash (MD5)", "severity": "Medium", "description": "Mimikatz Credential Dumper - Post-Exploitation Tool", "source": "MISP", "last_seen": "2026-06-03T07:00:00"},
        {"id": 7, "indicator": "185.220.101.45", "type": "IP Address", "severity": "High", "description": "Hydra Brute Force Source IP - SSH Attack Campaign", "source": "AbuseIPDB", "last_seen": "2026-06-03T13:20:00"},
        {"id": 8, "indicator": "' OR 1=1 --", "type": "SQL Injection Pattern", "severity": "High", "description": "Classic SQL Injection Bypass - Detected in Web Logs", "source": "OWASP", "last_seen": "2026-06-03T14:00:00"},
    ]

# ---- Protected Files ----
@app.get("/api/protected-files")
def get_protected_files(db: Session = Depends(get_db)):
    return db.query(models.ProtectedFile).order_by(models.ProtectedFile.upload_time.desc()).all()

@app.post("/api/protected-files/upload")
async def upload_protected_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()
    
    protected_file = models.ProtectedFile(
        filename=file.filename,
        file_size=len(contents),
        file_hash=file_hash,
        status="Protected",
    )
    db.add(protected_file)
    db.commit()
    db.refresh(protected_file)
    return {"id": protected_file.id, "filename": file.filename, "status": "Protected", "hash": file_hash}

# ---- Simulation Engine ----

ATTACK_PLAYBOOKS = {
    "phishing": {
        "title": "Simulated Phishing Attack",
        "attack_type": "Phishing",
        "severity": "High",
        "risk_score": 85,
        "affected_endpoint": "WIN-SOC-01",
        "mitre_tactic": "T1566 - Phishing / T1078 - Valid Accounts",
        "alert_title": "Suspicious Email Link Clicked",
        "alert_desc": "Employee opened a malicious email link from external domain malicious-login.acira-phish.xyz",
        "stages": [
            {"agent": "Detection Agent", "action": "Phishing email detected in mailbox of user john.doe@acira.local", "delay": 2},
            {"agent": "Detection Agent", "action": "User clicked malicious link: http://malicious-login.acira-phish.xyz/capture", "delay": 1, "update": {"status": "Investigating"}},
            {"agent": "Investigation Agent", "action": "Analyzing browser process on WIN-SOC-01 (10.0.4.15)...", "delay": 2},
            {"agent": "Investigation Agent", "action": "Credential form submission detected. Possible credential harvesting.", "delay": 2},
            {"agent": "AI Analysis Agent", "action": "Threat type: CREDENTIAL PHISHING. MITRE ATT&CK: T1566.002. Confidence: 97%", "delay": 3},
            {"agent": "AI Analysis Agent", "action": "Risk Score elevated to 85. Recommend immediate account lockout and endpoint quarantine.", "delay": 1, "update": {"status": "Analyzing", "risk_score": 85, "severity": "High"}},
            {"agent": "Response Agent", "action": "Revoking active session tokens for john.doe@acira.local...", "delay": 2},
            {"agent": "Response Agent", "action": "Endpoint WIN-SOC-01 isolated. Network access revoked. MFA reset triggered.", "delay": 2, "update": {"status": "Contained"}, "isolate_endpoint": "WIN-SOC-01"},
            {"agent": "Recovery Agent", "action": "Generating recovery plan: Password reset, MFA re-enrollment, phishing awareness training.", "delay": 2},
            {"agent": "Recovery Agent", "action": "Block list updated with malicious-login.acira-phish.xyz across all firewall rules.", "delay": 1},
            {"agent": "Report Agent", "action": "Compiling incident report INC-PHISH-DEMO...", "delay": 2},
            {"agent": "Report Agent", "action": "Report archived. Incident closed. WIN-SOC-01 cleared for reconnection.", "delay": 1, "update": {"status": "Resolved"}},
        ],
        "report_summary": "Phishing campaign successfully detected and neutralized. User john.doe@acira.local's credentials were potentially compromised. Endpoint WIN-SOC-01 was isolated, sessions were revoked, and the malicious domain was blocklisted.",
        "report_timeline": "T+0s: Email received | T+5m: Link clicked | T+7m: Credential submission detected | T+9m: Incident created | T+14m: Endpoint isolated | T+18m: Recovery complete",
        "report_recommendations": "1. Enforce mandatory phishing simulation training for all users\n2. Deploy email sandboxing (e.g., Proofpoint TAP)\n3. Enable DMARC/DKIM/SPF enforcement\n4. Require hardware MFA (FIDO2) for privileged accounts",
        "mitre_tactics": "T1566.002 (Spearphishing Link), T1078 (Valid Accounts), T1539 (Steal Web Session Cookie)",
    },
    "hydra": {
        "title": "SSH Brute Force Attack (Hydra)",
        "attack_type": "Brute Force",
        "severity": "Critical",
        "risk_score": 92,
        "affected_endpoint": "SRV-DB-01",
        "mitre_tactic": "T1110 - Brute Force / T1021 - Remote Services",
        "alert_title": "Multiple Failed SSH Login Attempts Detected",
        "alert_desc": "185.220.101.45 attempted 2,847 SSH logins against SRV-DB-01 in 60 seconds",
        "stages": [
            {"agent": "Detection Agent", "action": "Anomaly detected: 2,847 failed SSH attempts on SRV-DB-01 from 185.220.101.45", "delay": 2},
            {"agent": "Detection Agent", "action": "Pattern matches Hydra brute-force tool signature. Incident created.", "delay": 1, "update": {"status": "Investigating"}},
            {"agent": "Investigation Agent", "action": "Analyzing auth logs on SRV-DB-01 (10.0.1.50)... Accounts targeted: root, admin, ubuntu", "delay": 2},
            {"agent": "Investigation Agent", "action": "SUCCESS: root login detected from 185.220.101.45 at 23:47:12 UTC", "delay": 2},
            {"agent": "AI Analysis Agent", "action": "Threat type: BRUTE FORCE / INITIAL ACCESS. MITRE ATT&CK: T1110.001. Risk score: 92. Attacker gained root access.", "delay": 3},
            {"agent": "AI Analysis Agent", "action": "Lateral movement risk: CRITICAL. Recommend immediate isolation of SRV-DB-01.", "delay": 1, "update": {"status": "Analyzing", "risk_score": 92, "severity": "Critical"}},
            {"agent": "Response Agent", "action": "Blocking IP 185.220.101.45 at perimeter firewall and iptables on SRV-DB-01...", "delay": 2},
            {"agent": "Response Agent", "action": "SRV-DB-01 isolated. Root password rotated. Active sessions terminated. Fail2ban rules updated.", "delay": 2, "update": {"status": "Contained"}, "isolate_endpoint": "SRV-DB-01"},
            {"agent": "Recovery Agent", "action": "Reviewing bash history and /var/log/auth.log for post-exploitation activity...", "delay": 2},
            {"agent": "Recovery Agent", "action": "No persistence mechanisms found. System integrity check: PASSED. Database data: INTACT.", "delay": 1},
            {"agent": "Report Agent", "action": "Generating post-mortem report for SSH brute force incident...", "delay": 2},
            {"agent": "Report Agent", "action": "Report finalized. Attacker IP added to global threat blocklist.", "delay": 1, "update": {"status": "Resolved"}},
        ],
        "report_summary": "Hydra SSH brute force attack successfully contained. Attacker from 185.220.101.45 gained root access to SRV-DB-01 but was evicted before lateral movement or data exfiltration occurred. Database integrity confirmed intact.",
        "report_timeline": "T+0s: First failed login | T+30s: 2,847 attempts logged | T+35s: Root access gained | T+38s: Alert triggered | T+5m: Endpoint isolated | T+9m: System scanned clean",
        "report_recommendations": "1. Disable root SSH login (PermitRootLogin no)\n2. Enforce SSH key-based authentication only\n3. Deploy fail2ban with aggressive thresholds (3 attempts / 1 hour ban)\n4. Move SSH to non-standard port or use VPN-gated access",
        "mitre_tactics": "T1110.001 (Password Guessing), T1021.004 (SSH), T1078 (Valid Accounts), T1053 (Scheduled Task/Cron)",
    },
    "ransomware": {
        "title": "Ransomware Deployment (LockBit 3.0)",
        "attack_type": "Ransomware",
        "severity": "Critical",
        "risk_score": 98,
        "affected_endpoint": "WIN-DEV-03",
        "mitre_tactic": "T1486 - Data Encrypted for Impact",
        "alert_title": "Ransomware Encryption Activity Detected",
        "alert_desc": "Mass file encryption detected on WIN-DEV-03. LockBit 3.0 signature matched in process memory.",
        "stages": [
            {"agent": "Detection Agent", "action": "High-entropy file modification detected: 1,247 files renamed to .lockbit3 extension on WIN-DEV-03", "delay": 2},
            {"agent": "Detection Agent", "action": "Process 'svchost32.exe' (PID 4821) matches LockBit 3.0 behavioral signature. CRITICAL incident created.", "delay": 1, "update": {"status": "Investigating"}},
            {"agent": "Investigation Agent", "action": "Tracing infection vector... dropper DLL loaded via macro in Finance_Q4_Report.docx", "delay": 2},
            {"agent": "Investigation Agent", "action": "C2 beacon to 192.168.1.45:443 confirmed. Shadow copy deletion in progress via vssadmin.exe", "delay": 2},
            {"agent": "AI Analysis Agent", "action": "RANSOMWARE CONFIRMED: LockBit 3.0. Encryption key: RSA-2048. Files encrypted: 1,247 of ~8,000. RISK SCORE: 98.", "delay": 3},
            {"agent": "AI Analysis Agent", "action": "Exfiltration risk: HIGH. Recommend emergency shutdown of WIN-DEV-03. Block C2 at perimeter.", "delay": 1, "update": {"status": "Analyzing", "risk_score": 98, "severity": "Critical"}},
            {"agent": "Response Agent", "action": "EMERGENCY: Killing process PID 4821. Blocking C2 IP 192.168.1.45 at firewall...", "delay": 2},
            {"agent": "Response Agent", "action": "WIN-DEV-03 isolated. Ransomware process terminated. C2 connection severed. Network segmented.", "delay": 2, "update": {"status": "Contained"}, "isolate_endpoint": "WIN-DEV-03"},
            {"agent": "Recovery Agent", "action": "Scanning backup repository... Last clean backup: 2026-06-03 00:00 UTC (23h 53m ago)", "delay": 2},
            {"agent": "Recovery Agent", "action": "Backup integrity: VALID. Initiating restore of 1,247 encrypted files from backup.", "delay": 1},
            {"agent": "Report Agent", "action": "Compiling critical incident report with MITRE ATT&CK mapping...", "delay": 2},
            {"agent": "Report Agent", "action": "Restore complete. 1,247 files recovered. Zero data loss. Incident closed.", "delay": 1, "update": {"status": "Resolved"}},
        ],
        "report_summary": "LockBit 3.0 ransomware attack detected and contained before full-disk encryption. 1,247 files were encrypted but fully recovered from backup. Ransomware process was killed within 4 minutes of initial detection. C2 server 192.168.1.45 blocked.",
        "report_timeline": "T+0s: First file renamed | T+10s: Detection triggered | T+2m: Investigation complete | T+4m: Process killed & endpoint isolated | T+6m: Backup restore initiated | T+12m: All files recovered",
        "report_recommendations": "1. Enforce macro execution policy (disable VBA macros in Office)\n2. Implement immutable offline backup (3-2-1 rule)\n3. Deploy EDR with behavioral ransomware protection\n4. Network segmentation to prevent lateral movement\n5. User education on malicious Office document risks",
        "mitre_tactics": "T1486 (Data Encrypted for Impact), T1490 (Inhibit System Recovery), T1041 (Exfiltration Over C2), T1059.003 (Windows Command Shell)",
    },
    "sqli": {
        "title": "SQL Injection Attack on Web App",
        "attack_type": "SQL Injection",
        "severity": "High",
        "risk_score": 88,
        "affected_endpoint": "SRV-WEB-02",
        "mitre_tactic": "T1190 - Exploit Public-Facing Application",
        "alert_title": "SQL Injection Pattern Detected in Web Request",
        "alert_desc": "Malicious SQL payload detected in /api/login endpoint on SRV-WEB-02: ' OR 1=1 --",
        "stages": [
            {"agent": "Detection Agent", "action": "WAF alert: SQL injection payload in POST /api/login from 203.0.113.42 on SRV-WEB-02", "delay": 2},
            {"agent": "Detection Agent", "action": "Payload: username=' OR '1'='1' -- & password=arbitrary. Authentication bypass attempted.", "delay": 1, "update": {"status": "Investigating"}},
            {"agent": "Investigation Agent", "action": "Analyzing web server logs on SRV-WEB-02 (10.0.1.55)... 47 SQLi attempts in past 10 minutes", "delay": 2},
            {"agent": "Investigation Agent", "action": "Database query log: UNION SELECT attack detected. Attacker enumerating table: users (234 records)", "delay": 2},
            {"agent": "AI Analysis Agent", "action": "THREAT: SQL INJECTION / DATA EXFILTRATION. MITRE ATT&CK: T1190. Data at risk: user credentials table.", "delay": 3},
            {"agent": "AI Analysis Agent", "action": "Risk Score: 88. Immediate WAF rule update required. Possible credential dump in progress.", "delay": 1, "update": {"status": "Analyzing", "risk_score": 88, "severity": "High"}},
            {"agent": "Response Agent", "action": "Blocking attacker IP 203.0.113.42 at WAF and firewall. Deploying emergency SQLi rules...", "delay": 2},
            {"agent": "Response Agent", "action": "SRV-WEB-02 isolated for patching. WAF rules updated. Database access token rotated.", "delay": 2, "update": {"status": "Contained"}, "isolate_endpoint": "SRV-WEB-02"},
            {"agent": "Recovery Agent", "action": "Auditing database for exfiltrated data... Checking row access logs...", "delay": 2},
            {"agent": "Recovery Agent", "action": "42 user records may have been read. Forcing password reset for affected accounts.", "delay": 1},
            {"agent": "Report Agent", "action": "Generating SQL injection incident report with OWASP Top 10 mapping...", "delay": 2},
            {"agent": "Report Agent", "action": "Incident closed. Parameterized queries implemented. SRV-WEB-02 cleared.", "delay": 1, "update": {"status": "Resolved"}},
        ],
        "report_summary": "SQL Injection attack detected against web application on SRV-WEB-02. Attacker attempted authentication bypass and UNION-based data extraction. 42 user records potentially exposed. Attack blocked within 8 minutes. Parameterized queries implemented.",
        "report_timeline": "T+0s: First SQLi attempt | T+2m: 47 attempts logged | T+4m: UNION attack detected | T+6m: Incident created | T+8m: IP blocked | T+10m: DB patched | T+12m: Password resets sent",
        "report_recommendations": "1. Use parameterized queries / prepared statements everywhere\n2. Implement input validation and output encoding\n3. Enable WAF with OWASP CRS ruleset\n4. Apply least-privilege principle to database accounts\n5. Regular automated DAST scanning (OWASP ZAP)",
        "mitre_tactics": "T1190 (Exploit Public-Facing Application), T1005 (Data from Local System), T1083 (File and Directory Discovery), T1078 (Valid Accounts)",
    }
}


def simulate_agent_workflow(incident_id: str, playbook_key: str, file_ids: list):
    playbook = ATTACK_PLAYBOOKS.get(playbook_key, ATTACK_PLAYBOOKS["phishing"])
    stages = playbook["stages"]
    
    db = SessionLocal()
    try:
        for stage in stages:
            time.sleep(stage["delay"])
            
            log = models.AgentLog(
                incident_id=incident_id,
                agent_name=stage["agent"],
                action=stage["action"],
                details=f"Automated action by {stage['agent']}"
            )
            db.add(log)
            
            if "update" in stage:
                incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
                if incident:
                    if "status" in stage["update"]:
                        incident.status = stage["update"]["status"]
                        
                        if incident.status == "Contained":
                            ep_id = playbook.get("affected_endpoint", "WIN-SOC-01")
                            endpoint = db.query(models.Endpoint).filter(models.Endpoint.id == ep_id).first()
                            if endpoint:
                                endpoint.status = "Isolated"
                                endpoint.risk_level = "Critical"
                            
                            # Mark protected files as compromised if it's ransomware
                            if playbook_key == "ransomware" and file_ids:
                                for fid in file_ids:
                                    pf = db.query(models.ProtectedFile).filter(models.ProtectedFile.id == fid).first()
                                    if pf:
                                        pf.status = "Compromised"
                                        pf.threat_detected = "LockBit 3.0 Ransomware - Encryption attempt"
                        
                        if incident.status == "Resolved":
                            report = models.Report(
                                id=f"REP-{incident_id}",
                                incident_id=incident_id,
                                attack_type=playbook["attack_type"],
                                title=f"Post-Mortem: {playbook['title']}",
                                summary=playbook["report_summary"],
                                timeline=playbook["report_timeline"],
                                recommendations=playbook["report_recommendations"],
                                mitre_tactics=playbook["mitre_tactics"],
                            )
                            db.add(report)
                            
                            # Restore protected files status after resolved
                            if file_ids:
                                for fid in file_ids:
                                    pf = db.query(models.ProtectedFile).filter(models.ProtectedFile.id == fid).first()
                                    if pf and pf.status == "Compromised":
                                        pf.status = "Quarantined"
                                        pf.threat_detected = f"Resolved - {playbook['attack_type']}"

                    if "risk_score" in stage["update"]:
                        incident.risk_score = stage["update"]["risk_score"]
                    if "severity" in stage["update"]:
                        incident.severity = stage["update"]["severity"]
                    incident.updated_at = datetime.utcnow()
            
            db.commit()
    finally:
        db.close()


@app.post("/api/simulation/launch")
def launch_simulation(
    body: Dict[str, Any] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    if body is None:
        body = {}
    
    attack_type = body.get("attack_type", "phishing")
    if attack_type not in ATTACK_PLAYBOOKS:
        attack_type = "phishing"
    
    playbook = ATTACK_PLAYBOOKS[attack_type]
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    
    new_incident = models.Incident(
        id=incident_id,
        title=playbook["title"],
        attack_type=playbook["attack_type"],
        status="Detected",
        severity=playbook["severity"],
        risk_score=playbook["risk_score"],
        affected_endpoint=playbook["affected_endpoint"],
        mitre_tactic=playbook["mitre_tactic"],
    )
    db.add(new_incident)
    
    alert = models.Alert(
        title=playbook["alert_title"],
        severity=playbook["severity"],
        source=playbook["affected_endpoint"],
        attack_type=playbook["attack_type"],
        description=playbook["alert_desc"],
        status="New"
    )
    db.add(alert)
    
    log = models.AgentLog(
        incident_id=incident_id,
        agent_name="Detection Agent",
        action=f"Attack type detected: {playbook['attack_type']}. Incident {incident_id} created.",
        details="Initial detection trigger."
    )
    db.add(log)
    db.commit()
    
    # Get protected file IDs for simulation
    file_ids = [f.id for f in db.query(models.ProtectedFile).all()]
    
    background_tasks.add_task(simulate_agent_workflow, incident_id, attack_type, file_ids)
    
    return {"status": "Simulation started", "incident_id": incident_id, "attack_type": attack_type}

@app.get("/api/simulation/{incident_id}/status")
def get_simulation_status(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    logs = db.query(models.AgentLog).filter(models.AgentLog.incident_id == incident_id).order_by(models.AgentLog.timestamp.asc()).all()
    
    return {
        "incident": incident,
        "logs": logs
    }

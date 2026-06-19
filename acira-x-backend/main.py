from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import time
import uuid
import hashlib
import os
import json
from datetime import datetime, timedelta

from database import SessionLocal, engine, Base
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ACIRA-X API")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]
ALLOWED_ORIGINS += ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


# ─── Seed initial data if missing ──────────────────────────────────────────────
def seed_data():
    db = SessionLocal()
    # Hardcoded fake endpoints removed. Endpoints are now dynamically registered via live telemetry.
    db.close()

seed_data()


# ─── AI ANALYST ENGINE ─────────────────────────────────────────────────────────
# Rule-based structured analysis generation for each incident type.

AI_ANALYSIS_TEMPLATES = {
    "High CPU Usage": {
        "threat_explanation": "Abnormally high CPU utilization was detected on the endpoint. This can indicate a cryptominer, ransomware encryption process, or a resource-exhaustion denial-of-service attack running in the background.",
        "root_cause": "A process is consuming disproportionate CPU resources. Common causes include: unauthorized cryptomining malware, ransomware actively encrypting files, or a denial-of-service payload executing locally.",
        "predicted_impact": "If left unaddressed: system instability and crashes, service degradation, possible cover for concurrent data exfiltration or encryption activity.",
        "remediation_steps": ["Identify and terminate the offending process immediately", "Scan endpoint with updated antivirus/EDR tool", "Check for scheduled tasks or startup entries created by the process", "Review recent software installations and downloads", "Isolate endpoint if process cannot be identified"],
        "mitre_tactic": "T1496 - Resource Hijacking",
        "risk_adjustment": 0,
    },
    "Suspicious Process": {
        "threat_explanation": "A process matching a known-malicious or penetration-testing tool name was detected running on the endpoint. These tools are commonly used by attackers for credential dumping, network reconnaissance, or lateral movement.",
        "root_cause": "An unauthorized executable is running on the endpoint. This may indicate: an attacker has gained initial access and deployed post-exploitation tools, or an insider threat is conducting unauthorized security testing.",
        "predicted_impact": "Immediate risk of credential theft, lateral movement to other systems, privilege escalation, and potential complete compromise of the endpoint and connected network resources.",
        "remediation_steps": ["Immediately isolate the endpoint from the network", "Kill the suspicious process and preserve memory dump for forensics", "Audit all user accounts for unauthorized access", "Check for new user accounts, scheduled tasks, or registry persistence mechanisms", "Perform full forensic analysis before reconnecting endpoint", "Reset all credentials accessible from this endpoint"],
        "mitre_tactic": "T1059 - Command and Scripting Interpreter / T1055 - Process Injection",
        "risk_adjustment": 10,
    },
    "Suspicious Port Exposure": {
        "threat_explanation": "An unexpected listening port was detected on the endpoint. Specific ports (4444, 1337, 5555, 6666) are commonly used by remote access trojans (RATs), command & control (C2) frameworks like Metasploit, and backdoor implants.",
        "root_cause": "A process has opened a network listener on a suspicious port. This strongly suggests a backdoor or C2 implant is running, waiting for attacker connections, or an attacker has already established a foothold.",
        "predicted_impact": "Active or imminent remote attacker access to the endpoint. Risk of full system compromise, data exfiltration, lateral movement, and use of this endpoint as a pivot point into the internal network.",
        "remediation_steps": ["Immediately block the port at the firewall level", "Identify the process holding the port open and terminate it", "Isolate the endpoint from the network", "Capture and analyze network traffic on that port", "Perform full malware scan and forensic analysis", "Check for C2 beacon traffic to external IPs"],
        "mitre_tactic": "T1071 - Application Layer Protocol / T1049 - System Network Connections Discovery",
        "risk_adjustment": 5,
    },
    "Brute Force Login": {
        "threat_explanation": "Multiple failed authentication attempts were detected in a short time window. This pattern is characteristic of automated brute-force or credential-stuffing attacks attempting to gain unauthorized access to the endpoint.",
        "root_cause": "An attacker or automated tool is attempting to authenticate to this system using many different passwords. Common tools include Hydra, Medusa, and Burp Suite intruder. The source may be external or a compromised internal system.",
        "predicted_impact": "If successful: full unauthorized access to the endpoint with the privileges of the targeted account. This could lead to data theft, malware installation, and lateral movement across the network.",
        "remediation_steps": ["Temporarily lock targeted accounts after threshold exceeded", "Block the source IP at the firewall", "Enable account lockout policy (5 attempts / 15 min lockout)", "Enforce multi-factor authentication on all accounts", "Review SSH/RDP configuration and disable password auth in favour of key-based auth", "Alert the account owner of the attempt"],
        "mitre_tactic": "T1110 - Brute Force / T1021 - Remote Services",
        "risk_adjustment": 8,
    },
    "High RAM Usage": {
        "threat_explanation": "Critically high RAM utilization was detected. While often benign, extreme memory consumption can indicate memory-resident malware (fileless malware), a memory leak in a compromised process, or an active denial-of-service condition.",
        "root_cause": "One or more processes are consuming excessive memory. Fileless malware operates entirely in RAM to evade disk-based detection, making this a potential indicator of sophisticated attack.",
        "predicted_impact": "System instability, potential crash, service unavailability. If caused by fileless malware: risk of credential theft, keylogging, or lateral movement without leaving traces on disk.",
        "remediation_steps": ["Identify high-memory processes and assess legitimacy", "Take a memory dump for forensic analysis before killing processes", "Check for PowerShell, WScript, or other interpreters running unusual scripts in memory", "Reboot if system is unstable, then investigate startup entries", "Deploy memory-scanning EDR solution"],
        "mitre_tactic": "T1055 - Process Injection / T1620 - Reflective Code Loading",
        "risk_adjustment": -10,
    },
    "Phishing": {
        "threat_explanation": "A phishing attack was simulated against this endpoint. The user received and interacted with a malicious email containing a credential-harvesting link.",
        "root_cause": "Insufficient email security controls and user awareness allowed a malicious link to reach and be clicked by an end user. The attacker used a lookalike domain to deceive the victim.",
        "predicted_impact": "Potential credential compromise for the affected user account. Risk of account takeover, unauthorized data access, and use of the compromised account for further phishing or lateral movement.",
        "remediation_steps": ["Reset affected user's password immediately", "Revoke all active sessions for the compromised account", "Enable MFA for the affected account", "Block the malicious domain at DNS/proxy level", "Deploy email security with link sandboxing", "Conduct phishing awareness training"],
        "mitre_tactic": "T1566.002 - Spearphishing Link / T1539 - Steal Web Session Cookie",
        "risk_adjustment": 0,
    },
    "Brute Force": {
        "threat_explanation": "An SSH brute force attack was detected against this server. Thousands of login attempts were made in a short period from an external IP.",
        "root_cause": "The server's SSH service is exposed to the internet without adequate rate limiting or key-based authentication enforcement, allowing automated brute-force tools to target it.",
        "predicted_impact": "If successful: root-level unauthorized access to the server. Risk of data theft, ransomware deployment, use as a botnet node, and lateral movement to internal network.",
        "remediation_steps": ["Disable password-based SSH authentication, use keys only", "Move SSH to a non-standard port", "Deploy fail2ban with aggressive lockout rules", "Restrict SSH access to known IP ranges via firewall", "Enable SSH session logging and alerts"],
        "mitre_tactic": "T1110.001 - Password Guessing / T1021.004 - SSH",
        "risk_adjustment": 0,
    },
    "Ransomware": {
        "threat_explanation": "LockBit 3.0 ransomware was detected actively encrypting files on this endpoint. The malware was delivered via a malicious Office macro and is communicating with a C2 server.",
        "root_cause": "The ransomware was delivered through a macro-enabled Office document. Insufficient macro policies and lack of EDR allowed the dropper to execute and deploy the ransomware payload.",
        "predicted_impact": "Mass file encryption leading to data unavailability. Risk of double-extortion (data exfiltration before encryption). Financial damage and operational disruption.",
        "remediation_steps": ["Immediately isolate endpoint to prevent lateral spread", "Terminate ransomware processes and block C2 IP at firewall", "Restore files from clean backup (verify integrity first)", "Disable Office macros via Group Policy", "Deploy EDR with behavioral ransomware detection", "Conduct post-incident forensic analysis"],
        "mitre_tactic": "T1486 - Data Encrypted for Impact / T1490 - Inhibit System Recovery",
        "risk_adjustment": 0,
    },
    "SQL Injection": {
        "threat_explanation": "A SQL injection attack was detected against the web application on this server. The attacker is using UNION-based injection to extract data from the database.",
        "root_cause": "The web application uses string concatenation to build SQL queries rather than parameterized statements, making it vulnerable to injection attacks.",
        "predicted_impact": "Unauthorized access to database contents including user credentials, PII, and sensitive business data. Risk of authentication bypass and data exfiltration.",
        "remediation_steps": ["Implement parameterized queries / prepared statements throughout the application", "Deploy WAF with OWASP Core Rule Set", "Audit and sanitize all user inputs", "Apply principle of least privilege to database accounts", "Conduct code review and automated SAST scanning"],
        "mitre_tactic": "T1190 - Exploit Public-Facing Application / T1005 - Data from Local System",
        "risk_adjustment": 0,
    },
}

def get_ai_analysis(attack_type: str, severity: str, risk_score: int, endpoint_id: str) -> dict:
    """Generate structured AI analyst output for a given incident."""
    # Find best matching template
    template = AI_ANALYSIS_TEMPLATES.get(attack_type, None)
    if template is None:
        # Fuzzy match
        for key in AI_ANALYSIS_TEMPLATES:
            if key.lower() in attack_type.lower() or attack_type.lower() in key.lower():
                template = AI_ANALYSIS_TEMPLATES[key]
                break
    if template is None:
        template = {
            "threat_explanation": f"A {attack_type} threat was detected on endpoint {endpoint_id}. ACIRA-X autonomous detection engine identified anomalous behavior matching known threat signatures.",
            "root_cause": "Anomalous system behavior detected through telemetry analysis. Root cause determination requires further forensic investigation.",
            "predicted_impact": "Potential system compromise, data loss, or service disruption if not addressed promptly.",
            "remediation_steps": ["Isolate affected endpoint", "Conduct forensic investigation", "Apply relevant security patches", "Review and update security policies"],
            "mitre_tactic": "T1499 - Endpoint Denial of Service",
            "risk_adjustment": 0,
        }
    
    adjusted_risk = min(100, max(0, risk_score + template.get("risk_adjustment", 0)))
    
    return {
        "threat_explanation": template["threat_explanation"],
        "root_cause": template["root_cause"],
        "predicted_impact": template["predicted_impact"],
        "remediation_steps": template["remediation_steps"],
        "mitre_tactic": template["mitre_tactic"],
        "risk_score": adjusted_risk,
        "confidence": "High" if adjusted_risk >= 80 else "Medium" if adjusted_risk >= 50 else "Low",
        "analyst": "ACIRA-X Autonomous AI Analyst v2.0",
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─── THREAT DETECTION ENGINE ───────────────────────────────────────────────────

# Processes that are always suspicious
SUSPICIOUS_PROCESSES = {
    "mimikatz", "mimikatz.exe", "mimikatz_test", "mimikatz_test.exe",
    "nmap", "nmap.exe", "masscan", "masscan.exe",
    "hydra", "hydra.exe", "medusa", "medusa.exe",
    "netcat", "nc", "nc.exe", "ncat", "ncat.exe",
    "meterpreter", "msf", "msfconsole",
    "cobalt", "cobaltstrike",
    "bloodhound", "sharphound",
    "psexec", "psexec.exe",
    "wce", "wce.exe",
    "pwdump", "fgdump",
    "lazagne", "lazagne.exe",
    "procdump", "procdump.exe",
    "volatility",
    "crackmapexec", "cme",
    "responder", "responder.py",
}

# Ports that are suspicious when listening
SUSPICIOUS_PORTS = {4444, 1337, 5555, 6666, 31337, 9001, 8888, 12345, 54321}

# Thresholds
CPU_THRESHOLD = 85.0
RAM_THRESHOLD = 95.0
BRUTE_FORCE_THRESHOLD = 5  # failed logins
DEDUP_WINDOW_SECONDS = 90  # won't re-fire same rule for same endpoint within this window

# In-memory dedup tracker: {(device_id, rule_name): last_fired_timestamp}
_detection_dedup: Dict[tuple, float] = {}

def _is_deduped(device_id: str, rule: str) -> bool:
    key = (device_id, rule)
    last = _detection_dedup.get(key, 0)
    if time.time() - last < DEDUP_WINDOW_SECONDS:
        return True
    _detection_dedup[key] = time.time()
    return False

def _create_action_log(db: Session, incident_id: str, endpoint_id: str,
                        trigger: str, detail: str,
                        reasoning: str, action: str, action_detail: str,
                        severity: str):
    log = models.AutonomousActionLog(
        incident_id=incident_id,
        endpoint_id=endpoint_id,
        detection_trigger=trigger,
        detection_detail=detail,
        decision_reasoning=reasoning,
        action_taken=action,
        action_detail=action_detail,
        action_status="Completed",
        severity=severity,
    )
    db.add(log)

def _create_incident_and_alert(db: Session, endpoint_id: str, title: str,
                                attack_type: str, severity: str, risk_score: int,
                                mitre_tactic: str, alert_desc: str,
                                response_action: str) -> str:
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    analysis = get_ai_analysis(attack_type, severity, risk_score, endpoint_id)
    
    incident = models.Incident(
        id=incident_id,
        title=title,
        attack_type=attack_type,
        status="Detected",
        severity=severity,
        risk_score=risk_score,
        affected_endpoint=endpoint_id,
        mitre_tactic=mitre_tactic,
        source="telemetry",
        threat_explanation=analysis["threat_explanation"],
        root_cause=analysis["root_cause"],
        predicted_impact=analysis["predicted_impact"],
        remediation_steps=json.dumps(analysis["remediation_steps"]),
        response_action=response_action,
    )
    db.add(incident)

    alert = models.Alert(
        title=title,
        severity=severity,
        source=endpoint_id,
        attack_type=attack_type,
        description=alert_desc,
        status="New",
    )
    db.add(alert)
    return incident_id


def run_threat_detection(db: Session, snapshot: models.TelemetrySnapshot):
    """
    Analyze a telemetry snapshot and fire detection rules.
    Each fired rule creates: Incident + Alert + AutonomousActionLog.
    """
    endpoint_id = snapshot.device_id
    hostname = snapshot.hostname

    try:
        processes = json.loads(snapshot.processes_json or "[]")
        ports = json.loads(snapshot.ports_json or "[]")
    except Exception:
        processes = []
        ports = []

    # ── Rule 1: High CPU ─────────────────────────────────────────────────────
    if snapshot.cpu_percent > CPU_THRESHOLD and not _is_deduped(endpoint_id, "high_cpu"):
        inc_id = _create_incident_and_alert(
            db, endpoint_id,
            title=f"High CPU Usage Detected — {hostname}",
            attack_type="High CPU Usage",
            severity="High",
            risk_score=72,
            mitre_tactic="T1496 - Resource Hijacking",
            alert_desc=f"CPU utilization reached {snapshot.cpu_percent:.1f}% on {hostname}. Possible cryptominer or ransomware activity.",
            response_action="Process Monitoring Activated",
        )
        _create_action_log(db, inc_id, endpoint_id,
            trigger=f"CPU utilization: {snapshot.cpu_percent:.1f}%",
            detail=f"Threshold exceeded: {snapshot.cpu_percent:.1f}% > {CPU_THRESHOLD}% on {hostname}",
            reasoning=f"CPU at {snapshot.cpu_percent:.1f}% exceeds the 85% anomaly threshold. This pattern is consistent with cryptomining malware, ransomware file encryption, or a resource-exhaustion payload. Immediate investigation warranted.",
            action="Process Audit Initiated (Simulated)",
            action_detail=f"ACIRA dispatched process audit agent to {hostname}. All processes consuming >20% CPU flagged for manual review.",
            severity="High",
        )
        # Update endpoint risk
        ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
        if ep:
            ep.risk_level = "High"

    # ── Rule 2: Suspicious Process ───────────────────────────────────────────
    for proc in processes:
        proc_name = proc.get("name", "").lower().strip()
        if proc_name in SUSPICIOUS_PROCESSES and not _is_deduped(endpoint_id, f"susp_proc_{proc_name}"):
            inc_id = _create_incident_and_alert(
                db, endpoint_id,
                title=f"Suspicious Process Detected — {proc.get('name')} on {hostname}",
                attack_type="Suspicious Process",
                severity="Critical",
                risk_score=91,
                mitre_tactic="T1059 - Command and Scripting Interpreter",
                alert_desc=f"Process '{proc.get('name')}' (PID {proc.get('pid', '?')}) is a known attack tool detected running on {hostname}.",
                response_action="Process Flagged & Isolated (Simulated)",
            )
            _create_action_log(db, inc_id, endpoint_id,
                trigger=f"Suspicious process: {proc.get('name')} (PID {proc.get('pid', '?')})",
                detail=f"Process name '{proc.get('name')}' matches known attack tool signature. CPU: {proc.get('cpu_percent', 0):.1f}%",
                reasoning=f"Process '{proc.get('name')}' is a known post-exploitation / penetration testing tool. Its presence on a production endpoint indicates either an active attacker or unauthorized security testing. Immediate containment is required to prevent credential theft, lateral movement, or privilege escalation.",
                action="Process Containment Workflow Activated (Simulated)",
                action_detail=f"ACIRA flagged PID {proc.get('pid', '?')} ({proc.get('name')}) on {hostname}. Network access restricted. Process memory image queued for forensic analysis. Security team notified via priority alert.",
                severity="Critical",
            )
            ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
            if ep:
                ep.risk_level = "Critical"
            break  # Only fire once per snapshot per endpoint

    # ── Rule 3: Suspicious Port Exposure ─────────────────────────────────────
    for port_entry in ports:
        port_num = port_entry if isinstance(port_entry, int) else port_entry.get("port", 0)
        if port_num in SUSPICIOUS_PORTS and not _is_deduped(endpoint_id, f"port_{port_num}"):
            inc_id = _create_incident_and_alert(
                db, endpoint_id,
                title=f"Suspicious Port {port_num} Open — {hostname}",
                attack_type="Suspicious Port Exposure",
                severity="High",
                risk_score=85,
                mitre_tactic="T1071 - Application Layer Protocol",
                alert_desc=f"Port {port_num} (known RAT/C2 port) is open and listening on {hostname}. Possible backdoor or reverse shell.",
                response_action="Port Blocked at Firewall (Simulated)",
            )
            _create_action_log(db, inc_id, endpoint_id,
                trigger=f"Suspicious listening port: {port_num}/TCP",
                detail=f"Port {port_num} is in the known-bad port list (RAT/C2 indicator). Detected listening on {hostname}.",
                reasoning=f"Port {port_num} is associated with common attack frameworks (Metasploit default listener: 4444, common backdoor ports: 1337, 5555, 6666). An open listener on this port strongly indicates a backdoor implant or active C2 channel. Emergency network restriction required.",
                action="Firewall Rule Deployed (Simulated)",
                action_detail=f"ACIRA deployed emergency egress/ingress block for port {port_num} on {hostname}. Network traffic to/from this port is now dropped. SOC team alerted for manual investigation.",
                severity="High",
            )
            ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
            if ep:
                ep.risk_level = "High"

    # ── Rule 4: Brute Force Login Attempts ───────────────────────────────────
    if snapshot.failed_login_count >= BRUTE_FORCE_THRESHOLD and not _is_deduped(endpoint_id, "brute_force"):
        inc_id = _create_incident_and_alert(
            db, endpoint_id,
            title=f"Brute Force Login Attack Detected — {hostname}",
            attack_type="Brute Force Login",
            severity="Critical",
            risk_score=93,
            mitre_tactic="T1110 - Brute Force",
            alert_desc=f"{snapshot.failed_login_count} failed login attempts detected on {hostname} in the last monitoring interval. Possible automated attack.",
            response_action="Account Lockout Recommended / IP Block (Simulated)",
        )
        _create_action_log(db, inc_id, endpoint_id,
            trigger=f"Failed login count: {snapshot.failed_login_count} attempts",
            detail=f"{snapshot.failed_login_count} failed authentication attempts detected on {hostname} exceeding threshold of {BRUTE_FORCE_THRESHOLD}.",
            reasoning=f"{snapshot.failed_login_count} failed login attempts in a short window is a strong indicator of automated brute-force activity. Tools like Hydra or Medusa can attempt thousands of passwords per minute. Immediate rate limiting and account lockout are critical to prevent successful unauthorized access.",
            action="Account Lockout Policy Enforced (Simulated)",
            action_detail=f"ACIRA enforced temporary lockout on targeted accounts on {hostname}. Source IP flagged in threat blocklist. Authentication rate limiting activated. Security team notified via critical priority alert.",
            severity="Critical",
        )
        ep = db.query(models.Endpoint).filter(models.Endpoint.id == endpoint_id).first()
        if ep:
            ep.risk_level = "Critical"

    # ── Rule 5: High RAM ─────────────────────────────────────────────────────
    if snapshot.ram_percent > RAM_THRESHOLD and not _is_deduped(endpoint_id, "high_ram"):
        inc_id = _create_incident_and_alert(
            db, endpoint_id,
            title=f"Critical RAM Usage — Possible Fileless Malware on {hostname}",
            attack_type="High RAM Usage",
            severity="Medium",
            risk_score=62,
            mitre_tactic="T1055 - Process Injection",
            alert_desc=f"RAM utilization at {snapshot.ram_percent:.1f}% on {hostname}. Possible fileless malware or memory-resident attack.",
            response_action="Memory Analysis Initiated (Simulated)",
        )
        _create_action_log(db, inc_id, endpoint_id,
            trigger=f"RAM utilization: {snapshot.ram_percent:.1f}%",
            detail=f"Memory usage at {snapshot.ram_percent:.1f}% exceeds critical threshold of {RAM_THRESHOLD}%",
            reasoning=f"RAM at {snapshot.ram_percent:.1f}% is critically high. While this can be benign, fileless malware operates entirely in memory to evade disk-based detection. A memory forensic scan is required to rule out process injection or reflective DLL loading.",
            action="Memory Forensic Scan Queued (Simulated)",
            action_detail=f"ACIRA queued memory dump and forensic scan on {hostname}. Process memory regions flagged for analysis. System monitored for stability.",
            severity="Medium",
        )


# ─── API ENDPOINTS ─────────────────────────────────────────────────────────────

@app.get("/api/dashboard/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total_incidents = db.query(models.Incident).count()
    active_incidents = db.query(models.Incident).filter(models.Incident.status != "Resolved").count()
    isolated_endpoints = db.query(models.Endpoint).filter(models.Endpoint.status == "Isolated").count()
    protected_files = db.query(models.ProtectedFile).count()
    compromised_files = db.query(models.ProtectedFile).filter(models.ProtectedFile.status == "Compromised").count()
    real_endpoints = db.query(models.Endpoint).filter(models.Endpoint.is_real == True).count()
    action_log_count = db.query(models.AutonomousActionLog).count()
    
    return {
        "active_incidents": active_incidents,
        "critical_alerts": db.query(models.Alert).filter(models.Alert.status == "New").count(),
        "devices_protected": db.query(models.Endpoint).count(),
        "real_endpoints_online": real_endpoints,
        "isolated_endpoints": isolated_endpoints,
        "threats_blocked_today": 89 + total_incidents,
        "mean_response_time": "1.2s",
        "security_score": 94 if active_incidents == 0 else max(10, 94 - (active_incidents * 15)),
        "protected_files": protected_files,
        "compromised_files": compromised_files,
        "autonomous_actions_taken": action_log_count,
    }

@app.get("/api/incidents")
def get_incidents(db: Session = Depends(get_db)):
    return db.query(models.Incident).order_by(models.Incident.created_at.desc()).all()

@app.get("/api/incidents/history")
def get_incident_history(
    limit: int = 50,
    offset: int = 0,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Incident)
    if severity:
        query = query.filter(models.Incident.severity == severity)
    if status:
        query = query.filter(models.Incident.status == status)
    if source:
        query = query.filter(models.Incident.source == source)
    total = query.count()
    incidents = query.order_by(models.Incident.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "incidents": incidents}

@app.get("/api/incidents/{incident_id}/analysis")
def get_incident_analysis(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    analysis = get_ai_analysis(
        incident.attack_type, incident.severity,
        incident.risk_score, incident.affected_endpoint
    )
    
    # If incident already has stored analysis, use it
    stored_steps = []
    if incident.remediation_steps:
        try:
            stored_steps = json.loads(incident.remediation_steps)
        except Exception:
            stored_steps = [incident.remediation_steps]
    
    return {
        "incident_id": incident_id,
        "threat_explanation": incident.threat_explanation or analysis["threat_explanation"],
        "root_cause": incident.root_cause or analysis["root_cause"],
        "predicted_impact": incident.predicted_impact or analysis["predicted_impact"],
        "remediation_steps": stored_steps if stored_steps else analysis["remediation_steps"],
        "mitre_tactic": incident.mitre_tactic or analysis["mitre_tactic"],
        "risk_score": incident.risk_score,
        "confidence": analysis["confidence"],
        "analyst": analysis["analyst"],
        "generated_at": analysis["generated_at"],
        "response_action": incident.response_action,
    }

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


# ─── TELEMETRY INGESTION ───────────────────────────────────────────────────────

@app.post("/api/telemetry")
def receive_telemetry(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Endpoint for the real endpoint agent to POST telemetry data.
    Upserts the endpoint, stores a snapshot, and runs threat detection.
    """
    device_id = payload.get("device_id", "")
    hostname = payload.get("hostname", "unknown")
    ip_address = payload.get("ip_address", "")
    os_info = payload.get("os_info", "")
    cpu_percent = float(payload.get("cpu_percent", 0))
    ram_percent = float(payload.get("ram_percent", 0))
    disk_percent = float(payload.get("disk_percent", 0))
    processes = payload.get("processes", [])
    ports = payload.get("open_ports", [])
    connections = payload.get("connections", [])
    failed_logins = int(payload.get("failed_login_count", 0))
    agent_version = payload.get("agent_version", "1.0.0")
    
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")
    
    # Upsert endpoint
    ep = db.query(models.Endpoint).filter(models.Endpoint.id == device_id).first()
    if ep:
        ep.hostname = hostname
        ep.ip_address = ip_address
        ep.os = os_info
        ep.cpu_percent = cpu_percent
        ep.ram_percent = ram_percent
        ep.disk_percent = disk_percent
        ep.agent_version = agent_version
        ep.last_seen = datetime.utcnow()
        ep.last_telemetry = datetime.utcnow()
        ep.status = "Active"
        ep.is_real = True
    else:
        ep = models.Endpoint(
            id=device_id,
            hostname=hostname,
            ip_address=ip_address,
            os=os_info,
            status="Active",
            risk_level="Low",
            cpu_percent=cpu_percent,
            ram_percent=ram_percent,
            disk_percent=disk_percent,
            agent_version=agent_version,
            last_seen=datetime.utcnow(),
            last_telemetry=datetime.utcnow(),
            is_real=True,
        )
        db.add(ep)
    
    # Store telemetry snapshot
    snapshot = models.TelemetrySnapshot(
        device_id=device_id,
        hostname=hostname,
        ip_address=ip_address,
        os_info=os_info,
        cpu_percent=cpu_percent,
        ram_percent=ram_percent,
        disk_percent=disk_percent,
        processes_json=json.dumps(processes),
        ports_json=json.dumps(ports),
        connections_json=json.dumps(connections),
        failed_login_count=failed_logins,
        agent_version=agent_version,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    
    # Run autonomous threat detection
    run_threat_detection(db, snapshot)
    db.commit()
    
    return {
        "status": "received",
        "device_id": device_id,
        "snapshot_id": snapshot.id,
        "detections_processed": True,
    }


@app.get("/api/telemetry/{device_id}/history")
def get_telemetry_history(device_id: str, limit: int = 30, db: Session = Depends(get_db)):
    """Return recent telemetry snapshots for charts."""
    snapshots = (
        db.query(models.TelemetrySnapshot)
        .filter(models.TelemetrySnapshot.device_id == device_id)
        .order_by(models.TelemetrySnapshot.timestamp.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(snapshots))


# ─── AUTONOMOUS ACTION LOG ─────────────────────────────────────────────────────

@app.get("/api/action-logs")
def get_action_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = (
        db.query(models.AutonomousActionLog)
        .order_by(models.AutonomousActionLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs

@app.get("/api/action-logs/stats")
def get_action_log_stats(db: Session = Depends(get_db)):
    total = db.query(models.AutonomousActionLog).count()
    critical = db.query(models.AutonomousActionLog).filter(models.AutonomousActionLog.severity == "Critical").count()
    high = db.query(models.AutonomousActionLog).filter(models.AutonomousActionLog.severity == "High").count()
    completed = db.query(models.AutonomousActionLog).filter(models.AutonomousActionLog.action_status == "Completed").count()
    return {
        "total_actions": total,
        "critical": critical,
        "high": high,
        "completed": completed,
        "success_rate": round((completed / total * 100) if total > 0 else 100, 1),
    }


# ─── PROTECTED FILES ──────────────────────────────────────────────────────────

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


# ─── SIMULATION ENGINE ────────────────────────────────────────────────────────

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
    
    analysis = get_ai_analysis(
        playbook["attack_type"], playbook["severity"],
        playbook["risk_score"], playbook["affected_endpoint"]
    )
    
    new_incident = models.Incident(
        id=incident_id,
        title=playbook["title"],
        attack_type=playbook["attack_type"],
        status="Detected",
        severity=playbook["severity"],
        risk_score=playbook["risk_score"],
        affected_endpoint=playbook["affected_endpoint"],
        mitre_tactic=playbook["mitre_tactic"],
        source="simulation",
        threat_explanation=analysis["threat_explanation"],
        root_cause=analysis["root_cause"],
        predicted_impact=analysis["predicted_impact"],
        remediation_steps=json.dumps(analysis["remediation_steps"]),
        response_action="Simulation Response Workflow",
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
    
    # Add an action log entry for the simulation
    action_log = models.AutonomousActionLog(
        incident_id=incident_id,
        endpoint_id=playbook["affected_endpoint"],
        detection_trigger=f"Attack Simulation: {playbook['attack_type']}",
        detection_detail=playbook["alert_desc"],
        decision_reasoning=f"Simulation playbook triggered for {playbook['attack_type']}. ACIRA-X autonomous response workflow initiated. All {len(playbook['stages'])} response stages will execute automatically.",
        action_taken="Full Autonomous Response Workflow Initiated",
        action_detail=f"Executing {len(playbook['stages'])}-stage response playbook: Detection → Investigation → AI Analysis → Containment → Recovery → Report",
        action_status="Completed",
        severity=playbook["severity"],
    )
    db.add(action_log)
    
    log = models.AgentLog(
        incident_id=incident_id,
        agent_name="Detection Agent",
        action=f"Attack type detected: {playbook['attack_type']}. Incident {incident_id} created.",
        details="Initial detection trigger."
    )
    db.add(log)
    db.commit()
    
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

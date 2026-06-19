from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    attack_type = Column(String, default="Unknown")
    status = Column(String, default="Detected")
    severity = Column(String, default="High")
    risk_score = Column(Integer, default=0)
    affected_endpoint = Column(String, default="WIN-SOC-01")
    mitre_tactic = Column(String, default="")
    # Source: "simulation" or "telemetry"
    source = Column(String, default="simulation")
    # AI Analyst fields
    threat_explanation = Column(Text, default="")
    root_cause = Column(Text, default="")
    predicted_impact = Column(Text, default="")
    remediation_steps = Column(Text, default="")
    response_action = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    logs = relationship("AgentLog", back_populates="incident")

class AgentLog(Base):
    __tablename__ = "agent_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"))
    agent_name = Column(String)
    action = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    incident = relationship("Incident", back_populates="logs")

class Endpoint(Base):
    __tablename__ = "endpoints"
    id = Column(String, primary_key=True, index=True)
    hostname = Column(String)
    ip_address = Column(String)
    os = Column(String)
    status = Column(String, default="Active")  # Active, Isolated, Offline
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    risk_level = Column(String, default="Low")  # Low, Medium, High, Critical
    # Real telemetry fields
    cpu_percent = Column(Float, default=0.0)
    ram_percent = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)
    agent_version = Column(String, default="")
    last_telemetry = Column(DateTime, nullable=True)
    # Is this a real enrolled agent or a simulated endpoint?
    is_real = Column(Boolean, default=False)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    severity = Column(String)
    source = Column(String)
    attack_type = Column(String, default="Unknown")
    description = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="New")  # New, Acknowledged, Resolved

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"))
    title = Column(String)
    attack_type = Column(String, default="Unknown")
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    summary = Column(Text)
    timeline = Column(Text, default="")
    recommendations = Column(Text, default="")
    mitre_tactics = Column(Text, default="")

class ProtectedFile(Base):
    __tablename__ = "protected_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_size = Column(Integer, default=0)
    file_hash = Column(String, default="")
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Protected")  # Protected, Compromised, Quarantined
    threat_detected = Column(String, default="")

class TelemetrySnapshot(Base):
    """Stores every telemetry push from real endpoint agents."""
    __tablename__ = "telemetry_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    hostname = Column(String)
    ip_address = Column(String, default="")
    os_info = Column(String, default="")
    cpu_percent = Column(Float, default=0.0)
    ram_percent = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)
    # JSON-encoded lists
    processes_json = Column(Text, default="[]")
    ports_json = Column(Text, default="[]")
    connections_json = Column(Text, default="[]")
    failed_login_count = Column(Integer, default=0)
    agent_version = Column(String, default="1.0.0")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AutonomousActionLog(Base):
    """Records every autonomous detection → decision → action chain."""
    __tablename__ = "autonomous_action_logs"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, default="")
    endpoint_id = Column(String, default="")
    detection_trigger = Column(String)       # What was detected
    detection_detail = Column(Text, default="")  # Evidence details
    decision_reasoning = Column(Text)        # ACIRA's reasoning
    action_taken = Column(String)            # What action was executed
    action_detail = Column(Text, default="") # Action details
    action_status = Column(String, default="Completed")  # Completed, Pending, Failed
    severity = Column(String, default="High")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

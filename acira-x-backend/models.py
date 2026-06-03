from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
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

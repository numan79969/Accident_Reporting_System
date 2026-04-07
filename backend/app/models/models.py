from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, default="citizen")  # citizen, admin, emergency_responder, police, hospital
    organization = Column(String)  # For emergency services
    badge_number = Column(String)  # For police/emergency personnel
    latitude = Column(Float)  # Station/base latitude
    longitude = Column(Float)  # Station/base longitude
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    accidents = relationship("Accident", back_populates="reporter")
    reports = relationship("Report", back_populates="admin")
    emergency_responses = relationship("EmergencyResponse", back_populates="responder")

class Accident(Base):
    __tablename__ = "accidents"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, default="minor")  # minor, moderate, severe, critical
    status = Column(String, default="reported")  # reported, acknowledged, in_progress, resolved
    vehicle_type = Column(String)  # car, motorcycle, truck, bus, pedestrian
    accident_between = Column(String)  # e.g. "car_vs_bike", "bike_vs_pedestrian", "single_person"
    party_a_type = Column(String)  # Type of first party
    party_a_vehicle_number = Column(String)
    party_b_type = Column(String)  # Type of second party (null if single)
    party_b_vehicle_number = Column(String)
    injuries = Column(String)  # none, minor, serious, fatal
    weather_conditions = Column(String)
    road_conditions = Column(String)
    images = Column(Text)  # JSON array of image URLs
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    reported_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)

    reporter = relationship("User", back_populates="accidents")
    reports = relationship("Report", back_populates="accident")
    emergency_responses = relationship("EmergencyResponse", back_populates="accident")

class EmergencyResponse(Base):
    __tablename__ = "emergency_responses"
    id = Column(Integer, primary_key=True, index=True)
    accident_id = Column(Integer, ForeignKey("accidents.id"))
    responder_id = Column(Integer, ForeignKey("users.id"))
    response_type = Column(String)  # police, ambulance, fire_department
    status = Column(String, default="dispatched")  # dispatched, en_route, arrived, completed
    eta_minutes = Column(Integer)
    notes = Column(Text)
    dispatched_at = Column(DateTime, default=datetime.utcnow)
    arrived_at = Column(DateTime)
    completed_at = Column(DateTime)

    accident = relationship("Accident", back_populates="emergency_responses")
    responder = relationship("User", back_populates="emergency_responses")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    accident_id = Column(Integer, ForeignKey("accidents.id"))
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String)  # police, emergency_responder, hospital
    status = Column(String, default="pending")  # pending, accepted, rejected, auto_declined
    response_message = Column(Text)  # Message from responder on accept/reject
    distance_km = Column(Float)  # Distance from responder to accident
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime)

    user = relationship("User")
    accident = relationship("Accident")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    accident_id = Column(Integer, ForeignKey("accidents.id"))
    admin_id = Column(Integer, ForeignKey("users.id"))
    details = Column(Text)
    action_taken = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    accident = relationship("Accident", back_populates="reports")
    admin = relationship("User", back_populates="reports")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String)
    type = Column(String, default="police")  # police, ambulance, fire
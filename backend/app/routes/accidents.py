from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.database import get_db
from app.models.models import Accident, User, Notification
from app.routes.auth import get_current_user
from typing import List, Optional
import math
import os
import uuid
import json

router = APIRouter()

class AccidentCreate(BaseModel):
    location: str
    latitude: float
    longitude: float
    description: str
    severity: str = "minor"
    vehicle_type: Optional[str] = None
    accident_between: Optional[str] = None
    party_a_type: Optional[str] = None
    party_a_vehicle_number: Optional[str] = None
    party_b_type: Optional[str] = None
    party_b_vehicle_number: Optional[str] = None
    injuries: str = "none"
    weather_conditions: Optional[str] = None
    road_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    images: Optional[str] = None  # JSON array of filenames

class AccidentResponse(BaseModel):
    id: int
    reporter_id: int
    location: str
    latitude: float
    longitude: float
    description: str
    severity: str
    status: str
    vehicle_type: Optional[str] = None
    accident_between: Optional[str] = None
    party_a_type: Optional[str] = None
    party_a_vehicle_number: Optional[str] = None
    party_b_type: Optional[str] = None
    party_b_vehicle_number: Optional[str] = None
    injuries: Optional[str] = None
    weather_conditions: Optional[str] = None
    road_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    images: Optional[str] = None
    reported_at: str

@router.post("/upload-images")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload accident images and return their filenames."""
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    saved = []
    for f in files:
        ext = os.path.splitext(f.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        content = await f.read()
        with open(filepath, "wb") as out:
            out.write(content)
        saved.append(filename)
    return {"filenames": saved}


@router.post("/report")
def report_accident(accident: AccidentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_accident = Accident(
        reporter_id=current_user.id,
        location=accident.location,
        latitude=accident.latitude,
        longitude=accident.longitude,
        description=accident.description,
        severity=accident.severity,
        vehicle_type=accident.vehicle_type,
        accident_between=accident.accident_between,
        party_a_type=accident.party_a_type,
        party_a_vehicle_number=accident.party_a_vehicle_number,
        party_b_type=accident.party_b_type,
        party_b_vehicle_number=accident.party_b_vehicle_number,
        injuries=accident.injuries,
        weather_conditions=accident.weather_conditions,
        road_conditions=accident.road_conditions,
        emergency_contact_name=accident.emergency_contact_name,
        emergency_contact_phone=accident.emergency_contact_phone,
        images=accident.images,
    )
    db.add(db_accident)
    db.commit()
    db.refresh(db_accident)

    # Dispatch notifications to nearby responders
    _dispatch_nearby_responders(db, db_accident)

    return {
        "id": db_accident.id,
        "reporter_id": db_accident.reporter_id,
        "location": db_accident.location,
        "latitude": db_accident.latitude,
        "longitude": db_accident.longitude,
        "description": db_accident.description,
        "severity": db_accident.severity,
        "status": db_accident.status,
        "vehicle_type": db_accident.vehicle_type,
        "accident_between": db_accident.accident_between,
        "party_a_type": db_accident.party_a_type,
        "party_a_vehicle_number": db_accident.party_a_vehicle_number,
        "party_b_type": db_accident.party_b_type,
        "party_b_vehicle_number": db_accident.party_b_vehicle_number,
        "injuries": db_accident.injuries,
        "weather_conditions": db_accident.weather_conditions,
        "road_conditions": db_accident.road_conditions,
        "emergency_contact_name": db_accident.emergency_contact_name,
        "emergency_contact_phone": db_accident.emergency_contact_phone,
        "images": db_accident.images,
        "reported_at": db_accident.reported_at.isoformat()
    }

@router.get("/", response_model=List[AccidentResponse])
def get_accidents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        accidents = db.query(Accident).filter(Accident.reporter_id == current_user.id).all()
        result = []
        for a in accidents:
            result.append({
                "id": a.id,
                "reporter_id": a.reporter_id,
                "location": a.location,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "description": a.description,
                "severity": a.severity,
                "status": a.status,
                "reported_at": a.reported_at.isoformat()
            })
        return result
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

NEARBY_RADIUS_KM = 50  # Search radius for nearby responders


def _haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _dispatch_nearby_responders(db: Session, accident: Accident):
    """Find nearby police, ambulance (emergency_responder), and hospital users
    and create pending dispatch notifications for each."""
    responder_roles = ["police", "emergency_responder", "hospital"]
    responders = (
        db.query(User)
        .filter(
            User.role.in_(responder_roles),
            User.is_verified == True,
            User.latitude.isnot(None),
            User.longitude.isnot(None),
        )
        .all()
    )

    severity_label = accident.severity.upper() if accident.severity else "UNKNOWN"

    for responder in responders:
        dist = _haversine_km(accident.latitude, accident.longitude, responder.latitude, responder.longitude)
        if dist <= NEARBY_RADIUS_KM:
            role_label = {
                "police": "Police",
                "emergency_responder": "Ambulance",
                "hospital": "Hospital",
            }.get(responder.role, responder.role)

            notification = Notification(
                user_id=responder.id,
                accident_id=accident.id,
                title=f"{severity_label} Accident - {role_label} Dispatch",
                message=(
                    f"A {accident.severity} accident was reported at {accident.location}. "
                    f"Injuries: {accident.injuries or 'unknown'}. "
                    f"Vehicle: {accident.vehicle_type or 'unknown'}. "
                    f"You are ~{dist:.1f} km away."
                ),
                type=responder.role,
                status="pending",
                distance_km=dist,
            )
            db.add(notification)

    db.commit()


@router.get("/all")
def get_all_accidents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all accidents (for admin dashboard)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    accidents = db.query(Accident).order_by(Accident.reported_at.desc()).all()
    return [
        {
            "id": a.id,
            "reporter_id": a.reporter_id,
            "location": a.location,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "description": a.description,
            "severity": a.severity,
            "status": a.status,
            "injuries": a.injuries,
            "vehicle_type": a.vehicle_type,
            "reported_at": a.reported_at.isoformat(),
        }
        for a in accidents
    ]


@router.put("/accidents/{accident_id}/status")
def update_accident_status(accident_id: int, status: str, db: Session = Depends(get_db)):
    accident = db.query(Accident).filter(Accident.id == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident not found")
    accident.status = status
    if status == "resolved":
        from datetime import datetime
        accident.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Status updated"}
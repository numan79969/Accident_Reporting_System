from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.database.database import get_db
from app.models.models import Notification, Accident, User
from app.routes.auth import get_current_user

router = APIRouter()


class NotificationRespond(BaseModel):
    status: str  # "accepted" or "rejected"
    message: Optional[str] = None


@router.get("/")
def get_my_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all notifications for the current user, newest first."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    results = []
    for n in notifications:
        accident = db.query(Accident).filter(Accident.id == n.accident_id).first()
        results.append({
            "id": n.id,
            "accident_id": n.accident_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "status": n.status,
            "response_message": n.response_message,
            "distance_km": round(n.distance_km, 2) if n.distance_km else None,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
            "responded_at": n.responded_at.isoformat() if n.responded_at else None,
            "accident": {
                "id": accident.id,
                "location": accident.location,
                "latitude": accident.latitude,
                "longitude": accident.longitude,
                "description": accident.description,
                "severity": accident.severity,
                "status": accident.status,
                "injuries": accident.injuries,
                "vehicle_type": accident.vehicle_type,
                "reported_at": accident.reported_at.isoformat(),
            } if accident else None,
        })
    return results


@router.post("/{notification_id}/respond")
def respond_to_notification(
    notification_id: int,
    response: NotificationRespond,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept or reject a notification. If accepted, auto-decline all other
    pending notifications of the same type for the same accident."""
    if response.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'rejected'")

    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your notification")
    if notification.status != "pending":
        raise HTTPException(status_code=400, detail=f"Notification already {notification.status}")

    notification.status = response.status
    notification.response_message = response.message
    notification.responded_at = datetime.utcnow()

    # Auto-decline others of the same type for this accident when one accepts
    if response.status == "accepted":
        other_pending = (
            db.query(Notification)
            .filter(
                Notification.accident_id == notification.accident_id,
                Notification.type == notification.type,
                Notification.id != notification.id,
                Notification.status == "pending",
            )
            .all()
        )
        for other in other_pending:
            other.status = "auto_declined"
            other.response_message = f"Auto-declined: {current_user.name} ({current_user.organization}) accepted the dispatch."
            other.responded_at = datetime.utcnow()

        # Update accident status to acknowledged / in_progress
        accident = db.query(Accident).filter(Accident.id == notification.accident_id).first()
        if accident and accident.status == "reported":
            accident.status = "acknowledged"
            accident.acknowledged_at = datetime.utcnow()

    db.commit()
    return {"message": f"Notification {response.status}", "notification_id": notification_id}


@router.get("/accident/{accident_id}")
def get_accident_notifications(
    accident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all dispatch notifications for a specific accident (for admin/citizen who reported it)."""
    accident = db.query(Accident).filter(Accident.id == accident_id).first()
    if not accident:
        raise HTTPException(status_code=404, detail="Accident not found")

    # Only allow the reporter, admin, or responders assigned to this accident
    if current_user.role not in ("admin",) and accident.reporter_id != current_user.id:
        assigned = db.query(Notification).filter(
            Notification.accident_id == accident_id,
            Notification.user_id == current_user.id,
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Not authorized")

    notifications = (
        db.query(Notification)
        .filter(Notification.accident_id == accident_id)
        .order_by(Notification.type, Notification.status)
        .all()
    )

    results = []
    for n in notifications:
        responder = db.query(User).filter(User.id == n.user_id).first()
        results.append({
            "id": n.id,
            "type": n.type,
            "status": n.status,
            "response_message": n.response_message,
            "distance_km": round(n.distance_km, 2) if n.distance_km else None,
            "responded_at": n.responded_at.isoformat() if n.responded_at else None,
            "responder": {
                "name": responder.name,
                "organization": responder.organization,
                "phone": responder.phone,
            } if responder else None,
        })
    return results

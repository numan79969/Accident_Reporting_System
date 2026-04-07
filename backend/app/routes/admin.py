from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from app.database.database import get_db
from app.models.models import Report, Accident, User
from app.routes.auth import get_current_user
from typing import List, Optional

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ReportCreate(BaseModel):
    accident_id: int
    details: str
    action_taken: str

class ReportResponse(BaseModel):
    id: int
    accident_id: int
    admin_id: int
    details: str
    action_taken: str
    created_at: str


# ─── User Management Schemas ──────────────────────────────

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    organization: Optional[str] = None
    badge_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool
    created_at: str

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "citizen"
    organization: Optional[str] = None
    badge_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool = True

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    badge_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: Optional[bool] = None


def _require_admin(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ─── User Management Routes ──────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    users = db.query(User).order_by(User.id).all()
    return [
        UserOut(
            id=u.id, name=u.name, email=u.email, phone=u.phone,
            role=u.role, organization=u.organization,
            badge_number=u.badge_number, latitude=u.latitude,
            longitude=u.longitude, is_verified=u.is_verified,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]


@router.post("/users", response_model=UserOut)
def create_user(
    user: AdminUserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(
        name=user.name,
        email=user.email,
        password=pwd_context.hash(user.password),
        phone=user.phone,
        role=user.role,
        organization=user.organization,
        badge_number=user.badge_number,
        latitude=user.latitude,
        longitude=user.longitude,
        is_verified=user.is_verified,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return UserOut(
        id=db_user.id, name=db_user.name, email=db_user.email,
        phone=db_user.phone, role=db_user.role,
        organization=db_user.organization,
        badge_number=db_user.badge_number, latitude=db_user.latitude,
        longitude=db_user.longitude, is_verified=db_user.is_verified,
        created_at=db_user.created_at.isoformat(),
    )


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    updates: AdminUserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    data = updates.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["password"] = pwd_context.hash(data["password"])
    elif "password" in data:
        del data["password"]

    if "email" in data and data["email"] != db_user.email:
        if db.query(User).filter(User.email == data["email"]).first():
            raise HTTPException(status_code=400, detail="Email already in use")

    for key, value in data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return UserOut(
        id=db_user.id, name=db_user.name, email=db_user.email,
        phone=db_user.phone, role=db_user.role,
        organization=db_user.organization,
        badge_number=db_user.badge_number, latitude=db_user.latitude,
        longitude=db_user.longitude, is_verified=db_user.is_verified,
        created_at=db_user.created_at.isoformat(),
    )


# ─── Existing Report & Analytics Routes ──────────────────

@router.post("/reports", response_model=ReportResponse)
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    # Assuming admin user
    admin_id = 2  # Replace with actual auth
    db_report = Report(
        accident_id=report.accident_id,
        admin_id=admin_id,
        details=report.details,
        action_taken=report.action_taken
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return ReportResponse(
        id=db_report.id,
        accident_id=db_report.accident_id,
        admin_id=db_report.admin_id,
        details=db_report.details,
        action_taken=db_report.action_taken,
        created_at=db_report.created_at.isoformat()
    )

@router.get("/reports", response_model=List[ReportResponse])
def get_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).all()
    return [
        ReportResponse(
            id=r.id,
            accident_id=r.accident_id,
            admin_id=r.admin_id,
            details=r.details,
            action_taken=r.action_taken,
            created_at=r.created_at.isoformat()
        ) for r in reports
    ]

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    total_accidents = db.query(Accident).count()
    resolved = db.query(Accident).filter(Accident.status == "resolved").count()
    pending = db.query(Accident).filter(Accident.status == "reported").count()
    return {
        "total_accidents": total_accidents,
        "resolved": resolved,
        "pending": pending
    }
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import UserSession, User
from app.schemas.schemas import TelemetryEvent, SessionRecordingPayload
from app.services.storage_service import storage_service
from app.config import settings

router = APIRouter(prefix="/telemetry", tags=["Behavioral Telemetry"])

@router.post("/events")
def record_event(event: TelemetryEvent, db: Session = Depends(get_db)):
    # Lightweight telemetry event logging (e.g. 'tier_selected', 'irrigation_calculated')
    return {"status": "RECORDED", "timestamp": event.timestamp or datetime.utcnow()}

@router.post("/session-recording")
def record_session(payload: SessionRecordingPayload, db: Session = Depends(get_db)):
    user = db.query(User).first()
    
    sess = None
    if payload.session_id:
        sess = db.query(UserSession).filter(UserSession.id == payload.session_id).first()

    if not sess:
        sess = UserSession(
            user_id=user.id if user else None,
            started_at=datetime.utcnow()
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)

    if payload.abandoned_step:
        sess.abandoned_step = payload.abandoned_step

    # Store compressed/raw JSON rrweb events
    if payload.rrweb_events:
        storage_key = f"sessions/{sess.id}.json"
        data_bytes = json.dumps(payload.rrweb_events).encode("utf-8")
        path = storage_service.put_object(
            settings.STORAGE_BUCKET_REPLAYS,
            storage_key,
            data_bytes,
            content_type="application/json"
        )
        sess.rrweb_recording_path = path

    sess.ended_at = datetime.utcnow()
    db.commit()

    return {"status": "RECORDING_STORED", "session_id": sess.id}

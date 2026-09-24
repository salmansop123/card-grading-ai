import uuid
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)
settings = get_settings()


class CurrentUser:
    def __init__(self, id: uuid.UUID, email: str, full_name: Optional[str] = None):
        self.id = id
        self.email = email
        self.full_name = full_name


def decode_supabase_jwt(token: str) -> dict:
    secret = settings.supabase_jwt_secret or settings.secret_key
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": bool(settings.supabase_jwt_secret)},
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from exc


def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        if payload.get("type") == "local" and payload.get("sub"):
            return payload
    except JWTError:
        pass
    return decode_supabase_jwt(token)


def get_or_create_user(db: Session, user_id: uuid.UUID, email: str, full_name: Optional[str] = None) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user
    user = User(id=user_id, email=email, full_name=full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_jwt_token(credentials.credentials)
    sub = payload.get("sub")
    email = payload.get("email", "")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user_id = uuid.UUID(sub)

    if payload.get("type") == "local":
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return CurrentUser(id=user.id, email=user.email, full_name=user.full_name)

    metadata = payload.get("user_metadata", {})
    full_name = metadata.get("full_name") or metadata.get("name")
    get_or_create_user(db, user_id, email, full_name)
    return CurrentUser(id=user_id, email=email, full_name=full_name)

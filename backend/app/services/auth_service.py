import uuid

import bcrypt
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.schemas.auth import AuthTokenResponse, UserResponse

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_local_access_token(user: User) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "type": "local",
        },
        settings.secret_key,
        algorithm="HS256",
    )


def _to_token_response(user: User) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=create_local_access_token(user),
        user=UserResponse.model_validate(user),
    )


def register_user(db: Session, email: str, password: str, full_name: str | None = None) -> AuthTokenResponse:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_token_response(user)


def login_user(db: Session, email: str, password: str) -> AuthTokenResponse:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return _to_token_response(user)

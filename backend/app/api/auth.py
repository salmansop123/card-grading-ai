from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthMeResponse, AuthTokenResponse, LoginRequest, RegisterRequest, UserResponse
from app.services.auth_service import login_user, register_user
from app.utils.auth_utils import CurrentUser, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthTokenResponse)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, body.email, body.password, body.full_name)


@router.post("/login", response_model=AuthTokenResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, body.email, body.password)


@router.get("/me", response_model=AuthMeResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return AuthMeResponse(user=UserResponse.model_validate(user))

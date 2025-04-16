from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import crud
from app.api import deps

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(
    db: Session = Depends(deps.get_db),
    login_data: LoginRequest = Body(...)
):
    """
    Basic email/password login
    """
    user = crud.user.authenticate(
        db, email=login_data.email, password=login_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return {"message": "Login successful", "user_id": str(user.id)} 
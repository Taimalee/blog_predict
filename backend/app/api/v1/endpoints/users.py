from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app import crud
from pydantic import BaseModel

router = APIRouter()

class SignupRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(
    signup_data: SignupRequest = Body(...),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Create new user with email and password.
    """
    # Check if user with this email already exists
    user = crud.user.get_by_email(db, email=signup_data.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    # Create new user
    user = crud.user.create(db, email=signup_data.email, password=signup_data.password)
    return {"message": "User created successfully", "user_id": str(user.id)}

@router.post("/logout")
def logout() -> Any:
    """
    Logout current user.
    """
    return {"message": "Successfully logged out"} 
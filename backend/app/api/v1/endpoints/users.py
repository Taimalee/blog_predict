from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app import crud
from app.schemas.user import UserCreate

router = APIRouter()

@router.post("/signup")
def signup(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate = Body(...)
) -> Any:
    """
    Create new user with email and password.
    """
    # Check if user with this email already exists
    user = crud.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    # Create new user
    user = crud.user.create(db, obj_in=user_in)
    return {"message": "User created successfully", "user_id": str(user.id)}

@router.post("/logout")
def logout() -> Any:
    """
    Logout current user.
    """
    return {"message": "Successfully logged out"} 
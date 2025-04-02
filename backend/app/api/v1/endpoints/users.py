from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, schemas

router = APIRouter()

@router.post("/signup", response_model=schemas.User)
def signup(
    user_in: schemas.UserCreate,
    db: Session = Depends(deps.get_db)
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
    return user

@router.post("/login", response_model=schemas.User)
def login(
    user_in: schemas.UserCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Login with email and password.
    """
    user = crud.user.authenticate(
        db, email=user_in.email, password=user_in.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    return user

@router.post("/logout")
def logout() -> Any:
    """
    Logout current user.
    """
    return {"message": "Successfully logged out"} 
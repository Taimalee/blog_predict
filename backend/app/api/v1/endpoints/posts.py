from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from app import crud, schemas
from app.api import deps
from app.models.user import User
from app.models.post import Post

router = APIRouter()

class DraftPostCreate(BaseModel):
    user_id: UUID
    title: str = "Untitled Post"
    content: str = ""
    status: str = "draft"

@router.get("/drafts/{user_id}", response_model=List[schemas.Post])
def get_user_drafts(
    user_id: UUID,
    db: Session = Depends(deps.get_db),
    limit: int = 4
) -> Any:
    """
    Get all draft posts for a specific user.
    """
    drafts = db.query(Post).filter(
        Post.user_id == user_id,
        Post.status == 'draft'
    ).order_by(Post.created_at.desc()).limit(limit).all()
    return drafts

@router.post("/draft", response_model=schemas.Post)
def save_draft(
    *,
    db: Session = Depends(deps.get_db),
    post_in: schemas.PostCreate
) -> Any:
    """
    Save a new draft post.
    """
    try:
        # Create new draft post
        db_post = Post(
            user_id=post_in.user_id,
            title=post_in.title,
            content=post_in.content,
            status='draft'
        )
        db.add(db_post)
        db.commit()
        db.refresh(db_post)
        return db_post
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[schemas.Post])
def read_posts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve posts.
    """
    posts = crud.post.get_by_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )
    return posts

@router.post("/", response_model=schemas.Post)
def create_post(
    *,
    db: Session = Depends(deps.get_db),
    post_in: schemas.PostCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new post.
    """
    post = crud.post.create_with_owner(
        db=db, obj_in=post_in, owner_id=current_user.id
    )
    return post

@router.put("/{id}", response_model=schemas.Post)
def update_post(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    post_in: schemas.PostUpdate
) -> Any:
    """
    Update a post.
    """
    post = db.query(Post).filter(Post.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update post fields
    if hasattr(post_in, "title"):
        post.title = post_in.title
    if hasattr(post_in, "content"):
        post.content = post_in.content
    if hasattr(post_in, "status"):
        post.status = post_in.status
    
    db.commit()
    db.refresh(post)
    return post

@router.get("/{id}", response_model=schemas.Post)
def read_post(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
) -> Any:
    """
    Get post by ID.
    """
    post = db.query(Post).filter(Post.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.delete("/{id}", response_model=schemas.Post)
def delete_post(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a post.
    """
    post = crud.post.get(db=db, id=id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not post.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    post = crud.post.remove(db=db, id=id)
    return post 
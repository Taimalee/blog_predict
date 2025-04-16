from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime

from app import crud
from app.api import deps
from app.models.post import Post

router = APIRouter()

class PostCreate(BaseModel):
    user_id: UUID
    title: str
    content: str
    status: str = "draft"

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

@router.get("/drafts/{user_id}")
def get_user_drafts(
    user_id: UUID,
    db: Session = Depends(deps.get_db),
    limit: int = 4
) -> List[dict]:
    """
    Get most recent draft posts for a specific user.
    Limited to 4 posts for the Recent Drafts section.
    """
    drafts = db.query(Post).filter(
        Post.user_id == user_id,
        Post.status == 'draft'
    ).order_by(Post.created_at.desc()).limit(limit).all()
    return [{
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    } for post in drafts]

@router.get("/stats/{user_id}")
def get_user_stats(
    user_id: UUID,
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Get user's writing stats including total words, drafts count, and published count.
    """
    # Get all user's posts
    posts = db.query(Post).filter(Post.user_id == user_id).all()
    
    # Calculate stats
    drafts = sum(1 for post in posts if post.status == 'draft')
    published = sum(1 for post in posts if post.status == 'published')
    total_words = sum(len(post.content.split()) for post in posts)
    
    return {
        "total_words": total_words,
        "drafts_count": drafts,
        "published_count": published
    }

@router.post("/draft")
def save_draft(
    post_data: PostCreate = Body(...),
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Save a new draft post.
    """
    post = crud.post.create(db, obj_in=post_data)
    return {
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    }

@router.get("/")
def read_posts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100
) -> List[dict]:
    """
    Retrieve posts.
    """
    posts = crud.post.get_multi(db, skip=skip, limit=limit)
    return [{
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    } for post in posts]

@router.post("/")
def create_post(
    post_data: PostCreate = Body(...),
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Create new post.
    """
    post = crud.post.create(db, obj_in=post_data)
    return {
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    }

@router.put("/{id}")
def update_post(
    id: UUID,
    post_data: PostUpdate = Body(...),
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Update a post.
    """
    post = crud.post.get(db, id=id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post = crud.post.update(db, db_obj=post, obj_in=post_data)
    return {
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    }

@router.get("/{id}")
def read_post(
    id: int,
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Get a single post by ID.
    """
    post = crud.post.get(db, id=id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "status": post.status,
        "created_at": post.created_at.isoformat()
    }

@router.delete("/{id}")
def delete_post(
    id: UUID,
    db: Session = Depends(deps.get_db)
) -> dict:
    """
    Delete a post.
    """
    post = crud.post.get(db, id=id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    crud.post.remove(db, id=id)
    return {"message": "Post deleted successfully"} 
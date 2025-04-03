from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.user import User
from app.models.post import Post
from app.schemas.schemas import UserCreate, User as UserSchema, PostCreate, Post as PostSchema, PostList

router = APIRouter()

@router.post("/create-user", response_model=UserSchema)
def create_user(db: Session = Depends(deps.get_db)):
    """
    Create a new user with a generated UUID.
    No input required - just generates a new user with a unique ID.
    """
    # Create new user
    db_user = User()
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/posts", response_model=PostSchema)
def create_post(post: PostCreate, db: Session = Depends(deps.get_db)):
    """
    Create a new post for a specific user.
    Requires user_id and content in the request body.
    """
    # Check if user exists
    user = db.query(User).filter(User.id == post.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create new post
    db_post = Post(
        user_id=post.user_id,
        content=post.content
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.get("/posts", response_model=PostList)
def get_user_posts(user_id: UUID, db: Session = Depends(deps.get_db)):
    """
    Get all posts for a specific user.
    Requires user_id as a query parameter.
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's posts
    posts = db.query(Post).filter(Post.user_id == user_id).all()
    return {"posts": posts}

@router.delete("/posts/{post_id}", response_model=PostSchema)
def delete_post(post_id: int, db: Session = Depends(deps.get_db)):
    """
    Delete a post by ID.
    """
    # Get the post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Delete the post
    db.delete(post)
    db.commit()
    return post 
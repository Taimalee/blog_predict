from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# User schemas
class UserBase(BaseModel):
    pass

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# Post schemas
class PostBase(BaseModel):
    title: str = "Untitled Post"
    content: str
    status: str = "draft"

class PostCreate(PostBase):
    user_id: UUID

class Post(PostBase):
    id: int
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PostList(BaseModel):
    posts: List[Post] 
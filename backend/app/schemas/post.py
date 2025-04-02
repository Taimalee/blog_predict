from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class PostBase(BaseModel):
    title: str = "Untitled Post"
    content: str
    status: str = "draft"

class PostCreate(PostBase):
    user_id: UUID

class PostUpdate(PostBase):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

class PostInDBBase(PostBase):
    id: int
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Post(PostInDBBase):
    pass

class PostInDB(PostInDBBase):
    pass 
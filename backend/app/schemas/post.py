from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class PostBase(BaseModel):
    content: str
    status: str = "draft"

class PostCreate(PostBase):
    pass

class PostUpdate(PostBase):
    content: Optional[str] = None
    status: Optional[str] = None

class PostInDBBase(PostBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Post(PostInDBBase):
    pass

class PostInDB(PostInDBBase):
    pass 
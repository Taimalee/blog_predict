from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import uuid

class SuggestionStats(Base):
    __tablename__ = "suggestion_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    shown_count = Column(Integer, default=0)
    accepted_count = Column(Integer, default=0)

    # Relationship with User model
    user = relationship("User", back_populates="suggestion_stats") 
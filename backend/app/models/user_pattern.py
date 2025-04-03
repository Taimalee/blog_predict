from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime
import uuid

class UserPattern(Base):
    __tablename__ = "user_patterns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    pattern_type = Column(Text, nullable=False)  # word_frequencies, phrase_preferences, writing_style_metrics
    pattern = Column(Text, nullable=False)  # The actual pattern data as JSON string
    frequency = Column(Integer, default=0)
    last_used = Column(DateTime, default=datetime.utcnow)

    # Relationship with User model
    user = relationship("User", back_populates="patterns") 
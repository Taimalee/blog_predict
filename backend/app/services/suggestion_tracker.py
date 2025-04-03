from typing import Dict
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.suggestion_stats import SuggestionStats

class SuggestionTrackerService:
    def __init__(self):
        self.db: Session = SessionLocal()

    def track_shown(self, user_id: str, count: int) -> None:
        """Track the number of suggestions shown to a user."""
        stats = self._get_or_create_stats(user_id)
        stats.shown_count += count
        self.db.commit()

    def track_accepted(self, user_id: str) -> None:
        """Track when a user accepts a suggestion."""
        stats = self._get_or_create_stats(user_id)
        stats.accepted_count += 1
        self.db.commit()

    def get_stats(self, user_id: str) -> Dict:
        """Get suggestion statistics for a user."""
        stats = self._get_or_create_stats(user_id)
        return {
            "shownCount": stats.shown_count,
            "acceptedCount": stats.accepted_count,
            "acceptanceRate": stats.accepted_count / stats.shown_count if stats.shown_count > 0 else 0
        }

    def _get_or_create_stats(self, user_id: str) -> SuggestionStats:
        """Get or create suggestion stats for a user."""
        stats = self.db.query(SuggestionStats).filter(
            SuggestionStats.user_id == user_id
        ).first()

        if not stats:
            stats = SuggestionStats(
                user_id=user_id,
                shown_count=0,
                accepted_count=0
            )
            self.db.add(stats)
            self.db.commit()

        return stats 
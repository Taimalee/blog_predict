"""add_suggestion_stats

Revision ID: 6dbe9f53a7c2
Revises: 403484428f6a
Create Date: 2024-03-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6dbe9f53a7c2'
down_revision: Union[str, None] = '403484428f6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create suggestion_stats table
    op.create_table(
        'suggestion_stats',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('shown_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('accepted_count', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop suggestion_stats table
    op.drop_table('suggestion_stats')

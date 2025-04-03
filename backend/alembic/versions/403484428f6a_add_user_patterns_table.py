"""add user patterns table

Revision ID: 403484428f6a
Revises: 46abcaf47a19
Create Date: 2025-04-02 19:19:14.282550

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

# revision identifiers, used by Alembic.
revision: str = '403484428f6a'
down_revision: Union[str, None] = '46abcaf47a19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user_patterns table
    op.create_table(
        'user_patterns',
        sa.Column('id', UUID(), nullable=False),
        sa.Column('user_id', UUID(), nullable=False),
        sa.Column('pattern_type', sa.Text(), nullable=False),
        sa.Column('pattern', sa.Text(), nullable=False),
        sa.Column('frequency', sa.Integer(), nullable=True),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Update existing users with unique default values if needed
    op.execute("""
        UPDATE users 
        SET email = CONCAT('default_', id, '@example.com') 
        WHERE email IS NULL
    """)
    op.execute("""
        UPDATE users 
        SET password_hash = CONCAT('default_hash_', id) 
        WHERE password_hash IS NULL
    """)

    # Now make the columns NOT NULL
    op.alter_column('users', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('posts', 'content',
               existing_type=sa.TEXT(),
               type_=sa.String(),
               existing_nullable=False)


def downgrade() -> None:
    # Drop user_patterns table
    op.drop_table('user_patterns')

    # Revert column changes
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('users', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('posts', 'content',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=False)

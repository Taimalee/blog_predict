"""change_post_id_to_integer

Revision ID: de0c922aec58
Revises: 545d9a74eeb0
Create Date: 2024-03-21 13:45:23.456789

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'de0c922aec58'
down_revision: Union[str, None] = '545d9a74eeb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a temporary table with the new structure
    op.create_table(
        'posts_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False, server_default='Untitled Post'),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('status', sa.String(20), server_default='draft', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Copy data from old table to new table, handling null titles
    op.execute('''
        INSERT INTO posts_new (user_id, title, content, status, created_at, updated_at)
        SELECT user_id, 
               COALESCE(title, 'Untitled Post'),
               content,
               status,
               created_at,
               updated_at
        FROM posts
    ''')
    
    # Drop the old table
    op.drop_table('posts')
    
    # Rename the new table to posts
    op.rename_table('posts_new', 'posts')


def downgrade() -> None:
    # Create a temporary table with the old structure
    op.create_table(
        'posts_old',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False, server_default='Untitled Post'),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('status', sa.String(20), server_default='draft', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Copy data from new table to old table
    op.execute('''
        INSERT INTO posts_old (id, user_id, title, content, status, created_at, updated_at)
        SELECT gen_random_uuid(), user_id, title, content, status, created_at, updated_at
        FROM posts
    ''')
    
    # Drop the new table
    op.drop_table('posts')
    
    # Rename the old table to posts
    op.rename_table('posts_old', 'posts')

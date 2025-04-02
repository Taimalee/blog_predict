"""fix_post_id_type

Revision ID: 46abcaf47a19
Revises: de0c922aec58
Create Date: 2024-03-21 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '46abcaf47a19'
down_revision: Union[str, None] = 'de0c922aec58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a new sequence for the ID
    op.execute('CREATE SEQUENCE IF NOT EXISTS posts_id_seq')
    
    # Create a temporary table with the new structure
    op.execute('''
        CREATE TABLE posts_new (
            id INTEGER PRIMARY KEY DEFAULT nextval('posts_id_seq'),
            user_id UUID NOT NULL REFERENCES users(id),
            title VARCHAR(255) NOT NULL DEFAULT 'Untitled Post',
            content TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'draft',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Copy data from old table to new table
    op.execute('''
        INSERT INTO posts_new (user_id, title, content, status, created_at, updated_at)
        SELECT user_id, title, content, status, created_at, updated_at
        FROM posts
    ''')
    
    # Drop the old table and rename the new one
    op.execute('DROP TABLE posts')
    op.execute('ALTER TABLE posts_new RENAME TO posts')
    
    # Set the sequence to the next available value
    op.execute('''
        SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 0) + 1, false)
    ''')


def downgrade() -> None:
    # Create a temporary table with UUID id
    op.execute('''
        CREATE TABLE posts_old (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            title VARCHAR(255) NOT NULL DEFAULT 'Untitled Post',
            content TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'draft',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Copy data from integer id table to UUID table
    op.execute('''
        INSERT INTO posts_old (user_id, title, content, status, created_at, updated_at)
        SELECT user_id, title, content, status, created_at, updated_at
        FROM posts
    ''')
    
    # Drop the integer id table and rename UUID table
    op.execute('DROP TABLE posts')
    op.execute('ALTER TABLE posts_old RENAME TO posts')
    
    # Drop the sequence we created
    op.execute('DROP SEQUENCE IF EXISTS posts_id_seq')

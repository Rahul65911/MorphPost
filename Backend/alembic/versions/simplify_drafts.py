"""Remove unused columns from drafts table

Revision ID: simplify_drafts
Revises: 
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'simplify_drafts'
down_revision = '400733332b58'  # Initial schema migration
branch_labels = None
depends_on = None


def upgrade():
    # Drop index first (references is_active column)
    op.drop_index('ix_draft_active', table_name='drafts')
    
    # Remove unused columns from drafts table
    op.drop_column('drafts', 'based_on_id')
    op.drop_column('drafts', 'is_active')


def downgrade():
    # Add columns back if needed to rollback
    op.add_column('drafts', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('drafts', sa.Column('based_on_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Recreate index
    op.create_index('ix_draft_active', 'drafts', ['workflow_id', 'platform', 'is_active'])

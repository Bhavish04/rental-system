"""deal_flow

Revision ID: f01ee5359200
Revises: 
Create Date: 2026-04-22 09:31:17.008492

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'f01ee5359200'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    """)
    op.create_table('property_interests',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('property_id', UUID(as_uuid=True), sa.ForeignKey('properties.id'), nullable=False),
        sa.Column('buyer_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('property_id', 'buyer_id')
    )
    op.create_table('property_transactions',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('property_id', UUID(as_uuid=True), sa.ForeignKey('properties.id'), nullable=False),
        sa.Column('buyer_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('owner_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), server_default='requested'),
        sa.Column('offer_price', sa.Numeric(12, 2)),
        sa.Column('razorpay_order_id', sa.String(100)),
        sa.Column('razorpay_payment_id', sa.String(100)),
        sa.Column('contract_path', sa.String(255)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('property_transactions')
    op.drop_table('property_interests')
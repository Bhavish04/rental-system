import razorpay
import os

from app.core.config import get_settings
_settings = get_settings()
client = razorpay.Client(auth=(_settings.RAZORPAY_KEY_ID, _settings.RAZORPAY_KEY_SECRET))

def create_order(amount_inr: float, transaction_id: int) -> dict:
    order = client.order.create({
        "amount": int(amount_inr * 100),
        "currency": "INR",
        "receipt": f"txn_{transaction_id}",
        "notes": {"transaction_id": transaction_id}
    })
    return order

def verify_payment(razorpay_order_id: str, razorpay_payment_id: str,
                   razorpay_signature: str) -> bool:
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })
        return True
    except Exception:
        return False
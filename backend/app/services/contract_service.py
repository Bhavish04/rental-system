from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime
import os

CONTRACTS_DIR = "contracts"
os.makedirs(CONTRACTS_DIR, exist_ok=True)

def generate_contract(transaction_id: int, buyer_name: str, owner_name: str,
                      property_title: str, property_address: str, price: float) -> str:
    filename = f"{CONTRACTS_DIR}/contract_{transaction_id}.pdf"
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20,
                                  spaceAfter=20, textColor=colors.HexColor('#1a365d'))
    body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=11,
                           leading=18, spaceAfter=10)

    date_str = datetime.now().strftime("%B %d, %Y")
    elements = [
        Paragraph("PROPERTY SALE AGREEMENT", title_style),
        Paragraph(f"Contract Date: {date_str}", body),
        Spacer(1, 0.5*cm),
        Paragraph("PARTIES", styles['Heading2']),
        Paragraph(f"<b>Seller (Owner):</b> {owner_name}", body),
        Paragraph(f"<b>Buyer:</b> {buyer_name}", body),
        Spacer(1, 0.3*cm),
        Paragraph("PROPERTY DETAILS", styles['Heading2']),
        Paragraph(f"<b>Property:</b> {property_title}", body),
        Paragraph(f"<b>Address:</b> {property_address}", body),
        Spacer(1, 0.3*cm),
        Paragraph("TRANSACTION DETAILS", styles['Heading2']),
    ]

    table_data = [
        ["Description", "Amount"],
        ["Agreed Sale Price", f"Rs. {price:,.2f}"],
        ["Transaction ID", f"TXN-{transaction_id:06d}"],
        ["Payment Status", "Completed"],
    ]
    table = Table(table_data, colWidths=[10*cm, 6*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 11),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f7fafc')]),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(table)
    elements += [
        Spacer(1, 1*cm),
        Paragraph("TERMS & CONDITIONS", styles['Heading2']),
        Paragraph("1. The buyer agrees to purchase the above property at the agreed price.", body),
        Paragraph("2. The seller confirms clear title and ownership of the property.", body),
        Paragraph("3. This agreement is binding upon payment confirmation.", body),
        Paragraph("4. Possession will be transferred within 30 days of payment.", body),
        Spacer(1, 1.5*cm),
        Paragraph("_______________________________          _______________________________", body),
        Paragraph(f"Buyer: {buyer_name}                            Seller: {owner_name}", body),
    ]

    doc.build(elements)
    return filename
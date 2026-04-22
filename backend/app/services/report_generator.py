from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.space_object import SpaceObject
from app.models.anomaly_alert import AnomalyAlert
from app.models.conjunction import ConjunctionEvent

class ReportGenerator:
    """Service to generate mission and anomaly reports in PDF format."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_mission_report(self, object_id: int) -> BytesIO:
        """Generate a comprehensive mission health report for a spacecraft."""
        # 1. Fetch Object Data
        res = await self.db.execute(select(SpaceObject).where(SpaceObject.object_id == object_id))
        obj = res.scalar_one_or_none()
        if not obj:
            raise ValueError("Space object not found")

        # 2. Fetch Stats
        alert_count = await self.db.execute(
            select(func.count()).select_from(AnomalyAlert).where(AnomalyAlert.object_id == object_id)
        )
        conj_count = await self.db.execute(
            select(func.count()).select_from(ConjunctionEvent).where(
                (ConjunctionEvent.primary_object_id == object_id) | (ConjunctionEvent.secondary_object_id == object_id)
            )
        )

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.hexColor("#1e3a8a")
        )
        elements.append(Paragraph(f"Mission Health Report: {obj.name}", title_style))
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Spacecraft Details Table
        elements.append(Paragraph("Spacecraft Specifications", styles['Heading2']))
        data = [
            ["NORAD ID", str(obj.norad_id or "N/A")],
            ["COSPAR ID", obj.cospar_id or "N/A"],
            ["Operator", obj.operator or "N/A"],
            ["Orbit Class", obj.orbit_class or "N/A"],
            ["Status", obj.status or "UNKNOWN"],
            ["Launch Date", str(obj.launch_date or "N/A")]
        ]
        t = Table(data, colWidths=[150, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))

        # Operational Summary
        elements.append(Paragraph("Operational Summary", styles['Heading2']))
        summary_text = (
            f"The spacecraft <b>{obj.name}</b> currently has a status of <b>{obj.status}</b>. "
            f"A total of <b>{alert_count.scalar_one()}</b> anomaly alerts have been recorded. "
            f"The system has identified <b>{conj_count.scalar_one()}</b> historical close-approach (conjunction) events."
        )
        elements.append(Paragraph(summary_text, styles['Normal']))
        elements.append(Spacer(1, 20))

        # Disclaimer
        elements.append(Spacer(1, 40))
        disclaimer = "CONFIDENTIAL: This report is generated automatically by the ORBITA-ATSAD platform for operational assessment purposes only."
        elements.append(Paragraph(disclaimer, ParagraphStyle('Disc', fontSize=8, textColor=colors.grey)))

        doc.build(elements)
        buffer.seek(0)
        return buffer

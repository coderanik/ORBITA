from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.space_object import SpaceObject
from app.models.anomaly_alert import AnomalyAlert
from app.models.conjunction import ConjunctionEvent
from app.models.mission_report import MissionReportLog

class ReportGenerator:
    """Service to generate mission and anomaly reports in PDF format."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_mission_report(self, object_id: int, generated_by_user_id: int | None = None) -> BytesIO:
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
        recent_alerts_res = await self.db.execute(
            select(AnomalyAlert)
            .where(AnomalyAlert.object_id == object_id)
            .order_by(AnomalyAlert.detected_at.desc())
            .limit(8)
        )
        recent_alerts = recent_alerts_res.scalars().all()
        recent_conj_res = await self.db.execute(
            select(ConjunctionEvent)
            .where(or_(ConjunctionEvent.primary_object_id == object_id, ConjunctionEvent.secondary_object_id == object_id))
            .order_by(ConjunctionEvent.time_of_closest_approach.desc())
            .limit(5)
        )
        recent_conjunctions = recent_conj_res.scalars().all()

        alert_count_value = alert_count.scalar_one()
        conj_count_value = conj_count.scalar_one()
        severity_breakdown = {
            "critical": sum(1 for a in recent_alerts if (a.severity or "").upper() == "CRITICAL"),
            "warning": sum(1 for a in recent_alerts if (a.severity or "").upper() == "WARNING"),
            "info": sum(1 for a in recent_alerts if (a.severity or "").upper() == "INFO"),
        }

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
            textColor=colors.HexColor("#1e3a8a")
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
            f"A total of <b>{alert_count_value}</b> anomaly alerts have been recorded. "
            f"The system has identified <b>{conj_count_value}</b> historical close-approach (conjunction) events."
        )
        elements.append(Paragraph(summary_text, styles['Normal']))
        elements.append(Spacer(1, 20))

        # Recent anomaly detail
        elements.append(Paragraph("Recent Anomaly Alerts", styles['Heading2']))
        if recent_alerts:
            alert_data = [["Detected At", "Subsystem", "Type", "Severity", "Ack"]]
            for row in recent_alerts:
                alert_data.append([
                    row.detected_at.strftime("%Y-%m-%d %H:%M"),
                    row.subsystem,
                    row.anomaly_type,
                    row.severity,
                    "Yes" if row.is_acknowledged else "No",
                ])
            alerts_table = Table(alert_data, colWidths=[120, 90, 90, 70, 40])
            alerts_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(alerts_table)
        else:
            elements.append(Paragraph("No anomaly alerts found for this object.", styles['Normal']))
        elements.append(Spacer(1, 16))

        # Conjunction snapshot
        elements.append(Paragraph("Recent Conjunction Snapshot", styles['Heading2']))
        if recent_conjunctions:
            conj_data = [["TCA", "Miss Dist (km)", "Risk", "Status"]]
            for row in recent_conjunctions:
                conj_data.append([
                    row.time_of_closest_approach.strftime("%Y-%m-%d %H:%M"),
                    f"{(row.miss_distance_km or 0):.3f}",
                    row.risk_level or "LOW",
                    row.status or "PENDING",
                ])
            conj_table = Table(conj_data, colWidths=[130, 110, 80, 90])
            conj_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(conj_table)
        else:
            elements.append(Paragraph("No conjunction events found for this object.", styles['Normal']))
        elements.append(Spacer(1, 16))

        # Disclaimer
        elements.append(Spacer(1, 40))
        disclaimer = "CONFIDENTIAL: This report is generated automatically by the ORBITA-ATSAD platform for operational assessment purposes only."
        elements.append(Paragraph(disclaimer, ParagraphStyle('Disc', fontSize=8, textColor=colors.grey)))

        doc.build(elements)
        buffer.seek(0)

        # Persist a detailed generation log for auditability.
        file_name = f"mission_report_{object_id}.pdf"
        details = {
            "object_name": obj.name,
            "severity_breakdown_recent": severity_breakdown,
            "recent_alert_count_included": len(recent_alerts),
            "recent_conjunction_count_included": len(recent_conjunctions),
            "generated_at_utc": datetime.utcnow().isoformat() + "Z",
        }
        report_log = MissionReportLog(
            object_id=object_id,
            generated_by_user_id=generated_by_user_id,
            report_type="MISSION_CDM",
            file_name=file_name,
            file_size_bytes=len(buffer.getvalue()),
            alert_count=alert_count_value,
            conjunction_count=conj_count_value,
            details=details,
        )
        self.db.add(report_log)
        await self.db.flush()

        return buffer

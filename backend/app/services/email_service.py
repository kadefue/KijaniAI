"""
KijaniAI Email Notification Service
====================================
Sends HTML email alerts via SMTP relay (smtp-relay.gmail.com / suanet.ac.tz).

Configuration is read from environment variables (see .env):
  SMTP_HOST     = smtp-relay.gmail.com
  SMTP_PORT     = 587
  SMTP_USER     = noreply@suanet.ac.tz
  SMTP_PASSWORD = <app password>
  SMTP_CRYPTO   = tls

Templates (HTML):
  - MabadilikoAI job completion (bilingual Swahili + English)
  - Imagery order completion
  - MRV certificate ready
  - Generic platform alert
"""

import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, Dict, Any

from app.config import settings

logger = logging.getLogger("kijani.email")


# ---------------------------------------------------------------------------
# Core SMTP delivery
# ---------------------------------------------------------------------------

def _send_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """
    Delivers an HTML email via TLS SMTP.
    Returns True on success, False on any failure (non-raising).
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"]      = to_email

        msg.attach(MIMEText(html_body, "html", settings.SMTP_CHARSET))

        crypto = settings.SMTP_CRYPTO.lower()

        if crypto == "ssl":
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        else:
            # TLS (STARTTLS) — default for port 587
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                if crypto == "tls":
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                if settings.SMTP_USER:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"[EmailService] Sent '{subject}' to {to_email}")
        return True

    except Exception as exc:
        logger.error(f"[EmailService] FAILED to send '{subject}' to {to_email}: {exc}")
        return False


# ---------------------------------------------------------------------------
# HTML Template Helpers
# ---------------------------------------------------------------------------

def _base_html(title: str, body_content: str) -> str:
    """Wraps body_content in a premium KijaniAI branded HTML email shell."""
    year = datetime.utcnow().year
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{title}</title>
  <style>
    body{{font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;margin:0;padding:0;color:#e2e8f0}}
    .wrapper{{max-width:620px;margin:0 auto;padding:24px 16px}}
    .card{{background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.4)}}
    .header{{background:linear-gradient(135deg,#059669 0%,#0284c7 100%);padding:32px 28px;text-align:center}}
    .header h1{{margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.3px}}
    .header p{{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8)}}
    .body{{padding:28px}}
    .metric-row{{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}}
    .metric{{flex:1;min-width:120px;background:#0f172a;border-radius:10px;padding:14px 16px;text-align:center}}
    .metric .val{{font-size:24px;font-weight:700;color:#34d399}}
    .metric .lbl{{font-size:11px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}}
    .badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}}
    .badge-green{{background:#052e16;color:#34d399;border:1px solid #34d399}}
    .badge-blue{{background:#0c1a2e;color:#38bdf8;border:1px solid #38bdf8}}
    .badge-red{{background:#2d0a0a;color:#f87171;border:1px solid #f87171}}
    .btn{{display:block;width:fit-content;margin:24px auto 0;padding:13px 32px;
          background:linear-gradient(135deg,#059669,#0284c7);color:#fff;text-decoration:none;
          border-radius:10px;font-weight:600;font-size:15px;text-align:center}}
    .divider{{border:none;border-top:1px solid #334155;margin:24px 0}}
    .sw{{background:#0f172a;border-radius:10px;padding:16px;margin-top:16px;font-size:13px;color:#94a3b8;font-style:italic}}
    .footer{{padding:20px 28px;text-align:center;font-size:11px;color:#475569}}
    h2{{font-size:17px;font-weight:600;color:#f1f5f9;margin:0 0 8px}}
    p{{font-size:14px;line-height:1.7;color:#cbd5e1;margin:0 0 12px}}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🌿 KijaniAI Platform</h1>
      <p>Earth Observation &amp; AI Land Intelligence &middot; Tanzania</p>
    </div>
    <div class="body">
      {body_content}
    </div>
    <div class="footer">
      KijaniAI &middot; Powered by Sentinel-2, GEE &amp; DeepForest AI &nbsp;|&nbsp;
      <a href="https://kijani.ai" style="color:#38bdf8">kijani.ai</a><br/>
      &copy; {year} KijaniAI &middot; Automated notification. Do not reply.
    </div>
  </div>
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Notification: MabadilikoAI Job Completed
# ---------------------------------------------------------------------------

def send_mabadiliko_completion_email(
    to_email: str,
    job_id: str,
    boundary_name: str,
    years: int,
    interval: str,
    net_changes: Dict[str, Any],
    ai_summary_en: str,
    ai_summary_sw: str,
    dashboard_url: Optional[str] = None
) -> bool:
    """
    Sends a bilingual (English + Swahili) completion email for a MabadilikoAI
    land cover change analysis job.
    """
    url = dashboard_url or f"https://kijani.ai/mabadiliko/{job_id}"

    veg  = net_changes.get("vegetation_forest", {})
    wat  = net_changes.get("water_sources", {})
    blt  = net_changes.get("built_up_structures", {})
    bare = net_changes.get("bare_soil", {})

    def delta_badge(delta_ha: float) -> str:
        if delta_ha > 0:
            return f'<span class="badge badge-green">&#9650; +{delta_ha:,.1f} ha</span>'
        elif delta_ha < 0:
            return f'<span class="badge badge-red">&#9660; {delta_ha:,.1f} ha</span>'
        return f'<span class="badge badge-blue">&#8594; 0 ha</span>'

    body = f"""
<h2>&#128225; MabadilikoAI Analysis Complete</h2>
<p>Your <strong>{years}-year</strong> ({interval}) land cover change analysis for
<strong>{boundary_name}</strong> has finished processing.</p>

<div class="metric-row">
  <div class="metric">
    <div class="val">&#127795;</div>
    <div class="lbl">Vegetation &amp; Forest</div>
    <div style="margin-top:6px">{delta_badge(veg.get("delta_ha", 0))}</div>
  </div>
  <div class="metric">
    <div class="val">&#128167;</div>
    <div class="lbl">Water Sources</div>
    <div style="margin-top:6px">{delta_badge(wat.get("delta_ha", 0))}</div>
  </div>
  <div class="metric">
    <div class="val">&#127968;</div>
    <div class="lbl">Built-Up Structures</div>
    <div style="margin-top:6px">{delta_badge(blt.get("delta_ha", 0))}</div>
  </div>
  <div class="metric">
    <div class="val">&#127964;</div>
    <div class="lbl">Bare Soil</div>
    <div style="margin-top:6px">{delta_badge(bare.get("delta_ha", 0))}</div>
  </div>
</div>

<hr class="divider"/>

<h2>&#129302; AI Analysis Summary</h2>
<p>{ai_summary_en}</p>

<div class="sw">
  <strong>Kiswahili:</strong><br/>
  {ai_summary_sw}
</div>

<a class="btn" href="{url}">
  &#128506; View Full Report &amp; Maps &#8594;
</a>

<hr class="divider"/>
<p style="font-size:12px;color:#475569">
  Job ID: <code style="color:#38bdf8">{job_id}</code> &nbsp;|&nbsp;
  Analysis window: {years} years &nbsp;|&nbsp; Interval: {interval}
</p>
"""
    subject = f"MabadilikoAI: Change Analysis Ready - {boundary_name}"
    return _send_smtp(to_email, subject, _base_html(subject, body))


# ---------------------------------------------------------------------------
# Notification: Imagery Order Completed
# ---------------------------------------------------------------------------

def send_imagery_order_completion_email(
    to_email: str,
    order_id: str,
    parcel_name: str,
    total_trees: int,
    tco2e: float,
    dashboard_url: Optional[str] = None
) -> bool:
    """Notifies user that an asynchronous imagery order has completed."""
    url = dashboard_url or f"https://kijani.ai/orders/{order_id}"
    body = f"""
<h2>&#128752; Imagery Analysis Complete</h2>
<p>Satellite analysis for parcel <strong>{parcel_name}</strong> has finished.</p>

<div class="metric-row">
  <div class="metric">
    <div class="val" style="color:#34d399">{total_trees:,}</div>
    <div class="lbl">Trees Detected</div>
  </div>
  <div class="metric">
    <div class="val" style="color:#38bdf8">{tco2e:,.1f}</div>
    <div class="lbl">tCO&#8322;e Sequestered</div>
  </div>
</div>

<a class="btn" href="{url}">View Parcel Dashboard &#8594;</a>

<p style="margin-top:16px;font-size:12px;color:#475569">
  Order ID: <code style="color:#38bdf8">{order_id}</code>
</p>
"""
    subject = f"KijaniAI: Imagery Analysis Ready - {parcel_name}"
    return _send_smtp(to_email, subject, _base_html(subject, body))


# ---------------------------------------------------------------------------
# Notification: MRV Certificate Ready
# ---------------------------------------------------------------------------

def send_mrv_certificate_email(
    to_email: str,
    parcel_name: str,
    certificate_number: str,
    tco2e: float,
    verify_url: str
) -> bool:
    """Notifies user that their cryptographic MRV carbon certificate is ready."""
    body = f"""
<h2>&#127942; Carbon MRV Certificate Issued</h2>
<p>A verified carbon MRV dossier has been generated for <strong>{parcel_name}</strong>.</p>

<div class="metric-row">
  <div class="metric">
    <div class="val" style="color:#fbbf24">{tco2e:,.1f}</div>
    <div class="lbl">Net tCO&#8322;e Tradable</div>
  </div>
  <div class="metric">
    <div class="val" style="font-size:14px;color:#a78bfa">{certificate_number}</div>
    <div class="lbl">Certificate No.</div>
  </div>
</div>

<a class="btn" href="{verify_url}">&#128271; Verify Certificate &#8594;</a>
"""
    subject = f"KijaniAI MRV Certificate Ready - {certificate_number}"
    return _send_smtp(to_email, subject, _base_html(subject, body))


# ---------------------------------------------------------------------------
# Generic Alert
# ---------------------------------------------------------------------------

def send_generic_alert(to_email: str, subject: str, message_html: str) -> bool:
    """Sends a plain generic platform alert with KijaniAI branding."""
    body = f"<h2>{subject}</h2><p>{message_html}</p>"
    return _send_smtp(to_email, subject, _base_html(subject, body))

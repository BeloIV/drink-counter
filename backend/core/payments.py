"""Pay by Square: an HTML page with a QR code that pays a person's open debt."""
import base64
from io import BytesIO

import qrcode
from django.utils.html import escape
from qrcode.constants import ERROR_CORRECT_M
from qrcode.image.pil import PilImage

CURRENCY = "EUR"

PAYMENT_PAGE_TEMPLATE = """
<html>
  <head><title>Pay by Square</title></head>
  <body style="font-family: sans-serif; text-align: center;">
    <h2>Platba dlhu</h2>
    <img src="data:image/png;base64,{qr_png}" alt="QR kód" /><br/><br/>
    <table style="margin: 0 auto; text-align: left;">
      <tr><td><b>IBAN:</b></td><td>{iban}</td></tr>
      <tr><td><b>Suma:</b></td><td>{debt:.2f} EUR</td></tr>
      <tr><td><b>Variabilný symbol:</b></td><td>{variable_symbol}</td></tr>
      <tr><td><b>Správa pre prijímateľa:</b></td><td>{message}</td></tr>
    </table>
  </body>
</html>
"""


def build_spd_payload(account, amount, variable_symbol, message):
    """Build a Short Payment Descriptor, the QR payment format Slovak and Czech banks read."""
    single_line_message = " ".join(str(message).split())
    return (
        f"SPD*1.0*ACC:{account}*AM:{amount:.2f}*CC:{CURRENCY}"
        f"*X-VS:{variable_symbol}*MSG:{single_line_message}"
    )


def qr_png_base64(data):
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    buffer = BytesIO()
    qr.make_image(image_factory=PilImage).save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def render_payment_page(person, debt, iban):
    variable_symbol = f"{person.id:06d}"
    message = f"Debt payment for {person.name}"
    payload = build_spd_payload(iban, float(debt), variable_symbol, message)
    return PAYMENT_PAGE_TEMPLATE.format(
        qr_png=qr_png_base64(payload),
        iban=escape(iban),
        debt=debt,
        variable_symbol=escape(variable_symbol),
        message=escape(message),
    )

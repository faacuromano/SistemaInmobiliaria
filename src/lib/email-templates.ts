/**
 * Generates a professional HTML email body for a payment receipt.
 *
 * Uses inline CSS only (external stylesheets are not supported by most email clients).
 */
export function receiptEmailHtml(data: {
  receiptNumber: string;
  clientName: string;
  concept: string;
  amount: string;
  currency: string;
  date: string;
  developmentName?: string;
  lotNumber?: string;
  companyName?: string;
}): string {
  const companyName = data.companyName || "Sistema Inmobiliaria";

  const locationRow =
    data.developmentName || data.lotNumber
      ? `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Ubicacion</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">
            ${data.lotNumber ? `Lote ${escapeHtml(data.lotNumber)}` : ""}${data.developmentName ? ` - ${escapeHtml(data.developmentName)}` : ""}
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recibo de Pago ${escapeHtml(data.receiptNumber)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e293b;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(companyName)}</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Recibo de Pago</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Estimado/a <strong>${escapeHtml(data.clientName)}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Le informamos que hemos recibido su pago. A continuacion encontrara los detalles del recibo:
              </p>

              <!-- Receipt details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Recibo N&deg;</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;">${escapeHtml(data.receiptNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Fecha</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(data.date)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Concepto</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(data.concept)}</td>
                </tr>${locationRow}
                <tr style="background-color:#f9fafb;">
                  <td style="padding:12px;color:#6b7280;font-size:14px;">Monto</td>
                  <td style="padding:12px;font-size:18px;font-weight:700;color:#059669;">
                    ${escapeHtml(data.currency)} ${escapeHtml(data.amount)}
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
                Este recibo fue generado automaticamente. Si tiene alguna consulta, no dude en comunicarse con nosotros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                ${escapeHtml(companyName)} &mdash; Este es un correo automatico, por favor no responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a professional HTML email body for an upcoming extra charge reminder.
 *
 * Used by the cron job to notify buyers 3 days before a cuota de refuerzo is due.
 */
export function upcomingChargeEmailHtml(data: {
  clientName: string;
  description: string;
  amount: string;
  currency: string;
  dueDate: string;
  developmentName?: string;
  lotNumber?: string;
  companyName?: string;
}): string {
  const companyName = data.companyName || "Sistema Inmobiliaria";

  const locationRow =
    data.developmentName || data.lotNumber
      ? `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Ubicacion</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">
            ${data.lotNumber ? `Lote ${escapeHtml(data.lotNumber)}` : ""}${data.developmentName ? ` - ${escapeHtml(data.developmentName)}` : ""}
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio: Cuota de refuerzo proxima a vencer</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#b45309;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(companyName)}</h1>
              <p style="margin:4px 0 0;color:#fde68a;font-size:13px;">Recordatorio de Pago</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Estimado/a <strong>${escapeHtml(data.clientName)}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Le recordamos que tiene una <strong>cuota de refuerzo proxima a vencer</strong>. A continuacion los detalles:
              </p>

              <!-- Charge details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Concepto</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;">${escapeHtml(data.description)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Vencimiento</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#b45309;font-weight:600;">${escapeHtml(data.dueDate)}</td>
                </tr>${locationRow}
                <tr style="background-color:#fffbeb;">
                  <td style="padding:12px;color:#6b7280;font-size:14px;">Monto</td>
                  <td style="padding:12px;font-size:18px;font-weight:700;color:#b45309;">
                    ${escapeHtml(data.currency)} ${escapeHtml(data.amount)}
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
                Por favor, asegurese de realizar el pago antes de la fecha de vencimiento. Si tiene alguna consulta, no dude en comunicarse con nosotros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                ${escapeHtml(companyName)} &mdash; Este es un correo automatico, por favor no responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a professional HTML email body for an overdue installment notification.
 *
 * Used by the cron job to notify buyers about overdue cuotas.
 */
export function overdueInstallmentEmailHtml(data: {
  clientName: string;
  installmentNumber: number;
  amount: string;
  currency: string;
  dueDate: string;
  developmentName?: string;
  lotNumber?: string;
  companyName?: string;
}): string {
  const companyName = data.companyName || "Sistema Inmobiliaria";

  const locationRow =
    data.developmentName || data.lotNumber
      ? `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Ubicacion</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">
            ${data.lotNumber ? `Lote ${escapeHtml(data.lotNumber)}` : ""}${data.developmentName ? ` - ${escapeHtml(data.developmentName)}` : ""}
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aviso: Cuota vencida</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#dc2626;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(companyName)}</h1>
              <p style="margin:4px 0 0;color:#fecaca;font-size:13px;">Aviso de Cuota Vencida</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Estimado/a <strong>${escapeHtml(data.clientName)}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Le informamos que la siguiente cuota se encuentra <strong>vencida</strong>:
              </p>

              <!-- Installment details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Cuota N&deg;</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;">${data.installmentNumber}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Vencimiento</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#dc2626;font-weight:600;">${escapeHtml(data.dueDate)}</td>
                </tr>${locationRow}
                <tr style="background-color:#fef2f2;">
                  <td style="padding:12px;color:#6b7280;font-size:14px;">Monto</td>
                  <td style="padding:12px;font-size:18px;font-weight:700;color:#dc2626;">
                    ${escapeHtml(data.currency)} ${escapeHtml(data.amount)}
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
                Le solicitamos regularizar el pago a la brevedad. Si ya realizo el pago, por favor ignore este mensaje. Para consultas, comuniquese con nosotros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                ${escapeHtml(companyName)} &mdash; Este es un correo automatico, por favor no responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a professional HTML email body for an upcoming signing notification.
 *
 * Used by the cron job to notify about signing appointments within the next day.
 */
export function upcomingSigningEmailHtml(data: {
  clientName: string;
  signingDate: string;
  signingTime: string;
  lotInfo: string;
  developmentName?: string;
  lotNumbers?: string;
  companyName?: string;
}): string {
  const companyName = data.companyName || "Sistema Inmobiliaria";

  const developmentRow = data.developmentName
    ? `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Desarrollo</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(data.developmentName)}</td>
        </tr>`
    : "";

  const lotNumbersRow = data.lotNumbers
    ? `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Lotes</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(data.lotNumbers)}</td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio: Turno de firma proximo</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1d4ed8;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(companyName)}</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Recordatorio de Turno de Firma</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5;">
                Le recordamos que tiene un <strong>turno de firma programado</strong>. A continuacion los detalles:
              </p>

              <!-- Signing details table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Cliente</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;">${escapeHtml(data.clientName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Informacion</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(data.lotInfo)}</td>
                </tr>${developmentRow}${lotNumbersRow}
                <tr style="background-color:#eff6ff;">
                  <td style="padding:12px;color:#6b7280;font-size:14px;">Fecha</td>
                  <td style="padding:12px;font-size:18px;font-weight:700;color:#1d4ed8;">
                    ${escapeHtml(data.signingDate)} a las ${escapeHtml(data.signingTime)}
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
                Por favor, asegurese de tener toda la documentacion necesaria lista para la firma. Si tiene alguna consulta, no dude en comunicarse con nosotros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                ${escapeHtml(companyName)} &mdash; Este es un correo automatico, por favor no responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS in email content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

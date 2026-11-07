import nodemailer from 'nodemailer';
import { prisma } from '@/app/lib/prisma';

export type MaintenanceEmailPayload = {
  to: string;
  subscriberName: string;
  type: string;
  impact: string;
  title: string;
  message: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
};

// Formats date nicely for email display
function formatEmailDate(dateVal?: string | Date | null): string {
  if (!dateVal) return 'To be announced / As scheduled';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateVal);
  }
}

// Generates branded responsive HTML email template for Sky-Tech Fiber
export function generateMaintenanceHtml(payload: MaintenanceEmailPayload): string {
  const isInternetDisabled =
    payload.impact.toLowerCase().includes('disabled') ||
    payload.impact.toLowerCase().includes('outage') ||
    payload.type.toLowerCase().includes('outage');

  const impactColor = isInternetDisabled ? '#dc2626' : '#d97706'; // Red or Amber
  const impactBg = isInternetDisabled ? '#fef2f2' : '#fffbeb';
  const impactBorder = isInternetDisabled ? '#fca5a5' : '#fcd34d';
  const impactBadgeText = isInternetDisabled
    ? '⚠️ INTERNET DISABLED / TOTAL OUTAGE'
    : '⚠️ SLOW INTERNET / HIGH LATENCY';

  const formattedStart = formatEmailDate(payload.startTime);
  const formattedEnd = formatEmailDate(payload.endTime);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #173896 0%, #214ebc 60%, #1e3a8a 100%); padding: 32px 28px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #ffffff; padding: 6px 16px; border-radius: 9999px; margin-bottom: 12px;">
                      <span style="color: #173896; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Official Service Advisory</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 6px 0; letter-spacing: -0.5px;">SKY-TECH FIBER</h1>
                    <p style="color: #93c5fd; font-size: 13px; margin: 0;">High-Speed Pure Fiber Internet · Sibagat Hub</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Impact Advisory Bar -->
          <tr>
            <td style="background-color: ${impactBg}; border-bottom: 2px solid ${impactBorder}; padding: 14px 24px; text-align: center;">
              <span style="color: ${impactColor}; font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">${impactBadgeText}</span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #475569;">
                Dear <strong>${payload.subscriberName || 'Valued Subscriber'}</strong>,
              </p>

              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
                ${payload.title}
              </h2>

              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px 0; white-space: pre-line;">
                ${payload.message}
              </p>

              <!-- Schedule / Scope Card -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Maintenance Category</span>
                          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px;">${payload.type}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Expected Impact</span>
                          <div style="font-size: 14px; font-weight: 700; color: ${impactColor}; margin-top: 2px;">${payload.impact}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Start Schedule</span>
                          <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px;">${formattedStart}</div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Estimated Restoration / End</span>
                          <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px;">${formattedEnd}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What subscribers should expect -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 10px 10px 0; padding: 14px 16px; margin-bottom: 24px;">
                <p style="font-size: 12px; font-weight: 700; color: #1e3a8a; margin: 0 0 4px 0;">Subscriber Notice:</p>
                <p style="font-size: 12px; color: #2563eb; line-height: 1.5; margin: 0;">
                  During this maintenance period, optical equipment and lines may be disconnected, spliced, or reconfigured. Please keep your fiber modem / ONT powered on unless instructed otherwise. Your connection will normalize automatically once works conclude.
                </p>
              </div>

              <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
                We appreciate your patience and understanding as we continually upgrade our fiber infrastructure to deliver faster, more reliable connectivity across Sibagat.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 28px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #ffffff;">Sky-Tech Fiber Operations Team</p>
              <p style="margin: 0 0 12px 0;">Sibagat Hub · Dispatch Hotline: (085) 815-2026 / 0917-SKY-TECH</p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                This is an automated maintenance announcement delivered to your registered Sky-Tech subscriber account email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Retrieves configured transporter or creates a safe fallback
async function getMailerTransporter() {
  // 1. Check system settings in DB for custom SMTP
  let dbSmtpUser: string | null = null;
  let dbSmtpPass: string | null = null;
  let dbSmtpHost: string | null = null;
  let dbSmtpPort: number | null = null;

  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    if (settings) {
      dbSmtpUser = settings.smtpUser || null;
      dbSmtpPass = settings.smtpPass || null;
      dbSmtpHost = settings.smtpHost || null;
      dbSmtpPort = settings.smtpPort || null;
    }
  } catch {
    // ignore
  }

  const user = dbSmtpUser || process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = dbSmtpPass || process.env.SMTP_PASS || process.env.GMAIL_PASS;
  const host = dbSmtpHost || process.env.SMTP_HOST;
  const port = dbSmtpPort || Number(process.env.SMTP_PORT || 587);

  if (user && pass) {
    if (user.includes('@gmail.com') || (!host && user.includes('gmail'))) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }

    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback dev transporter (logs to console safely)
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true,
  });
}

// Broadcasts maintenance announcement to all subscriber accounts
export async function broadcastMaintenanceAnnouncement(params: {
  type: string;
  impact: string;
  title: string;
  message: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  sentBy?: string | null;
}) {
  const { type, impact, title, message, startTime, endTime, sentBy } = params;

  // 1. Fetch all unique subscriber emails from Subscriber and User tables
  const [subscribers, subscriberUsers] = await Promise.all([
    prisma.subscriber.findMany({
      where: { archived: false },
      select: { id: true, name: true, email: true },
    }).catch(() => []),
    prisma.user.findMany({
      where: { role: 'subscriber' },
      select: { id: true, name: true, email: true, subscriberId: true },
    }).catch(() => []),
  ]);

  const recipientMap = new Map<string, { id: string; name: string; email: string }>();

  for (const s of subscribers) {
    const cleanEmail = s.email?.trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes('@')) {
      recipientMap.set(cleanEmail, { id: s.id, name: s.name, email: cleanEmail });
    }
  }

  for (const u of subscriberUsers) {
    const cleanEmail = u.email?.trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes('@') && !recipientMap.has(cleanEmail)) {
      recipientMap.set(cleanEmail, {
        id: u.subscriberId || u.id,
        name: u.name,
        email: cleanEmail,
      });
    }
  }

  const recipients = Array.from(recipientMap.values());
  const transporter = await getMailerTransporter();

  let successfulEmails = 0;
  const fromSender = process.env.SMTP_USER || process.env.GMAIL_USER || 'Sky-Tech Fiber Alerts <support@skytech.net>';

  // Send emails to all subscriber accounts
  const emailPromises = recipients.map(async (recipient) => {
    try {
      const html = generateMaintenanceHtml({
        to: recipient.email,
        subscriberName: recipient.name,
        type,
        impact,
        title,
        message,
        startTime,
        endTime,
      });

      await transporter.sendMail({
        from: fromSender,
        to: recipient.email,
        subject: `[SKY-TECH ALERT] ${title} (${impact})`,
        text: `SKY-TECH FIBER ALERT\n\n${title}\nType: ${type}\nImpact: ${impact}\n\n${message}\n\nStart: ${formatEmailDate(startTime)}\nEstimated Restoration: ${formatEmailDate(endTime)}\n\nSky-Tech Fiber ISP Sibagat Hub`,
        html,
      });

      successfulEmails++;
    } catch (err) {
      console.warn(`Failed to send maintenance email to ${recipient.email}:`, err);
    }
  });

  await Promise.allSettled(emailPromises);

  // 2. Also record an in-app Notification for each subscriber
  try {
    const notifData = recipients.map((r) => ({
      forRole: 'subscriber' as const,
      forUserId: r.id,
      type: 'system' as const,
      title: `[Maintenance] ${title}`,
      body: `${impact}: ${message.slice(0, 150)}${message.length > 150 ? '...' : ''}`,
    }));

    if (notifData.length > 0) {
      await prisma.notification.createMany({ data: notifData });
    }
  } catch (err) {
    console.warn('Failed to insert in-app notifications:', err);
  }

  // 3. Save MaintenanceLog record in DB
  let logRecord = null;
  try {
    logRecord = await prisma.maintenanceLog.create({
      data: {
        type,
        impact,
        title,
        message,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        recipients: successfulEmails,
        sentBy: sentBy || 'Administrator',
      },
    });
  } catch (err) {
    console.warn('Failed to save maintenance log record:', err);
  }

  return {
    success: true,
    totalRecipients: recipients.length,
    successfulEmails,
    log: logRecord,
  };
}


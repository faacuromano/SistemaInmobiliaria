import { systemConfigModel } from "@/server/models/system-config.model";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Get SMTP configuration from system settings.
 * Falls back to environment variables if system config is empty.
 */
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const configs = await systemConfigModel.getMany([
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_pass",
      "smtp_from",
    ]);

    const host = configs.smtp_host || process.env.SMTP_HOST;
    const port = parseInt(
      configs.smtp_port || process.env.SMTP_PORT || "587",
      10
    );
    const user = configs.smtp_user || process.env.SMTP_USER;
    const pass = configs.smtp_pass || process.env.SMTP_PASS;
    const from =
      configs.smtp_from ||
      process.env.SMTP_FROM ||
      "noreply@sistema.com";

    if (!host || !user || !pass) {
      return null;
    }

    return {
      host,
      port,
      secure: port === 465,
      user,
      pass,
      from,
    };
  } catch (error) {
    console.error("Error loading SMTP config:", error);
    return null;
  }
}

/**
 * Send an email using nodemailer with SMTP settings from system config.
 *
 * Uses dynamic import so the module does not break at build time
 * if nodemailer is not yet installed.
 *
 * @returns true if the email was sent, false otherwise.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    if (!config) {
      console.warn(
        "[email] SMTP not configured - skipping email send"
      );
      return false;
    }

    // Dynamic import to avoid build errors when nodemailer is not installed
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[email] Email sent to ${options.to}: "${options.subject}"`);
    return true;
  } catch (error) {
    console.error("[email] Failed to send email:", error);
    return false;
  }
}

import { z } from "zod";

export const systemConfigSchema = z.object({
  company_name: z.string().max(200).optional().or(z.literal("")),
  company_cuit: z.string().max(50).optional().or(z.literal("")),
  company_address: z.string().max(300).optional().or(z.literal("")),
  company_phone: z.string().max(50).optional().or(z.literal("")),
  company_email: z.string().email().optional().or(z.literal("")),
  receipt_header: z.string().max(500).optional().or(z.literal("")),
  receipt_footer: z.string().max(500).optional().or(z.literal("")),
  default_exchange_source: z.string().max(50).optional().or(z.literal("")),
  // SMTP email settings
  smtp_host: z.string().max(200).optional().or(z.literal("")),
  smtp_port: z.string().max(5).optional().or(z.literal("")),
  smtp_user: z.string().max(200).optional().or(z.literal("")),
  smtp_pass: z.string().max(200).optional().or(z.literal("")),
  smtp_from: z.string().max(200).optional().or(z.literal("")),
});

export type SystemConfigInput = z.input<typeof systemConfigSchema>;

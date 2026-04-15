import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@talent-net.example.com';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends a transactional email via Resend.
 * Throws on delivery failure so callers can decide how to handle retries.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    reply_to: options.replyTo,
  });

  if (error) {
    throw new Error(`Resend delivery failed: ${error.message}`);
  }
}

// ─── Convenience templates ────────────────────────────────────────────────────

export async function sendApplicationReceivedEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string;
}): Promise<void> {
  const company = opts.companyName ?? 'TalentNet';
  await sendEmail({
    to: opts.to,
    subject: `Application received — ${opts.jobTitle}`,
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p>Thank you for applying for <strong>${opts.jobTitle}</strong> at ${company}.</p>
      <p>We have received your application and will be in touch soon.</p>
      <p>Best regards,<br/>${company} Hiring Team</p>
    `,
    text: `Hi ${opts.candidateName},\n\nThank you for applying for ${opts.jobTitle} at ${company}. We have received your application and will be in touch soon.\n\nBest regards,\n${company} Hiring Team`,
  });
}

export async function sendInterviewInvitationEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  meetingLink?: string;
  companyName?: string;
}): Promise<void> {
  const company = opts.companyName ?? 'TalentNet';
  const dateStr = opts.scheduledAt.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
  const linkLine = opts.meetingLink
    ? `<p>Join here: <a href="${opts.meetingLink}">${opts.meetingLink}</a></p>`
    : '';

  await sendEmail({
    to: opts.to,
    subject: `Interview invitation — ${opts.jobTitle}`,
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p>We'd like to invite you to an interview for <strong>${opts.jobTitle}</strong> at ${company}.</p>
      <p><strong>When:</strong> ${dateStr} UTC</p>
      ${linkLine}
      <p>If you have any questions, please reply to this email.</p>
      <p>Best regards,<br/>${company} Hiring Team</p>
    `,
    text: `Hi ${opts.candidateName},\n\nYou have been invited to interview for ${opts.jobTitle} at ${company}.\nWhen: ${dateStr} UTC\n${opts.meetingLink ? `Join: ${opts.meetingLink}\n` : ''}\nBest regards,\n${company} Hiring Team`,
  });
}

export async function sendStatusUpdateEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  status: 'shortlisted' | 'rejected' | 'offered';
  companyName?: string;
}): Promise<void> {
  const company = opts.companyName ?? 'TalentNet';

  const messages: Record<typeof opts.status, { subject: string; body: string }> = {
    shortlisted: {
      subject: `You've been shortlisted — ${opts.jobTitle}`,
      body: `Great news! You have been shortlisted for <strong>${opts.jobTitle}</strong> at ${company}. We will be in touch with next steps shortly.`,
    },
    rejected: {
      subject: `Update on your application — ${opts.jobTitle}`,
      body: `Thank you for your interest in <strong>${opts.jobTitle}</strong> at ${company}. After careful consideration, we will not be moving forward with your application at this time. We encourage you to apply for future opportunities.`,
    },
    offered: {
      subject: `Offer extended — ${opts.jobTitle}`,
      body: `Congratulations! We are pleased to extend you an offer for <strong>${opts.jobTitle}</strong> at ${company}. Please check your inbox for the formal offer letter.`,
    },
  };

  const { subject, body } = messages[opts.status];

  await sendEmail({
    to: opts.to,
    subject,
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p>${body}</p>
      <p>Best regards,<br/>${company} Hiring Team</p>
    `,
    text: `Hi ${opts.candidateName},\n\n${body.replace(/<[^>]+>/g, '')}\n\nBest regards,\n${company} Hiring Team`,
  });
}

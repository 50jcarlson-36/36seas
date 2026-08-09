import { Resend } from "resend";

function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL || "36Seas Publishing <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SERVICES_INBOX = process.env.SERVICES_INBOX_EMAIL || "notifications@36seas.com";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wrapHtml(bodyHtml: string): string {
  return `<div style="font-family:Georgia,serif;background:#080a0b;color:#f5f5f0;padding:32px;">
    <p style="letter-spacing:2px;font-size:12px;color:#3fd0c9;">36SEAS PUBLISHING</p>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#9aa5a8;">36Seas Publishing · Manuscript Studio</p>
  </div>`;
}

/**
 * Sends transactional email via Resend. Returns { sent: boolean, error?: string } instead
 * of throwing, so a missing/misconfigured RESEND_API_KEY never breaks the calling flow —
 * the invite/notification still gets created in the database either way.
 */
async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const resend = client();
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY is not set — email not sent." };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: wrapHtml(opts.html),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err: unknown) {
    return { sent: false, error: err instanceof Error ? err.message : "Email send failed" };
  }
}

export async function sendWorkspaceInviteEmail(opts: {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.inviterName} invited you to "${opts.workspaceName}" on 36Seas Publishing`,
    html: `
      <h1 style="font-size:22px;">You're invited to a workspace</h1>
      <p>${opts.inviterName} added you as a <strong>${opts.role}</strong> on the
      <strong>${opts.workspaceName}</strong> workspace in 36Seas Publishing's manuscript studio.</p>
      <p>Sign in (or create an account) with this email address — <strong>${opts.to}</strong> —
      and the workspace's shared manuscripts will show up automatically.</p>
      <p><a href="${SITE_URL}/signup" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#3fd0c9;color:#04201d;text-decoration:none;border-radius:6px;">Create your account →</a></p>
    `,
  });
}

export async function sendSubmissionReviewEmail(opts: {
  to: string;
  manuscriptTitle: string;
  reviewStatus: "approved" | "changes_requested";
  notes?: string;
}) {
  const isApproved = opts.reviewStatus === "approved";
  return sendEmail({
    to: opts.to,
    subject: isApproved
      ? `"${opts.manuscriptTitle}" is approved for submission`
      : `Changes requested on "${opts.manuscriptTitle}"`,
    html: `
      <h1 style="font-size:22px;">${isApproved ? "Approved" : "Changes requested"}</h1>
      <p>Your submission package for <strong>${opts.manuscriptTitle}</strong> was
      ${isApproved ? "approved by the 36Seas editorial team — you're clear to upload it at kdp.amazon.com." : "reviewed and needs a few changes before it goes out."}</p>
      ${opts.notes ? `<p style="border-left:2px solid #3fd0c9;padding-left:12px;color:#e5e5e0;">${opts.notes}</p>` : ""}
      <p><a href="${SITE_URL}/dashboard/manuscripts" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#3fd0c9;color:#04201d;text-decoration:none;border-radius:6px;">Open your manuscripts →</a></p>
    `,
  });
}

export async function sendExpertOrderEmail(opts: { to: string; manuscriptTitle: string }) {
  return sendEmail({
    to: opts.to,
    subject: `36Seas expert service received for "${opts.manuscriptTitle}"`,
    html: `
      <h1 style="font-size:22px;">Your expert review is reserved</h1>
      <p>We received your publication-package order for <strong>${opts.manuscriptTitle}</strong>.</p>
      <p>A 36Seas expert will inspect the manuscript files, cover assets, listing metadata,
      discoverability choices, and submission package. You can follow its status from your manuscript workspace.</p>
      <p><a href="${SITE_URL}/dashboard/manuscripts" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#3fd0c9;color:#04201d;text-decoration:none;border-radius:6px;">Open your manuscripts →</a></p>
    `,
  });
}

export async function sendHumanEvaluationOrderEmail(opts: { to: string; manuscriptTitle: string }) {
  return sendEmail({
    to: opts.to,
    subject: `36Seas human evaluation reserved for "${opts.manuscriptTitle}"`,
    html: `
      <h1 style="font-size:22px;">Your human evaluation is reserved</h1>
      <p>We received your order for <strong>${escapeHtml(opts.manuscriptTitle)}</strong>.</p>
      <p>A 36Seas-managed editor will assess the manuscript’s structure, voice, pacing,
      audience fit, publication readiness, and highest-priority revisions. You can follow
      the order from Expert Services.</p>
      <p><a href="${SITE_URL}/dashboard/services" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#3fd0c9;color:#04201d;text-decoration:none;border-radius:6px;">Open Expert Services →</a></p>
    `,
  });
}

export async function sendGhostwritingRequestEmail(opts: {
  to: string;
  authorName: string;
  requestId: string;
  targetWordCount: number;
  genre: string;
  memberTier: string;
  discountPercent: number;
  brief: string;
}) {
  const safeName = escapeHtml(opts.authorName);
  const safeGenre = escapeHtml(opts.genre || "Not specified");
  const safeBrief = escapeHtml(opts.brief).replaceAll("\n", "<br />");
  const requestSummary = `
    <p><strong>Request:</strong> ${opts.requestId}</p>
    <p><strong>Author:</strong> ${safeName}</p>
    <p><strong>Target:</strong> ${opts.targetWordCount.toLocaleString()} words · ${safeGenre}</p>
    <p><strong>Membership:</strong> ${escapeHtml(opts.memberTier)} · ${opts.discountPercent}% preferred-rate discount</p>
    <p style="border-left:2px solid #3fd0c9;padding-left:12px;color:#e5e5e0;">${safeBrief}</p>
  `;

  const authorResult = opts.to
    ? await sendEmail({
        to: opts.to,
        subject: "36Seas received your managed ghostwriting request",
        html: `
          <h1 style="font-size:22px;">Your project brief is in</h1>
          <p>We’ll review the scope, match the right writing and editorial team, and return with questions or a milestone-based quote.</p>
          ${requestSummary}
          <p>Your membership rate will be applied to the approved project quote.</p>
        `,
      })
    : { sent: false, error: "Author email is unavailable." };

  const teamResult = await sendEmail({
    to: SERVICES_INBOX,
    subject: `New ghostwriting request · ${safeName} · ${opts.targetWordCount.toLocaleString()} words`,
    html: `<h1 style="font-size:22px;">New managed ghostwriting request</h1>${requestSummary}`,
  });

  return { author: authorResult, team: teamResult };
}

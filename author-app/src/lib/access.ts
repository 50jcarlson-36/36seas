import "server-only";

export type AccountRole = "member" | "worker" | "manager" | "admin";

function ownerEmails() {
  return (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email?: string | null) {
  return Boolean(email && ownerEmails().includes(email.toLowerCase()));
}

export function effectiveRole(email: string | null | undefined, role?: string | null): AccountRole {
  if (isOwnerEmail(email)) return "admin";
  if (role === "worker" || role === "manager" || role === "admin") return role;
  return "member";
}

export function effectiveTier(email: string | null | undefined, tier?: string | null) {
  return isOwnerEmail(email) ? "publisher" : tier || "free";
}

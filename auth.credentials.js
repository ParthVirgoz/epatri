/**
 * Shared auth email/password policy for admin API and admin SPA.
 * Keep behavior aligned across backend Zod schemas and react-hook-form.
 */

/** Domains and subdomains blocked (disposable / temporary inboxes). */
export const BLOCKED_EMAIL_SUFFIXES = [
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamail.net",
  "guerrillamail.biz",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "throwaway.email",
  "fakeinbox.com",
  "trashmail.com",
  "disposablemail.com",
  "getnada.com",
  "maildrop.cc",
  "mailnesia.com",
  "mohmal.com",
  "emailondeck.com",
  "dispostable.com",
  "mintemail.com",
  "mytemp.email",
];

/**
 * Allowed mailbox providers (suffix match: exact domain or subdomain, e.g. mail.yahoo.com).
 * Corporate custom domains are not accepted — only mainstream providers.
 */
export const ALLOWED_EMAIL_SUFFIXES = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.in",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.ca",
  "yahoo.com.br",
  "yahoo.com.au",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "gmx.fr",
  "web.de",
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "mail.ru",
  "qq.com",
  "foxmail.com",
  "rediffmail.com",
];

export const AUTH_EMAIL_REJECT_MESSAGE =
  "Use a supported email provider (for example Gmail, Yahoo, or Outlook). Temporary or disposable addresses are not allowed.";

export const AUTH_PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.";

/** At least 8 chars, one upper, one lower, one digit, one non-alphanumeric symbol. */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function domainMatchesSuffix(domain, suffix) {
  const d = domain.toLowerCase();
  const s = suffix.toLowerCase();
  return d === s || d.endsWith(`.${s}`);
}

function isBlockedEmailDomain(domain) {
  const d = domain.toLowerCase();
  return BLOCKED_EMAIL_SUFFIXES.some((suffix) => domainMatchesSuffix(d, suffix));
}

function isAllowedEmailDomain(domain) {
  const d = domain.toLowerCase();
  return ALLOWED_EMAIL_SUFFIXES.some((suffix) => domainMatchesSuffix(d, suffix));
}

/**
 * @param {string} email - full address (will be normalized by caller)
 */
export function isAuthEmailAllowed(email) {
  const s = String(email).trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 1) return false;
  const domain = s.slice(at + 1);
  if (!domain || domain.includes("..")) return false;
  if (isBlockedEmailDomain(domain)) return false;
  return isAllowedEmailDomain(domain);
}

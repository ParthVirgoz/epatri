/**
 * Single source for user-facing copy: form hints, auth API mapping, and generic API errors.
 * Import policy strings from shared credentials so validation rules are not duplicated.
 */
import {
  AUTH_EMAIL_REJECT_MESSAGE,
  AUTH_PASSWORD_POLICY_MESSAGE,
} from "../../../auth.credentials.js";

/** -------- Success (toasts) -------- */
export const MSG_SUCCESS_LOGIN = "You're in. Welcome back.";
export const MSG_SUCCESS_REGISTER =
  "Your account is ready. Next, sign in to finish setting up your business.";

/** -------- Form validation (login / register) -------- */
export const FORM = {
  emailRequired: "Please enter your email address.",
  emailLooksInvalid: "That doesn’t look like a valid email address.",
  /** Same text as server policy — defined once in auth.credentials.js */
  emailProviderNotAllowed: AUTH_EMAIL_REJECT_MESSAGE,
  passwordRequired: "Please enter your password.",
  passwordRules: AUTH_PASSWORD_POLICY_MESSAGE,
  phoneCountryRequired: "Add your country code (for example +91).",
  phoneCountryFormat: "Use a country code like +91.",
  phoneNumberRequired: "Enter your phone number too.",
  phoneDigitsLength: "Enter a phone number with 6 to 14 digits.",
  formHasIssues: "Please fix the highlighted fields and try again.",
};

/** -------- Generic API / network -------- */
export const MSG_API_GENERIC =
  "Something went wrong on our side. Please wait a moment and try again.";
export const MSG_API_NETWORK =
  "We couldn’t reach the server. Check your internet connection and try again.";
export const MSG_API_UNAUTHORIZED =
  "That email or password doesn’t match our records. Try again, or reset your password if you forgot it.";
export const MSG_API_EMAIL_IN_USE =
  "An account with this email already exists. Try signing in instead.";
export const MSG_API_RATE_LIMIT =
  "Too many attempts. Please wait a little while and try again.";

function normalizeForMatch(s) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Strip prefixes added by older clients, e.g. "Error 401: ..." */
export function stripErrorCodePrefix(message) {
  return String(message ?? "").replace(/^error\s*\d+\s*:\s*/i, "").trim();
}

/**
 * Map raw API / Supabase / server strings to plain-language text.
 * @param {unknown} raw
 * @param {number} [status] HTTP status if known
 */
export function toFriendlyApiError(raw, status) {
  if (raw != null && typeof raw === "object") {
    try {
      raw = JSON.stringify(raw);
    } catch {
      raw = String(raw);
    }
  }

  let text = stripErrorCodePrefix(String(raw ?? ""));
  if (!text) {
    if (status === 401 || status === 403) return MSG_API_UNAUTHORIZED;
    if (status === 429) return MSG_API_RATE_LIMIT;
    if (status >= 500) return MSG_API_GENERIC;
    return MSG_API_GENERIC;
  }

  const n = normalizeForMatch(text);

  if (
    status === 0 ||
    /network\s*error|failed to fetch|net::/i.test(text) ||
    n.includes("failed to fetch")
  ) {
    return MSG_API_NETWORK;
  }

  if (status === 401 || status === 403) {
    if (/invalid login credentials|invalid credentials|invalid email or password/i.test(text)) {
      return MSG_API_UNAUTHORIZED;
    }
  }

  const rules = [
    {
      test: () => /request failed with status code\s*(401|403)\b/i.test(text),
      msg: MSG_API_UNAUTHORIZED,
    },
    {
      test: () =>
        /invalid login credentials|invalid credentials|email not confirmed|invalid email or password/i.test(
          text,
        ),
      msg: MSG_API_UNAUTHORIZED,
    },
    {
      test: () =>
        /user already registered|already registered|email.*already|duplicate key.*email|email.*exists/i.test(
          n,
        ),
      msg: MSG_API_EMAIL_IN_USE,
    },
    {
      test: () => n.includes("shop username already taken"),
      msg: "That business link name is already taken. Pick another one.",
    },
    {
      test: () => /too many requests|rate limit/i.test(n),
      msg: MSG_API_RATE_LIMIT,
    },
    {
      test: () => n.includes("invalid email address"),
      msg: FORM.emailLooksInvalid,
    },
    {
      test: () => normalizeForMatch(AUTH_EMAIL_REJECT_MESSAGE) === n,
      msg: AUTH_EMAIL_REJECT_MESSAGE,
    },
    {
      test: () => normalizeForMatch(AUTH_PASSWORD_POLICY_MESSAGE) === n,
      msg: AUTH_PASSWORD_POLICY_MESSAGE,
    },
    {
      test: () => /password.*at least 6|password should be at least/i.test(n),
      msg: AUTH_PASSWORD_POLICY_MESSAGE,
    },
  ];

  for (const { test, msg } of rules) {
    if (test()) return msg;
  }

  if (status === 429) return MSG_API_RATE_LIMIT;
  if (status >= 500) return MSG_API_GENERIC;

  if (/^4\d\d$/.test(String(status))) {
    return MSG_API_GENERIC;
  }

  return text.length > 160 ? MSG_API_GENERIC : text;
}

/**
 * First validation error for toast (react-hook-form errors object).
 * @param {Record<string, { message?: string }>} fieldErrors
 * @param {string[]} fieldOrder
 */
export function firstFormErrorMessage(fieldErrors, fieldOrder) {
  if (!fieldErrors) return FORM.formHasIssues;
  for (const key of fieldOrder) {
    const m = fieldErrors[key]?.message;
    if (m) return m;
  }
  return FORM.formHasIssues;
}

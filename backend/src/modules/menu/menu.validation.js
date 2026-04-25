/**
 * Request validation helpers. All write paths should validate here; services keep defense-in-depth checks.
 */

import { uuidParamSchema } from './menu.schema.js';

function validationError(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

export function parseUuidParam(value, label = 'id') {
  const r = uuidParamSchema.safeParse(value);
  if (!r.success) {
    const msg = r.error.issues[0]?.message || `Invalid ${label}`;
    throw validationError(`${label}: ${msg}`, 400);
  }
  return r.data;
}

export function parseBody(schema, body) {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    const path = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
    throw validationError(`${path}${issue?.message || 'Invalid request body'}`, 400);
  }
  return r.data;
}

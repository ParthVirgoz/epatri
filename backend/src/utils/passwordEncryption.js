/**
 * partner-platform parity: client sends password fields as base64 in JSON;
 * server decodes before Supabase or hashing. Use with HTTPS — not encryption at rest.
 */

const BASE64_REGEX = /^[A-Za-z0-9+/]+=*$/;

export function decodeBase64Password(value) {
  if (value == null || typeof value !== 'string') return value;
  const trimmed = value.replace(/\s/g, '');
  if (trimmed.length < 2 || !BASE64_REGEX.test(trimmed)) return value;
  try {
    let b64 = trimmed;
    if (trimmed.length % 4 === 2) b64 += '==';
    else if (trimmed.length % 4 === 3) b64 += '=';
    if (b64.length % 4 !== 0) return value;
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    if (decoded.length > 0) return decoded;
  } catch {
    // ignore
  }
  return value;
}

export function decodePasswordBody(body) {
  if (!body || typeof body !== 'object') return body;
  const result = { ...body };
  const fields = ['password', 'currentPassword', 'newPassword'];
  for (const field of fields) {
    if (result[field] != null && typeof result[field] === 'string') {
      result[field] = decodeBase64Password(result[field]);
    }
  }
  return result;
}

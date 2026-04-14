/**
 * partner-platform parity: encode password fields as base64 before JSON POST.
 * Backend decodes in decodePasswordBody — see backend/src/utils/passwordEncryption.js
 */

function encodeBase64(str) {
  if (str == null || typeof str !== 'string') return str;
  try {
    return btoa(
      new TextEncoder().encode(str).reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    );
  } catch {
    return str;
  }
}

export function encodePasswordsInBody(body) {
  if (!body || typeof body !== 'object') return body;
  const out = { ...body };
  const fields = ['password', 'currentPassword', 'newPassword'];
  for (const field of fields) {
    if (out[field] != null && typeof out[field] === 'string') {
      out[field] = encodeBase64(out[field]);
    }
  }
  return out;
}

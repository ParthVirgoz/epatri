const bucket = new Map();

function keyFor(req, scope) {
  const ip = req.headers["x-forwarded-for"] || req.ip || "unknown";
  const user = req.user?.id || "anon";
  return `${scope}:${ip}:${user}`;
}

export function simpleRateLimit({ scope, windowMs, max }) {
  return async function rateLimitPreHandler(req, reply) {
    const now = Date.now();
    const key = keyFor(req, scope);
    const row = bucket.get(key);
    if (!row || now > row.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    row.count += 1;
    if (row.count > max) {
      return reply.code(429).send({ message: "Too many requests. Please retry in a moment." });
    }
  };
}

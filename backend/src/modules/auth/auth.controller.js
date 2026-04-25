import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  forgotPassword,
  resetPassword,
} from "./auth.service.js";
import { decodePasswordBody } from "../../utils/passwordEncryption.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateMeSchema,
} from "./auth.schema.js";

export async function registerController(req, reply) {
  try {
    const body = decodePasswordBody(req.body || {});
    const parsed = registerSchema.parse(body);
    return await registerUser(req.server, parsed);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function loginController(req, reply) {
  try {
    const body = decodePasswordBody(req.body || {});
    const parsed = loginSchema.parse(body);
    return await loginUser(req.server, parsed);
  } catch (err) {
    const status = err.status || err.statusCode || 400;
    const message = err.message || 'Login failed';
    req.log.error('Login failed', { message, status, email: req.body?.email });
    return reply.code(status).send({ message });
  }
}

export async function meController(req) {
  return await getCurrentUser(req.server, req.user);
}

export async function updateMeController(req, reply) {
  try {
    const parsed = updateMeSchema.parse(req.body || {});
    return await updateCurrentUser(req.server, req.user, parsed);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function forgotPasswordController(req, reply) {
  try {
    const parsed = forgotPasswordSchema.parse(req.body || {});
    return await forgotPassword(req.server, parsed.email);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function resetPasswordController(req, reply) {
  try {
    const decoded = decodePasswordBody(req.body || {});
    const parsed = resetPasswordSchema.parse(decoded);
    return await resetPassword(req.server, {
      password: parsed.password,
      access_token: parsed.access_token,
    });
  } catch (err) {
    const status = err.status || err.statusCode || 400;
    return reply.code(status).send({ message: err.message });
  }
}
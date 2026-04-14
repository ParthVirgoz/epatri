import {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} from "./auth.service.js";
import { decodePasswordBody } from "../../utils/passwordEncryption.js";

export async function registerController(req, reply) {
  try {
    const body = decodePasswordBody(req.body || {});
    return await registerUser(req.server, body);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function loginController(req, reply) {
  try {
    const body = decodePasswordBody(req.body || {});
    return await loginUser(req.server, body);
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

export async function forgotPasswordController(req, reply) {
  try {
    return await forgotPassword(req.server, req.body.email);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function resetPasswordController(req, reply) {
  try {
    const decoded = decodePasswordBody(req.body || {});
    const { password, access_token: accessToken } = decoded;
    return await resetPassword(req.server, { password, access_token: accessToken });
  } catch (err) {
    const status = err.status || err.statusCode || 400;
    return reply.code(status).send({ message: err.message });
  }
}
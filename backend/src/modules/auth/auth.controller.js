import {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} from "./auth.service.js";

export async function registerController(req, reply) {
  try {
    return await registerUser(req.server, req.body);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}

export async function loginController(req, reply) {
  try {
    return await loginUser(req.server, req.body);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
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
    const { password } = req.body;
    return await resetPassword(req.server, password);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}
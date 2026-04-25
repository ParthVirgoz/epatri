import {
  registerController,
  loginController,
  meController,
  updateMeController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller.js";
import { simpleRateLimit } from "../../utils/simpleRateLimit.js";

export async function authRoutes(fastify) {
  const authLimiter = simpleRateLimit({ scope: "auth", windowMs: 60 * 1000, max: 10 });
  fastify.post("/register", { preHandler: [authLimiter] }, registerController);
  fastify.post("/login", { preHandler: [authLimiter] }, loginController);

  fastify.get("/me", {
    preHandler: [fastify.authenticate],
    handler: meController,
  });
  fastify.patch("/me", {
    preHandler: [fastify.authenticate],
    handler: updateMeController,
  });

  fastify.post("/forgot-password", { preHandler: [authLimiter] }, forgotPasswordController);
  fastify.post("/reset-password", { preHandler: [authLimiter] }, resetPasswordController);
}
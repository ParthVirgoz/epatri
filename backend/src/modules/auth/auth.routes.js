import {
  registerController,
  loginController,
  meController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller.js";

export async function authRoutes(fastify) {
  fastify.post("/register", registerController);
  fastify.post("/login", loginController);

  fastify.get("/me", {
    preHandler: [fastify.authenticate],
    handler: meController,
  });

  fastify.post("/forgot-password", forgotPasswordController);
  fastify.post("/reset-password", resetPasswordController);
}
import { uploadMenuController } from "./menu.controller.js";

export async function menuRoutes(fastify) {
  fastify.post(
    "/upload",
    {
      preHandler: [fastify.authenticate],
    },
    uploadMenuController
  );
}
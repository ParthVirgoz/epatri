import { getShopController } from "./shop.controller.js";

export async function shopRoutes(fastify) {
  fastify.get("/:username", getShopController);
}
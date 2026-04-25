import {
  getMyMenuStateMvpController,
  putDraftMenuMvpController,
  publishDraftMenuMvpController,
  uploadPdfDraftMvpController,
} from "./menu.mvp.controller.js";
import { simpleRateLimit } from "../../utils/simpleRateLimit.js";

export async function menuRoutes(fastify) {
  const menuWriteLimiter = simpleRateLimit({ scope: "menu-write", windowMs: 60 * 1000, max: 30 });
  fastify.get("/mine", { preHandler: [fastify.authenticate] }, getMyMenuStateMvpController);
  fastify.put("/draft", { preHandler: [fastify.authenticate, menuWriteLimiter] }, putDraftMenuMvpController);
  fastify.post("/publish", { preHandler: [fastify.authenticate, menuWriteLimiter] }, publishDraftMenuMvpController);
  fastify.post("/upload", { preHandler: [fastify.authenticate, menuWriteLimiter] }, uploadPdfDraftMvpController);
}
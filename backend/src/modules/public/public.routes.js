import {
  getPublicBusinessController,
  getPublicLocationMenuController,
  getTreeImpactCountersController,
  postTreeImpactBumpController,
} from "./public.controller.js";
import { simpleRateLimit } from "../../utils/simpleRateLimit.js";

export async function publicRoutes(fastify) {
  const impactBumpLimiter = simpleRateLimit({ scope: "impact-bump", windowMs: 60 * 1000, max: 60 });
  fastify.get("/impact/trees", getTreeImpactCountersController);
  fastify.post("/impact/trees", { preHandler: [impactBumpLimiter] }, postTreeImpactBumpController);
  fastify.get("/:slug", getPublicBusinessController);
  fastify.get("/:slug/:locationSlug", getPublicLocationMenuController);
  fastify.get("/business/:slug", getPublicBusinessController);
  fastify.get("/business/:slug/location/:locationSlug", getPublicLocationMenuController);
  fastify.get("/business/:slug/:locationSlug", getPublicLocationMenuController);
}

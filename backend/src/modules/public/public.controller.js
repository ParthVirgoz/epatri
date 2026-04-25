import {
  getPublicBusinessBySlug,
  getPublicLocationMenu,
  getTreeImpactCounters,
  bumpTreeImpactCounters,
} from "./public.service.js";

export async function getPublicBusinessController(req, reply) {
  try {
    const payload = await getPublicBusinessBySlug(req.server, req.params.slug);
    return reply.send(payload);
  } catch (err) {
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || "Server error" });
  }
}

export async function getPublicLocationMenuController(req, reply) {
  try {
    const payload = await getPublicLocationMenu(
      req.server,
      req.params.slug,
      req.params.locationSlug
    );
    return reply.send(payload);
  } catch (err) {
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || "Server error" });
  }
}

export async function getTreeImpactCountersController(req, reply) {
  try {
    const payload = await getTreeImpactCounters(req.server);
    return reply.send(payload);
  } catch (err) {
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || "Server error" });
  }
}

export async function postTreeImpactBumpController(req, reply) {
  try {
    const payload = await bumpTreeImpactCounters(req.server, {
      source: req.body?.source || null,
    });
    return reply.send(payload);
  } catch (err) {
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || "Server error" });
  }
}

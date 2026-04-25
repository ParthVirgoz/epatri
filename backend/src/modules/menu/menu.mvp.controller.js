import { parseBody } from "./menu.validation.js";
import { putDraftBodySchema } from "./menu.mvp.schema.js";
import {
  getMyMenuStateMvp,
  publishDraftMenuMvp,
  upsertDraftMenuMvp,
  uploadPdfDraftMvp,
} from "./menu.mvp.service.js";

function sendError(reply, err) {
  const status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 400;
  return reply.code(status).send({ message: err.message });
}

export async function getMyMenuStateMvpController(req, reply) {
  try {
    const result = await getMyMenuStateMvp(req.server, req.user.id);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function putDraftMenuMvpController(req, reply) {
  try {
    const body = parseBody(putDraftBodySchema, req.body);
    const result = await upsertDraftMenuMvp(req.server, req.user.id, body);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function publishDraftMenuMvpController(req, reply) {
  try {
    const result = await publishDraftMenuMvp(req.server, req.user.id);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function uploadPdfDraftMvpController(req, reply) {
  try {
    const result = await uploadPdfDraftMvp(req.server, req);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

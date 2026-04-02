import { uploadMenuService } from "./menu.service.js";

export async function uploadMenuController(req, reply) {
  try {
    const result = await uploadMenuService(req.server, req);
    return reply.send(result);
  } catch (err) {
    return reply.code(400).send({ message: err.message });
  }
}
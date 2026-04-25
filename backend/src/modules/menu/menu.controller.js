import { uploadMenuService } from "./menu.service.js";
import { updateDigitalMenuService } from "./digitalMenu.service.js";
import {
  listMenusForLocationAdmin,
  createMenuForLocationAdmin,
  createMenuGroupForLocationAdmin,
  deleteMenuGroupAdmin,
  deleteMenuVersionAdmin,
  patchMenuAdmin,
  listSchedulesForMenuAdmin,
  replaceSchedulesForMenuAdmin,
} from "./menu.admin.service.js";
import { parseBody, parseUuidParam } from "./menu.validation.js";
import {
  createMenuBodySchema,
  createMenuGroupBodySchema,
  patchMenuBodySchema,
  putMenuSchedulesBodySchema,
  updateDigitalMenuBodySchema,
} from "./menu.schema.js";

function sendError(reply, err) {
  const status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 400;
  return reply.code(status).send({ message: err.message });
}

export async function uploadMenuController(req, reply) {
  try {
    const result = await uploadMenuService(req.server, req);
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function updateDigitalMenuController(req, reply) {
  try {
    const body = parseBody(updateDigitalMenuBodySchema, req.body);
    const result = await updateDigitalMenuService(
      req.server,
      req.user,
      body.digital_menu,
      body.menu_id,
    );
    return reply.send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function listMenusForLocationController(req, reply) {
  try {
    const locationId = parseUuidParam(req.params.locationId, "locationId");
    const result = await listMenusForLocationAdmin(req.server, req.user.id, locationId);
    return reply.send({ groups: result.groups || [], menus: result.menus || [] });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createMenuForLocationController(req, reply) {
  try {
    const locationId = parseUuidParam(req.params.locationId, "locationId");
    const body = parseBody(createMenuBodySchema, req.body);
    const data = await createMenuForLocationAdmin(req.server, req.user.id, locationId, body);
    return reply.code(201).send({ menu: data });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function createMenuGroupController(req, reply) {
  try {
    const locationId = parseUuidParam(req.params.locationId, "locationId");
    const body = parseBody(createMenuGroupBodySchema, req.body);
    const result = await createMenuGroupForLocationAdmin(req.server, req.user.id, locationId, body);
    return reply.code(201).send(result);
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteMenuGroupController(req, reply) {
  try {
    const groupId = parseUuidParam(req.params.groupId, "groupId");
    await deleteMenuGroupAdmin(req.server, req.user.id, groupId);
    return reply.code(204).send();
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function deleteMenuVersionController(req, reply) {
  try {
    const menuId = parseUuidParam(req.params.menuId, "menuId");
    await deleteMenuVersionAdmin(req.server, req.user.id, menuId);
    return reply.code(204).send();
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function patchMenuController(req, reply) {
  try {
    const menuId = parseUuidParam(req.params.menuId, "menuId");
    const body = parseBody(patchMenuBodySchema, req.body);
    const data = await patchMenuAdmin(req.server, req.user.id, menuId, body);
    return reply.send({ menu: data });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function getMenuSchedulesController(req, reply) {
  try {
    const menuId = parseUuidParam(req.params.menuId, "menuId");
    const rows = await listSchedulesForMenuAdmin(req.server, req.user.id, menuId);
    return reply.send({ schedules: rows });
  } catch (err) {
    return sendError(reply, err);
  }
}

export async function putMenuSchedulesController(req, reply) {
  try {
    const menuId = parseUuidParam(req.params.menuId, "menuId");
    const { schedules } = parseBody(putMenuSchedulesBodySchema, req.body);
    const rows = await replaceSchedulesForMenuAdmin(req.server, req.user.id, menuId, schedules);
    return reply.send({ schedules: rows });
  } catch (err) {
    return sendError(reply, err);
  }
}

import {
  createLocationForMyBusiness,
  listMyBusinessLocations,
  setupOnboardingForMyBusiness,
  checkBusinessSlugAvailability,
  getMasterMenuForMyBusiness,
  ensureMasterMenuForMyBusiness,
  patchLocationFollowMasterForMyBusiness,
  deleteLocationForMyBusiness,
  searchPlacesForOnboarding,
} from './business.service.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuidParam(value, label = 'id') {
  const s = String(value || '').trim();
  if (!UUID_RE.test(s)) {
    return { error: { statusCode: 400, message: `Invalid ${label}` } };
  }
  return { id: s };
}

export async function listMyLocationsController(req, reply) {
  try {
    const data = await listMyBusinessLocations(req.server, req.user.id);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function createMyLocationController(req, reply) {
  try {
    const data = await createLocationForMyBusiness(req.server, req.user.id, req.body || {});
    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function setupOnboardingController(req, reply) {
  try {
    const data = await setupOnboardingForMyBusiness(req.server, req.user.id, req.body || {});
    return reply.code(201).send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function checkOnboardingSlugController(req, reply) {
  try {
    const data = await checkBusinessSlugAvailability(req.server, req.user.id, {
      slug: req.query?.slug,
    });
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function searchOnboardingPlacesController(req, reply) {
  try {
    const data = await searchPlacesForOnboarding(req.server, req.query?.q);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function getMasterMenuController(req, reply) {
  try {
    const data = await getMasterMenuForMyBusiness(req.server, req.user.id);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function ensureMasterMenuController(req, reply) {
  try {
    const data = await ensureMasterMenuForMyBusiness(req.server, req.user.id);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function deleteMyLocationController(req, reply) {
  try {
    const parsed = parseUuidParam(req.params.locationId, 'locationId');
    if (parsed.error) {
      return reply.code(parsed.error.statusCode).send({ message: parsed.error.message });
    }
    await deleteLocationForMyBusiness(req.server, req.user.id, parsed.id);
    return reply.code(204).send();
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

export async function patchLocationFollowMasterController(req, reply) {
  try {
    const { locationId } = req.params;
    const follows = req.body?.follows_business_master_menu;
    if (typeof follows !== 'boolean') {
      return reply.code(400).send({ message: 'follows_business_master_menu (boolean) is required' });
    }
    const data = await patchLocationFollowMasterForMyBusiness(req.server, req.user.id, locationId, follows);
    return reply.send(data);
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ message: err.message });
  }
}

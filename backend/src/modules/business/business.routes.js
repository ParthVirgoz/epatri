import {
  createMyLocationController,
  listMyLocationsController,
  deleteMyLocationController,
  setupOnboardingController,
  checkOnboardingSlugController,
  searchOnboardingPlacesController,
  getMasterMenuController,
  ensureMasterMenuController,
  patchLocationFollowMasterController,
} from './business.controller.js';

export async function businessRoutes(fastify) {
  fastify.get('/me/locations', { preHandler: [fastify.authenticate] }, listMyLocationsController);
  fastify.post('/me/locations', { preHandler: [fastify.authenticate] }, createMyLocationController);
  fastify.delete('/me/locations/:locationId', { preHandler: [fastify.authenticate] }, deleteMyLocationController);
  fastify.patch(
    '/me/locations/:locationId/follow-master',
    { preHandler: [fastify.authenticate] },
    patchLocationFollowMasterController
  );
  fastify.get('/me/master-menu', { preHandler: [fastify.authenticate] }, getMasterMenuController);
  fastify.post('/me/master-menu/ensure', { preHandler: [fastify.authenticate] }, ensureMasterMenuController);
  fastify.get('/onboarding/slug-availability', { preHandler: [fastify.authenticate] }, checkOnboardingSlugController);
  fastify.get('/onboarding/place-search', { preHandler: [fastify.authenticate] }, searchOnboardingPlacesController);
  fastify.post('/onboarding/setup', { preHandler: [fastify.authenticate] }, setupOnboardingController);
}

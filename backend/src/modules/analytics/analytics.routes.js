import {
  trackMenuViewController,
  getAnalyticsSummaryController,
  getAnalyticsDetailController,
  streamAnalyticsEventsController,
} from './analytics.controller.js';

export async function analyticsRoutes(fastify) {
  fastify.post('/shop/:shop_username/track', trackMenuViewController);

  fastify.get('/shop/:shop_username/summary', {
    preHandler: [fastify.authenticate],
    handler: getAnalyticsSummaryController,
  });

  fastify.get('/shop/:shop_username/details', {
    preHandler: [fastify.authenticate],
    handler: getAnalyticsDetailController,
  });

  fastify.get('/shop/:shop_username/stream', {
    preHandler: [fastify.authenticate],
    handler: streamAnalyticsEventsController,
  });
}

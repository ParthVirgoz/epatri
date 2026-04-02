export async function analyticsRoutes(fastify) {
  fastify.post('/shop/:shop_username/track', async (request, reply) => {
    const { trackMenuViewController } = await import('./analytics.controller.js');
    return trackMenuViewController(request, reply);
  });

  fastify.get('/shop/:shop_username/summary', async (request, reply) => {
    const { getAnalyticsSummaryController } = await import('./analytics.controller.js');
    return getAnalyticsSummaryController(request, reply);
  });

  fastify.get('/shop/:shop_username/details', async (request, reply) => {
    const { getAnalyticsDetailController } = await import('./analytics.controller.js');
    return getAnalyticsDetailController(request, reply);
  });
}

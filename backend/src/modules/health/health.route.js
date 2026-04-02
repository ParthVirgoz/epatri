export async function healthRoute(fastify) {
  fastify.get('/', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
import { healthRoute } from '../modules/health/health.route.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { menuRoutes } from "../modules/menu/menu.routes.js";
import { shopRoutes } from '../modules/shop/shop.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';

export async function v1Routes(fastify) {
  fastify.register(healthRoute, { prefix: '/health' });
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(menuRoutes, { prefix: "/menu" });
  fastify.register(shopRoutes, { prefix: "/shop" });
  fastify.register(analyticsRoutes, { prefix: '/analytics' });
}
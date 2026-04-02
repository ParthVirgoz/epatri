import fp from 'fastify-plugin';

async function authPlugin(fastify) {
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      const token = request.headers.authorization?.split(" ")[1];

      if (!token) {
        return reply.code(401).send({ message: "No token" });
      }

      const { data, error } = await fastify.supabase.auth.getUser(token);

      if (error || !data.user) {
        return reply.code(401).send({ message: "Invalid token" });
      }

      request.user = data.user;
    } catch (err) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });
}

export default fp(authPlugin);
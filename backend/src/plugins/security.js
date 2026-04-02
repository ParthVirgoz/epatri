import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export async function securityPlugin(fastify) {
    await fastify.register(helmet, {
        crossOriginResourcePolicy: false,
    });

    console.log('🔍 [Security] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [Security] ALLOWED_ORIGINS env:', process.env.ALLOWED_ORIGINS);

    // For Vercel production, allow all vercel.app domains + localhost for dev
    const corsOptions = {
        origin: true, // Allow all origins in production (Vercel handles routing)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: false,
        maxAge: 86400,
    };

    console.log('🔐 [CORS] Registering with options:', corsOptions);

    await fastify.register(cors, corsOptions);
}
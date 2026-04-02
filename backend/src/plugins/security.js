import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export async function securityPlugin(fastify) {
    await fastify.register(helmet, {
        crossOriginResourcePolicy: false,
    });

    const defaultOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'https://epatri-be.vercel.app',
        'https://epatri-admin.vercel.app',
        'https://epatri.vercel.app',
    ];

    const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigins.join(',')).split(',').map(o => o.trim()).filter(Boolean);

    console.log('🔍 [Security] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [Security] ALLOWED_ORIGINS env:', process.env.ALLOWED_ORIGINS);
    console.log('🔍 [Security] Effective allowedOrigins:', allowedOrigins);

    const corsOptions = {
        origin: true, // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
        credentials: true,
        maxAge: 86400,
    };

    console.log('🔐 [CORS] Registering open mode (origin: true)');

    await fastify.register(cors, corsOptions);
}


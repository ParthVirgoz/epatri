import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export async function securityPlugin(fastify) {
    await fastify.register(helmet);

    // Get allowed origins from environment or use defaults
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:4321',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:4321',
          'http://127.0.0.1:5173',
        ];

    // Allow local network hosts like astro --host usage
    const allowedLocalHostPrefixes = ['http://192.168.', 'http://10.', 'http://172.'];

    console.log('🔐 CORS Origins allowed:', allowedOrigins);

    await fastify.register(cors, {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                return callback(null, true);
            }
            
            // Allow all localhost variations in development
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return callback(null, true);
            }

            // Allow local network requests like astro --host (192.168.x.x, 10.x.x.x, 172.x.x.x)
            if (allowedLocalHostPrefixes.some((prefix) => origin.startsWith(prefix))) {
                return callback(null, true);
            }
            
            // Check against allowed origins list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            
            console.warn('⚠️ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        maxAge: 86400, // 24 hours
    });
}
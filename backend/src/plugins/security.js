import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export async function securityPlugin(fastify) {
    await fastify.register(helmet);

    // Get allowed origins from environment or use defaults
    let allowedOrigins = [];
    
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
      console.log('🔐 CORS Origins from ENV:', allowedOrigins);
    } else {
      allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:4321',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:4321',
          'http://127.0.0.1:5173',
          'https://epatri.vercel.app',
        ];
      console.log('🔐 CORS Origins (defaults):', allowedOrigins);
    }

    // Allow local network hosts like astro --host usage
    const allowedLocalHostPrefixes = ['http://192.168.', 'http://10.', 'http://172.'];

    await fastify.register(cors, {
        origin: (origin, callback) => {
            console.log('🔍 [CORS] Incoming origin:', origin);

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                console.log('✅ [CORS] Allowed: no origin');
                return callback(null, true);
            }
            
            // Allow all localhost variations in development
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                console.log('✅ [CORS] Allowed: localhost');
                return callback(null, true);
            }

            // Allow local network requests (192.168.x.x, 10.x.x.x, 172.x.x.x)
            if (allowedLocalHostPrefixes.some((prefix) => origin.startsWith(prefix))) {
                console.log('✅ [CORS] Allowed: local network');
                return callback(null, true);
            }
            
            // Check exact match in allowed origins list
            if (allowedOrigins.includes(origin)) {
                console.log('✅ [CORS] Allowed: exact match in list');
                return callback(null, true);
            }

            // Allow any vercel.app domain in production
            if (origin.includes('vercel.app')) {
                console.log('✅ [CORS] Allowed: vercel.app domain');
                return callback(null, true);
            }
            
            console.warn('❌ [CORS] Blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: false,
        maxAge: 86400,
    });
}
import dotenv from 'dotenv';
dotenv.config();

export const env = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    /** Password reset email redirect (admin app URL) */
    ADMIN_FRONTEND_URL: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173',
    /** Optional full password reset redirect URL override. Example: https://admin.example.com/reset-password */
    PASSWORD_RESET_REDIRECT_URL: process.env.PASSWORD_RESET_REDIRECT_URL || '',
};
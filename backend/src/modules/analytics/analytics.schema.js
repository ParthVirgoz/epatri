import { z } from 'zod';

export const trackAnalyticsSchema = z.object({
  shop_id: z.string().uuid('Invalid shop ID'),
  shop_username: z.string().min(1, 'Shop username is required'),
  device_type: z.enum(['mobile', 'tablet', 'desktop']).default('desktop'),
  browser: z.string().optional().nullable(),
  os: z.string().optional().nullable(),
  os_version: z.string().optional().nullable(),
  device_brand: z.string().optional().nullable(),
  user_agent: z.string().default('unknown'),
  ip_address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  referrer: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
}).strict(false);  // Allow extra fields

export const analyticsQuerySchema = z.object({
  shop_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  device_type: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

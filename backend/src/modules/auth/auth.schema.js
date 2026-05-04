import { z } from 'zod';
import {
  isAuthEmailAllowed,
  AUTH_EMAIL_REJECT_MESSAGE,
  STRONG_PASSWORD_REGEX,
  AUTH_PASSWORD_POLICY_MESSAGE,
} from '../../auth.credentials.js';

export const authEmailSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
  z
    .string()
    .email({ message: 'Invalid email address' })
    .refine((s) => isAuthEmailAllowed(s), { message: AUTH_EMAIL_REJECT_MESSAGE }),
);

export const authPasswordSchema = z
  .string()
  .regex(STRONG_PASSWORD_REGEX, { message: AUTH_PASSWORD_POLICY_MESSAGE });

export const registerSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
  shop_username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal('')),
  shop_name: z.string().max(120).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const refreshSessionSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

export const forgotPasswordSchema = z.object({
  email: authEmailSchema,
});

export const resetPasswordSchema = z.object({
  password: authPasswordSchema,
  access_token: z.string().min(1, 'access_token is required'),
});

const MAX_LOGO_DATA_URL_CHARS = 3_500_000;

export const updateMeSchema = z
  .object({
    shop_name: z.string().trim().min(1).max(120).optional(),
    shop_logo_data_url: z
      .preprocess(
        (v) => (v === "" ? null : v),
        z
          .union([
            z
              .string()
              .max(MAX_LOGO_DATA_URL_CHARS)
              .refine(
                (s) => s.startsWith("data:image/") || s.startsWith("https://"),
                { message: "Logo must be an image (data URL) or an https URL" },
              ),
            z.null(),
          ])
          .optional(),
      ),
    preferences: z
      .object({
        mode: z.enum(['basic', 'advanced']).optional(),
        enableMultiMenu: z.boolean().optional(),
        enableSchedules: z.boolean().optional(),
        interactiveTheme: z
          .object({
            surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            surfaceTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            brandNameColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            itemsColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            categoryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            priceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            menuCardColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
            currencySymbol: z.string().trim().min(1).max(6).optional(),
          })
          .passthrough()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

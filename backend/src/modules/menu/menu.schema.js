import { z } from 'zod';
import {
  MAX_MENU_TITLE_LENGTH,
  MAX_SCHEDULE_RULES_PER_MENU_GROUP,
} from './menu.constants.js';

export const uuidParamSchema = z.string().uuid('Invalid id');

const dateYmd = z
  .string()
  .max(32)
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional()
  .nullable();

export const createMenuGroupBodySchema = z
  .object({
    title: z.string().max(MAX_MENU_TITLE_LENGTH).optional(),
    first_version_title: z.string().max(MAX_MENU_TITLE_LENGTH).optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict();

export const createMenuBodySchema = z
  .object({
    title: z.string().max(MAX_MENU_TITLE_LENGTH).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    menu_group_id: z.string().uuid().optional(),
    is_default: z.boolean().optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
    pdf_url: z.union([z.string().max(2048), z.literal('')]).optional(),
    digital_menu: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const patchMenuBodySchema = z
  .object({
    title: z.string().max(MAX_MENU_TITLE_LENGTH).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
    pdf_url: z.union([z.string().max(2048), z.literal(''), z.null()]).optional(),
    digital_menu: z.record(z.string(), z.unknown()).optional(),
    is_default: z.boolean().optional(),
    display_as: z.enum(['pdf', 'interactive']).nullable().optional(),
  })
  .strict();

const scheduleRowSchema = z
  .object({
    schedule_type: z.enum(['always', 'weekly', 'date_range', 'single_date']),
    days_of_week: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional().nullable(),
    valid_from: dateYmd,
    valid_to: dateYmd,
    single_date: dateYmd,
    time_start: z.string().max(16).optional().nullable(),
    time_end: z.string().max(16).optional().nullable(),
    priority: z.coerce.number().int().min(0).max(999_999).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const putMenuSchedulesBodySchema = z
  .object({
    schedules: z.array(scheduleRowSchema).max(MAX_SCHEDULE_RULES_PER_MENU_GROUP),
  })
  .strict();

export const updateDigitalMenuBodySchema = z
  .object({
    menu_id: z.string().uuid().optional(),
    digital_menu: z.record(z.string(), z.unknown()),
  })
  .strict();

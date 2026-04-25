import { z } from "zod";

export const menuTypeSchema = z.enum(["pdf", "interactive"]);

export const putDraftBodySchema = z
  .object({
    menu_type: menuTypeSchema,
    title: z.string().trim().min(1).max(120).optional(),
    pdf_url: z.union([z.string().trim().url().max(2048), z.literal("")]).optional(),
    digital_menu: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.menu_type === "interactive" && val.digital_menu != null && typeof val.digital_menu !== "object") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "digital_menu must be an object",
        path: ["digital_menu"],
      });
    }
  });

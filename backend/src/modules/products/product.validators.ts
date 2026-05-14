import { z } from 'zod';

const productBaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().int().min(0),
  category: z.enum(['coffee', 'dessert']),
  description: z.string().trim().max(500).optional(),
  isAvailable: z.boolean().optional(),
  isRedeemable: z.boolean().optional(),
  redeemPoints: z.literal(3).optional()
});

export const createProductSchema = productBaseSchema;

export const updateProductSchema = productBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

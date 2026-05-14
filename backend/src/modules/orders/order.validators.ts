import { z } from 'zod';

const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99)
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1)
});

export const createGuestOrderSchema = createOrderSchema.extend({
  guestInfo: z.object({
    name: z.string().trim().min(1).max(50),
    phone: z.string().regex(/^09\d{8}$/),
    email: z.string().email().optional()
  })
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready', 'completed', 'cancelled'])
});

export const createRedeemOrderSchema = z.object({
  productId: z.string().min(1)
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateGuestOrderInput = z.infer<typeof createGuestOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateRedeemOrderInput = z.infer<typeof createRedeemOrderSchema>;

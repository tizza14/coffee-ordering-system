import { z } from 'zod';

export const linePayRequestSchema = z.object({
  orderId: z.string().min(1)
});

export const linePayConfirmSchema = z.object({
  transactionId: z.string().min(1),
  orderId: z.string().min(1)
});

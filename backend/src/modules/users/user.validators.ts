import { z } from 'zod';

export const updateRoleSchema = z.object({
  role: z.enum(['user', 'staff', 'admin'])
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

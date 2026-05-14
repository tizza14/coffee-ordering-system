import { Router } from 'express';
import { validateBody } from '../../middlewares/validate.middleware';
import * as paymentController from './payment.controller';
import { linePayConfirmSchema, linePayRequestSchema } from './payment.validators';

export const paymentRoutes = Router();

paymentRoutes.post(
  '/line-pay/request',
  validateBody(linePayRequestSchema),
  paymentController.requestLinePay
);
paymentRoutes.post(
  '/line-pay/confirm',
  validateBody(linePayConfirmSchema),
  paymentController.confirmLinePay
);
paymentRoutes.get('/line-pay/cancel', paymentController.cancelLinePay);

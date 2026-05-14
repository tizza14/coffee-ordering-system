import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import * as productController from './product.controller';
import { createProductSchema, updateProductSchema } from './product.validators';

export const productRoutes = Router();

productRoutes.get('/', productController.listProducts);
productRoutes.post(
  '/',
  authenticate,
  authorize(['admin']),
  validateBody(createProductSchema),
  productController.createProduct
);
productRoutes.put(
  '/:id',
  authenticate,
  authorize(['admin']),
  validateBody(updateProductSchema),
  productController.updateProduct
);
productRoutes.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  productController.deleteProduct
);

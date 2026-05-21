import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { uploadImage } from '../../middlewares/upload.middleware';
import * as productController from './product.controller';
import { createProductSchema, updateProductSchema } from './product.validators';

export const productRoutes = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List available products
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [coffee, non-coffee, food] }
 *       - in: query
 *         name: isRedeemable
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 */
productRoutes.get('/', productController.listProducts);

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *               category: { type: string, enum: [coffee, non-coffee, food] }
 *               description: { type: string }
 *               isAvailable: { type: boolean }
 *               isRedeemable: { type: boolean }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
productRoutes.post(
  '/',
  authenticate,
  authorize(['admin']),
  validateBody(createProductSchema),
  productController.createProduct
);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *               category: { type: string, enum: [coffee, non-coffee, food] }
 *               description: { type: string }
 *               isAvailable: { type: boolean }
 *               isRedeemable: { type: boolean }
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
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

productRoutes.post(
  '/:id/image',
  authenticate,
  authorize(['admin']),
  uploadImage,
  productController.uploadProductImage
);

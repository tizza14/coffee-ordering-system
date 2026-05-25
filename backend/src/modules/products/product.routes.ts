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
 *         schema: { type: string, enum: [coffee, dessert] }
 *       - in: query
 *         name: available
 *         schema: { oneOf: [{ type: boolean }, { type: string, enum: [all] }] }
 *         description: Defaults to true. Use false for hidden products or all for admin listings.
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
 *               category: { type: string, enum: [coffee, dessert] }
 *               description: { type: string }
 *               isAvailable: { type: boolean }
 *               isRedeemable: { type: boolean }
 *           example:
 *             name: 測試拿鐵
 *             description: 濃縮咖啡加牛奶
 *             price: 120
 *             category: coffee
 *             isAvailable: true
 *             isRedeemable: false
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
 *               category: { type: string, enum: [coffee, dessert] }
 *               description: { type: string }
 *               isAvailable: { type: boolean }
 *               isRedeemable: { type: boolean }
 *           example:
 *             name: 測試拿鐵（更新）
 *             price: 150
 *             isAvailable: false
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

/**
 * @openapi
 * /products/{id}/image:
 *   post:
 *     tags: [Products]
 *     summary: Upload or replace a product image (admin only)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product image uploaded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *   delete:
 *     tags: [Products]
 *     summary: Remove a product image (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product image removed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 */
productRoutes.post(
  '/:id/image',
  authenticate,
  authorize(['admin']),
  uploadImage,
  productController.uploadProductImage
);
productRoutes.delete(
  '/:id/image',
  authenticate,
  authorize(['admin']),
  productController.removeProductImage
);

import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as productService from './product.service';

function parsePage(value: unknown) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseLimit(value: unknown) {
  const limit = Number(value ?? 20);
  if (!Number.isInteger(limit) || limit < 1) return 20;
  return Math.min(limit, 100);
}

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const category =
      req.query.category === 'coffee' || req.query.category === 'dessert'
        ? req.query.category
        : undefined;
    const available =
      req.query.available === undefined
        ? undefined
        : String(req.query.available) === 'true';

    const result = await productService.listProducts({
      category,
      available,
      page: parsePage(req.query.page),
      limit: parseLimit(req.query.limit)
    });

    res.json(result);
  }
);

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.updateProduct(
      getParam(req.params.id),
      req.body
    );
    res.json(product);
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.deleteProduct(getParam(req.params.id));
    res.status(204).send();
  }
);

export const uploadProductImage = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: '請上傳圖片檔案' });
      return;
    }
    const product = await productService.uploadProductImage(
      getParam(req.params.id),
      req.file.buffer,
      req.file.mimetype
    );
    res.json(product);
  }
);

import { ProductModel } from './product.model';
import { ApiError } from '../../utils/ApiError';
import type { CreateProductInput, UpdateProductInput } from './product.validators';

export interface ProductListQuery {
  category?: 'coffee' | 'dessert';
  available?: boolean;
  page: number;
  limit: number;
}

export async function listProducts(query: ProductListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (typeof query.available === 'boolean') filter.isAvailable = query.available;

  const skip = (query.page - 1) * query.limit;
  const [products, total] = await Promise.all([
    ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    ProductModel.countDocuments(filter)
  ]);

  return {
    data: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      isAvailable: product.isAvailable,
      isRedeemable: product.isRedeemable,
      redeemPoints: product.redeemPoints
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total
    }
  };
}

function toProductResponse(product: {
  _id: unknown;
  name: string;
  price: number;
  category: string;
  description: string;
  isAvailable: boolean;
  isRedeemable: boolean;
  redeemPoints: number;
}) {
  return {
    id: String(product._id),
    name: product.name,
    price: product.price,
    category: product.category,
    description: product.description,
    isAvailable: product.isAvailable,
    isRedeemable: product.isRedeemable,
    redeemPoints: product.redeemPoints
  };
}

export async function createProduct(input: CreateProductInput) {
  const product = await ProductModel.create(input);
  return toProductResponse(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await ProductModel.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true
  });

  if (!product) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Product not found');
  }

  return toProductResponse(product);
}

export async function deleteProduct(id: string) {
  const product = await ProductModel.findByIdAndDelete(id);

  if (!product) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Product not found');
  }
}

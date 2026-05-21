import { ProductModel } from './product.model';
import { ApiError } from '../../utils/ApiError';
import { cloudinary } from '../../config/cloudinary';
import type {
  CreateProductInput,
  UpdateProductInput
} from './product.validators';

export interface ProductListQuery {
  category?: 'coffee' | 'dessert';
  available?: boolean;
  page: number;
  limit: number;
}

export async function listProducts(query: ProductListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (typeof query.available === 'boolean')
    filter.isAvailable = query.available;

  const skip = (query.page - 1) * query.limit;
  const [products, total] = await Promise.all([
    ProductModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    ProductModel.countDocuments(filter)
  ]);

  return {
    data: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
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
  imageUrl?: string;
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
    imageUrl: product.imageUrl ?? '',
    isAvailable: product.isAvailable,
    isRedeemable: product.isRedeemable,
    redeemPoints: product.redeemPoints
  };
}

function uploadToCloudinary(buffer: Buffer, mimetype: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const format = mimetype.split('/')[1];
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'coffee-products', resource_type: 'image', format },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadProductImage(id: string, buffer: Buffer, mimetype: string) {
  const product = await ProductModel.findById(id);
  if (!product) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Product not found');
  }

  // 刪除 Cloudinary 上的舊圖
  if (product.imageUrl) {
    const match = product.imageUrl.match(/\/coffee-products\/([^.]+)/);
    if (match) {
      await cloudinary.uploader.destroy(`coffee-products/${match[1]}`).catch(() => null);
    }
  }

  const imageUrl = await uploadToCloudinary(buffer, mimetype);
  product.imageUrl = imageUrl;
  await product.save();
  return toProductResponse(product);
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

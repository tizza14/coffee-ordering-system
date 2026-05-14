import { http } from './http';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'coffee' | 'dessert';
  description: string;
  isAvailable: boolean;
  isRedeemable: boolean;
  redeemPoints: number;
}

export interface ProductListResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ProductListQuery {
  available?: boolean;
}

export type ProductPayload = Omit<Product, 'id'>;

export async function getProducts(query: ProductListQuery = {}) {
  const response = await http.get<ProductListResponse>('/products', {
    params: query
  });
  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await http.post<Product>('/products', payload);
  return response.data;
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>) {
  const response = await http.put<Product>(`/products/${id}`, payload);
  return response.data;
}

export async function deleteProduct(id: string) {
  await http.delete(`/products/${id}`);
}

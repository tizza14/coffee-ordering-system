import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductAdminStore } from './product-admin.store';
import * as productApi from '../api/product.api';

vi.mock('../api/product.api', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn()
}));

const mockedProductApi = vi.mocked(productApi);
const product = {
  id: 'p1',
  name: 'Latte',
  price: 120,
  category: 'coffee' as const,
  description: 'Milk coffee',
  isAvailable: true,
  isRedeemable: false,
  redeemPoints: 3
};

describe('productAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('loads admin products including unavailable items', async () => {
    mockedProductApi.getProducts.mockResolvedValue({
      data: [product],
      pagination: { page: 1, limit: 20, total: 1 }
    });
    const store = useProductAdminStore();

    await store.loadProducts();

    expect(mockedProductApi.getProducts).toHaveBeenCalledWith({
      available: false
    });
    expect(store.products).toHaveLength(1);
  });

  it('creates, updates, and deletes a product locally', async () => {
    mockedProductApi.createProduct.mockResolvedValue(product);
    mockedProductApi.updateProduct.mockResolvedValue({
      ...product,
      name: 'Americano'
    });
    mockedProductApi.deleteProduct.mockResolvedValue();
    const store = useProductAdminStore();

    await store.createProduct({
      name: 'Latte',
      price: 120,
      category: 'coffee',
      description: 'Milk coffee',
      isAvailable: true,
      isRedeemable: false,
      redeemPoints: 3
    });
    await store.updateProduct('p1', { name: 'Americano' });
    await store.deleteProduct('p1');

    expect(store.products).toHaveLength(0);
    expect(mockedProductApi.updateProduct).toHaveBeenCalledWith('p1', {
      name: 'Americano'
    });
    expect(mockedProductApi.deleteProduct).toHaveBeenCalledWith('p1');
  });
});

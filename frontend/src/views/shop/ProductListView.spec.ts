import { createPinia, setActivePinia } from 'pinia';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductListView from './ProductListView.vue';
import * as productApi from '../../api/product.api';
import { useCartStore } from '../../stores/cart.store';

vi.mock('../../api/product.api', () => ({
  getProducts: vi.fn()
}));

const mockedProductApi = vi.mocked(productApi);

function renderProductListView() {
  return render(ProductListView, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>'
        }
      }
    }
  });
}

describe('ProductListView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    mockedProductApi.getProducts.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Latte',
          price: 120,
          category: 'coffee',
          description: 'Milk coffee',
          isAvailable: true,
          isRedeemable: false,
          redeemPoints: 3
        },
        {
          id: 'p2',
          name: 'Brownie',
          price: 80,
          category: 'dessert',
          description: 'Chocolate dessert',
          isAvailable: true,
          isRedeemable: true,
          redeemPoints: 3
        }
      ],
      pagination: { page: 1, limit: 20, total: 2 }
    });
  });

  it('loads products and adds an item to cart', async () => {
    renderProductListView();

    await screen.findByText('Latte');
    await fireEvent.click(screen.getAllByRole('button', { name: '加入' })[0]);

    const cartStore = useCartStore();
    expect(cartStore.items).toHaveLength(1);
    expect(cartStore.totalAmount).toBe(120);
    expect(screen.getAllByText('NT$ 120').length).toBeGreaterThan(0);
  });

  it('shows product image when imageUrl is provided', async () => {
    mockedProductApi.getProducts.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Latte',
          price: 120,
          category: 'coffee',
          description: 'Milk coffee',
          isAvailable: true,
          isRedeemable: false,
          redeemPoints: 3,
          imageUrl: 'https://example.com/latte.jpg'
        }
      ],
      pagination: { page: 1, limit: 20, total: 1 }
    });

    renderProductListView();

    const img = await screen.findByRole('img', { name: 'Latte' });
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toBe('https://example.com/latte.jpg');
  });

  it('shows placeholder when imageUrl is not provided', async () => {
    renderProductListView();

    await screen.findByText('Latte');
    const imgs = document.querySelectorAll('img');
    expect(imgs).toHaveLength(0);
    const placeholders = document.querySelectorAll('svg');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('filters products by category', async () => {
    renderProductListView();

    await screen.findByText('Latte');
    await fireEvent.click(screen.getByRole('button', { name: '甜點' }));

    await waitFor(() => {
      expect(screen.queryByText('Latte')).toBeNull();
      expect(screen.getByText('Brownie')).toBeTruthy();
    });
  });
});

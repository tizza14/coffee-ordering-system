import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cart.store';

const latte = {
  id: 'p1',
  name: 'Latte',
  price: 120,
  category: 'coffee' as const,
  description: 'Milk coffee',
  isAvailable: true,
  isRedeemable: false,
  redeemPoints: 3
};

describe('cartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds products, updates quantity, and removes products', () => {
    const cartStore = useCartStore();

    cartStore.addProduct(latte);
    cartStore.addProduct(latte);
    cartStore.updateQuantity('p1', 3);
    cartStore.increment('p1');
    cartStore.decrement('p1');

    expect(cartStore.items).toHaveLength(1);
    expect(cartStore.items[0].quantity).toBe(3);
    expect(cartStore.totalAmount).toBe(360);

    cartStore.removeProduct('p1');
    expect(cartStore.items).toHaveLength(0);
  });

  it('removes item when decrementing from one', () => {
    const cartStore = useCartStore();

    cartStore.addProduct(latte);
    cartStore.decrement('p1');

    expect(cartStore.items).toHaveLength(0);
  });
});

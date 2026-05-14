import { defineStore } from 'pinia';
import type { Product } from '../api/product.api';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[]
  }),
  getters: {
    totalAmount: (state) =>
      state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  },
  actions: {
    addProduct(product: Product) {
      const existingItem = this.items.find((item) => item.productId === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
        return;
      }

      this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    },
    updateQuantity(productId: string, quantity: number) {
      if (quantity < 1 || quantity > 99) return;
      const item = this.items.find((cartItem) => cartItem.productId === productId);
      if (item) item.quantity = quantity;
    },
    increment(productId: string) {
      const item = this.items.find((cartItem) => cartItem.productId === productId);
      if (item && item.quantity < 99) item.quantity += 1;
    },
    decrement(productId: string) {
      const item = this.items.find((cartItem) => cartItem.productId === productId);
      if (!item) return;
      if (item.quantity === 1) {
        this.removeProduct(productId);
        return;
      }
      item.quantity -= 1;
    },
    removeProduct(productId: string) {
      this.items = this.items.filter((item) => item.productId !== productId);
    },
    clearCart() {
      this.items = [];
    }
  }
});

import { defineStore } from 'pinia';
import * as productApi from '../api/product.api';

export const useProductAdminStore = defineStore('productAdmin', {
  state: () => ({
    products: [] as productApi.Product[],
    isLoading: false
  }),
  actions: {
    async loadProducts() {
      this.isLoading = true;
      try {
        const result = await productApi.getProducts({ available: false });
        this.products = result.data;
      } finally {
        this.isLoading = false;
      }
    },
    async createProduct(payload: productApi.ProductPayload) {
      const product = await productApi.createProduct(payload);
      this.products = [product, ...this.products];
      return product;
    },
    async updateProduct(
      id: string,
      payload: Partial<productApi.ProductPayload>
    ) {
      const product = await productApi.updateProduct(id, payload);
      this.products = this.products.map((item) =>
        item.id === product.id ? product : item
      );
      return product;
    },
    async deleteProduct(id: string) {
      await productApi.deleteProduct(id);
      this.products = this.products.filter((product) => product.id !== id);
    }
  }
});

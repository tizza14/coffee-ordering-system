import { defineStore } from 'pinia';
import * as paymentApi from '../api/payment.api';

export const usePaymentStore = defineStore('payments', {
  state: () => ({
    transactionId: '',
    paymentUrl: '',
    paymentStatus: '',
    isLoading: false
  }),
  actions: {
    async requestLinePay(orderId: string, guestToken?: string) {
      this.isLoading = true;
      try {
        const result = await paymentApi.requestLinePay(orderId, guestToken);
        this.transactionId = result.transactionId;
        this.paymentUrl = result.paymentUrl;
        this.paymentStatus = result.paymentStatus;
        return result;
      } finally {
        this.isLoading = false;
      }
    },
    async confirmLinePay(
      orderId: string,
      transactionId: string,
      guestToken?: string
    ) {
      this.isLoading = true;
      try {
        const result = await paymentApi.confirmLinePay(
          orderId,
          transactionId,
          guestToken
        );
        this.paymentStatus = result.paymentStatus;
        return result;
      } finally {
        this.isLoading = false;
      }
    }
  }
});

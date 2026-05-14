import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    provider: { type: String, enum: ['line_pay'], default: 'line_pay' },
    transactionId: String,
    merchantOrderId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'TWD' },
    status: {
      type: String,
      enum: ['payment_pending', 'paid', 'payment_failed', 'refunded'],
      required: true
    },
    rawRequest: Schema.Types.Mixed,
    rawResponse: Schema.Types.Mixed,
    confirmedAt: Date
  },
  { timestamps: true }
);

paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ merchantOrderId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PaymentModel = mongoose.model('Payment', paymentSchema);

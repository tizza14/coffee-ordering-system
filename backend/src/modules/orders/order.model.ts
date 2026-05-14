import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestInfo: {
      name: String,
      phone: String,
      email: String
    },
    orderLookupCode: String,
    guestTokenHash: String,
    guestTokenExpiresAt: Date,
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    orderType: { type: String, enum: ['purchase', 'redeem'], default: 'purchase' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'payment_pending', 'paid', 'payment_failed', 'refunded'],
      default: 'unpaid'
    },
    linePayTransactionId: String,
    linePayOrderId: String,
    paidAmount: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ orderLookupCode: 1 }, { unique: true, sparse: true });
orderSchema.index({ linePayOrderId: 1 }, { unique: true, sparse: true });

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const OrderModel = mongoose.model('Order', orderSchema);

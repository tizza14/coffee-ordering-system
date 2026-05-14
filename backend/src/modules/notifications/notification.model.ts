import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestOrderLookupCode: String,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    audience: {
      type: String,
      enum: ['user', 'guest', 'staff'],
      required: true
    },
    type: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({
  guestOrderLookupCode: 1,
  orderId: 1,
  createdAt: -1
});

export type NotificationDocument = InferSchemaType<
  typeof notificationSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const NotificationModel = mongoose.model(
  'Notification',
  notificationSchema
);

import mongoose, { type Document, Schema } from 'mongoose';

export interface PushSubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { auth: string; p256dh: string };
  createdAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true },
    keys: {
      auth:    { type: String, required: true },
      p256dh:  { type: String, required: true }
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One subscription per endpoint (upsert-safe)
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel = mongoose.model<PushSubscriptionDocument>(
  'PushSubscription',
  pushSubscriptionSchema
);

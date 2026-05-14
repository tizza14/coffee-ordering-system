import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: ['coffee', 'dessert'], required: true },
    description: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    isRedeemable: { type: Boolean, default: false },
    redeemPoints: { type: Number, enum: [3], default: 3 }
  },
  { timestamps: true }
);

productSchema.index({ category: 1, isAvailable: 1, isRedeemable: 1 });

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProductModel = mongoose.model('Product', productSchema);

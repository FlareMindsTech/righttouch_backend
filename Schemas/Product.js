import mongoose from "mongoose";

const ProductSchema = mongoose.Schema({
  productName: {
    type: String,
    require: true,
  },
  productDescription: {
    type: String,
    require: true,
  },
  productPrice: {
    type: Number,
    require: true,
  },
  productDiscountPrice: {
    type: Number,
    require: true,
  },
  productImage: {
    type: [String],
    default: [],
  },
  productBrand: {
    type: String,
    require: true,
  },
  productFeatures: {
    type: [String],
    default:[]
  },
  status: {
    type: String,
    enum: ["Available", "Unavailable"],
    default: "Available"
  },
  warranty: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Product", ProductSchema);
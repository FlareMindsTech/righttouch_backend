import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true, // fixed
      trim: true,
    },
    productDescription: {
      type: String,
      required: true, // fixed
      trim: true,
    },
    productPrice: {
      type: Number,
      required: true, // fixed
      min: [0, "Price cannot be negative"],
    },
    productDiscountPrice: {
      type: Number,
      required: true, // fixed
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (value) {
          return value <= this.productPrice;
        },
        message: "Discount price cannot exceed product price",
      },
    },
    productImage: {
      type: [String],
      default: [],
    },
    productBrand: {
      type: String,
      required: true, // fixed
      trim: true,
    },
    productFeatures: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    warranty: {
      type: String,
      default: "No warranty",
    },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

export default mongoose.model("Product", ProductSchema);

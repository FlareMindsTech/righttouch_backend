import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    label: {
      type: String,
      enum: ["home", "office", "other", "Home", "Office", "Other"],
      default: "home",
    },

    name: String, // Person name
    phone: String,

    addressLine: {
      type: String,
      required: true,
    },

    city: String,
    state: String,
    pincode: String,

    latitude: Number, // optional (future map support)
    longitude: Number,

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Address ||
  mongoose.model("Address", addressSchema);

import mongoose from "mongoose";
const ProductBookingSchema = new mongoose.Schema({
  ProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    require: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required : true
  },
  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },
    createdAt: { type: Date, default: Date.now },

});

export default mongoose.model("ProductBooking", ProductBookingSchema)
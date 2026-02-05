import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      required: true,
      unique: true,
    },

    provider: {
      type: String,
      default: "razorpay",
    },

    currency: {
      type: String,
      default: "INR",
    },

    providerOrderId: String,
    providerPaymentId: String,
    providerSignature: String,

    baseAmount: Number,
    totalAmount: Number,
    commissionAmount: Number,
    technicianAmount: Number,

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    failureReason: String,
    verifiedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

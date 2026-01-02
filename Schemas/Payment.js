const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      required: true,
      unique: true,
    },

    baseAmount: Number,
    extraAmount: { type: Number, default: 0 },
    totalAmount: Number,

    commissionAmount: Number,
    technicianAmount: Number,

    paymentMode: {
      type: String,
      enum: ["online", "cash"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

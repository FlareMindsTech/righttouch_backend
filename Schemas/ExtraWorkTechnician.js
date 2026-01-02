const extraWorkSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    approvedByCustomer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExtraWork", extraWorkSchema);

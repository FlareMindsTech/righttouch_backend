import mongoose from "mongoose";

const technicianWalletSchema = new mongoose.Schema(
  {
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TechnicianProfile",
      required: true,
      unique: true
    },
    balance: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// ✅ One job-credit per booking (prevents double-credit)
walletTransactionSchema.index(
  { bookingId: 1, type: 1, source: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $type: "objectId" },
      type: "credit",
      source: "job",
    },
  }
);

export default mongoose.models.WalletTransaction || mongoose.model("WalletTransaction", walletTransactionSchema);
                

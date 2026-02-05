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

export default mongoose.model("TechnicianWallet", technicianWalletSchema);

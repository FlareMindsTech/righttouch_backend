import mongoose from "mongoose";
const technicianSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    skills: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
      },
    ],

    trainingCompleted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["pending", "trained", "approved", "suspended"],
      default: "pending",
    },

    availability: {
      isOnline: {
        type: Boolean,
        default: false,
      },
    },

    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    walletBalance: {
      type: Number,
      default: 0,
    },

    totalJobsCompleted: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Technician || mongoose.model("Technician", technicianSchema);

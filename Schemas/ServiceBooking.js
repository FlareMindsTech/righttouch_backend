import mongoose from "mongoose";

const serviceBookingSchema = new mongoose.Schema(
  {
    // 👤 CUSTOMER
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🛠 SERVICE
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    // 👨‍🔧 TECHNICIAN (assigned after accept)
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
      index: true,
    },

    // 💰 PRICE SNAPSHOT
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // 📍 ADDRESS
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // ⏰ SCHEDULE
    scheduledAt: {
      type: Date,
      // required: true,
    },

    // 📌 STATUS FLOW
    status: {
      type: String,
      enum: [
        "requested",
        "broadcasted",
        "accepted",
        "on_the_way",
        "reached",
        "in_progress",
        "completed",
        "cancelled",
      ],
      default: "requested",
      index: true,
    },
  },
  { timestamps: true }
);

// Helpful index for technician dashboard
serviceBookingSchema.index({ technicianId: 1, status: 1 });

export default mongoose.model("ServiceBooking", serviceBookingSchema);

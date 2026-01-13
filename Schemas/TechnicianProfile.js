import mongoose from "mongoose";

const technicianProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    firstName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    mobileNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, "Invalid mobile number"],
    },

    /* ==========================
       📍 FIXED OFFICIAL ADDRESS
    ========================== */
    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, "Invalid pincode"],
    },

    /* ==========================
       🛠 WORK DETAILS
    ========================== */
    locality: {
      type: String,
      trim: true, // service area / working locality
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    specialization: {
      type: String,
      trim: true,
    },

    certifications: [
      {
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        expiryDate: Date,
      },
    ],

    /* ==========================
       🔧 TECHNICIAN OPERATIONAL DATA
    ========================== */
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

    profileComplete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.TechnicianProfile ||
  mongoose.model("TechnicianProfile", technicianProfileSchema);

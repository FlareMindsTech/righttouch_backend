import mongoose from "mongoose";
const tempUserSchema = new mongoose.Schema(
  {
  firstName: {
    type: String,
    required: [true, "First name is required"],
    minlength: [3, "First name must be at least 3 characters"],
    maxlength: [50, "First name cannot exceed 50 characters"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
    minlength: [1, "Last name must be at least 1 character"],
    maxlength: [50, "Last name cannot exceed 50 characters"],
},
    username: {
      type: String,
      required: true,
      unique: true, // auto-generated during signup
    }, 
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    mobileNumber: {
      type: String,
      unique: true,
      required: true,
      match: /^[0-9]{10}$/,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
    role: {
      type: String,
      enum: ["Owner", "Customer", "Technician", "Developer"],
      required: true,
    },
    locality: {
      type: String,
      required: function () {
        return this.role === "Technician";
      },
    },
  },
  { timestamps: true }
);
export default mongoose.model("TempUser", tempUserSchema);

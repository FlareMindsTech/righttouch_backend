import mongoose from "mongoose";

const technicianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", //   your main User model
    required: true
  },

  panNumber: {
    type: String,
    match: /^[A-Z]{5}[0-9]{4}[A-Z ]{1}$/, // Format: ABCDE1234F
    required: true,
    unique: true
  },

  aadhaarNumber: {
    type: String,
    match: /^\d{12}$/, // Aadhaar should be 12 digits
    required: true,
    unique: true
  },

  passportNumber: {
    type: String,
    match: /^[A-PR-WY][1-9]\d{6}$/, // Indian Passport format
    required: false,
    unique: true,
    sparse: true // allows null/empty without uniqueness conflicts
  },

  drivingLicenseNumber: {
    type: String,
    match: /^[A-Z]{2}\d{2} \d{11}$/, // Example: TN10 20202020202
    required: true,
    unique: true
  },

 documents: {
  panCard: 
  { data: Buffer, 
    contentType: String 
  },
  aadhaarCard: 
  { 
    data: Buffer, 
    contentType: String 
  },
  passport: 
  { data: Buffer, 
    contentType: String 
  },
  drivingLicense: 
  { data: Buffer, 
    contentType: String 
  }
},


  balance: {
    type: Number,
    default: 0,
    min: 0
  },

  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "active"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Technician", technicianSchema);

 
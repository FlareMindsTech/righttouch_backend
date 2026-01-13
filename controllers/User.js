import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Otp from "../Schemas/Otp.js";
import TempUser from "../Schemas/TempUser.js";

import OwnerProfile from "../Schemas/OwnerProfile.js";
import AdminProfile from "../Schemas/AdminProfile.js";
import TechnicianProfile from "../Schemas/TechnicianProfile.js";
import CustomerProfile from "../Schemas/CustomerProfile.js";

import sendSms from "../utils/sendSMS.js";

/* ======================================================
   CONSTANTS & HELPERS
====================================================== */

const roleModelMap = {
  Owner: OwnerProfile,
  Admin: AdminProfile,
  Technician: TechnicianProfile,
  Customer: CustomerProfile,
};

const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9999).toString();

const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

const normalizeRole = (role) => {
  if (!role) return null;
  const normalized = role.toString().trim().toLowerCase();
  const match = Object.keys(roleModelMap).find(
    (r) => r.toLowerCase() === normalized
  );
  return match || null;
};

const findAnyProfileByMobileNumber = async (mobileNumber) => {
  const models = Object.values(roleModelMap);
  for (const Model of models) {
    const exists = await Model.findOne({ mobileNumber }).select("_id");
    if (exists) return true;
  }
  return false;
};

/* ======================================================
   1️⃣ SIGNUP + SEND OTP (SMS ONLY)
====================================================== */
export const signupAndSendOtp = async (req, res) => {
  try {
    let { mobileNumber, role } = req.body;

    role = normalizeRole(role);
    mobileNumber = mobileNumber?.trim();

    if (!mobileNumber || !role) {
      return res
        .status(400)
        .json({ message: "Mobile number and role required" });
    }

    // Create / update temp user
    await TempUser.findOneAndUpdate(
      { identifier: mobileNumber, role },
      { identifier: mobileNumber, role, tempstatus: "Pending" },
      { upsert: true }
    );

    // Remove old OTPs
    await Otp.deleteMany({
      identifier: mobileNumber,
      role,
      purpose: "SIGNUP",
    });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      identifier: mobileNumber,
      role,
      purpose: "SIGNUP",
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });

    // ✅ SEND OTP VIA SMS (2Factor)
    await sendSms(mobileNumber, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ======================================================
   2️⃣ RESEND OTP (COMMON)
====================================================== */
export const resendOtp = async (req, res) => {
  try {
    const { mobileNumber, role } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole) {
      return res
        .status(400)
        .json({ message: "Mobile number and role required" });
    }

    const tempUser = await TempUser.findOne({
      identifier,
      role: normalizedRole,
    });

    if (!tempUser) {
      return res.status(404).json({ message: "Signup not found" });
    }

    const lastOtp = await Otp.findOne({
      identifier,
      role: normalizedRole,
      purpose: "SIGNUP",
    }).sort({ createdAt: -1 });

    // ⏳ 60 sec cooldown
    if (lastOtp && Date.now() - lastOtp.createdAt < 60 * 1000) {
      return res
        .status(429)
        .json({ message: "Please wait before retrying" });
    }

    await Otp.deleteMany({
      identifier,
      role: normalizedRole,
      purpose: "SIGNUP",
    });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      identifier,
      role: normalizedRole,
      purpose: "SIGNUP",
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendSms(identifier, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ======================================================
   3️⃣ VERIFY OTP
====================================================== */
export const verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, role, otp } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole || !otp) {
      return res.status(400).json({ message: "Mobile number, role and otp required" });
    }

    const record = await Otp.findOne({
      identifier,
      role: normalizedRole,
      purpose: "SIGNUP",
      expiresAt: { $gt: Date.now() },
    }).sort({ createdAt: -1 });

    if (!record)
      return res.status(400).json({ message: "OTP expired or invalid" });

    if (record.attempts >= 5)
      return res.status(429).json({ message: "Too many attempts" });

    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      record.attempts++;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    record.isVerified = true;
    await record.save();

    await TempUser.updateOne(
      { identifier, role: normalizedRole },
      { tempstatus: "Verified" }
    );

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   4️⃣ SET PASSWORD + CREATE PROFILE
====================================================== */
export const setPassword = async (req, res) => {
  try {
    const { mobileNumber, role, password, confirmPassword } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole) {
      return res.status(400).json({ message: "Mobile number and role required" });
    }

    if (!roleModelMap[normalizedRole]) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    if (!passwordRegex.test(password))
      return res.status(400).json({ message: "Weak password" });

    const tempUser = await TempUser.findOne({
      identifier,
      role: normalizedRole,
      tempstatus: "Verified",
    });

    if (!tempUser)
      return res.status(403).json({ message: "OTP not verified" });

    const mobileExists = await findAnyProfileByMobileNumber(identifier);
    if (mobileExists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const Profile = roleModelMap[normalizedRole];
    const userId = new mongoose.Types.ObjectId();

    const profile = await Profile.create({
      userId,
      mobileNumber: identifier,
      password: hashedPassword,
      status: "Active",
      profileComplete: false,
    });

    await TempUser.deleteOne({ _id: tempUser._id });
    await Otp.deleteMany({ identifier, role: normalizedRole });

    const token = jwt.sign(
      {
        userId: profile.userId,
        profileId: profile._id,
        role: normalizedRole,
        mobileNumber: profile.mobileNumber,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created",
      token,
      role: normalizedRole,
      profileComplete: profile.profileComplete,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   5️⃣ LOGIN
====================================================== */
export const login = async (req, res) => {
  try {
    const { mobileNumber, password, role } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);
    const Profile = normalizedRole ? roleModelMap[normalizedRole] : null;

    if (!Profile)
      return res.status(400).json({ message: "Invalid role" });

    if (!identifier || !password) {
      return res.status(400).json({ message: "Mobile number and password required" });
    }

    const user = await Profile.findOne({ mobileNumber: identifier }).select("+password");
    if (!user)
      return res.status(404).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        userId: user.userId || user._id,
        profileId: user._id,
        role: normalizedRole,
        mobileNumber: user.mobileNumber,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: normalizedRole, profileComplete: user.profileComplete });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   6️⃣ PASSWORD RESET FLOW
====================================================== */
export const requestPasswordResetOtp = async (req, res) => {
  try {
    const { mobileNumber, role } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole) {
      return res.status(400).json({ message: "Mobile number and role required" });
    }

    const Profile = roleModelMap[normalizedRole];
    const user = await Profile.findOne({ mobileNumber: identifier });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    await Otp.deleteMany({ identifier, role: normalizedRole, purpose: "RESET_PASSWORD" });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      identifier,
      role: normalizedRole,
      purpose: "RESET_PASSWORD",
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendSms(identifier, otp);
    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { mobileNumber, role, otp } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole || !otp) {
      return res.status(400).json({ message: "Mobile number, role and otp required" });
    }

    const record = await Otp.findOne({
      identifier,
      role: normalizedRole,
      purpose: "RESET_PASSWORD",
      expiresAt: { $gt: Date.now() },
    }).sort({ createdAt: -1 });

    if (!record)
      return res.status(400).json({ message: "OTP expired or invalid" });

    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid OTP" });

    record.isVerified = true;
    await record.save();

    res.json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { mobileNumber, role, newPassword } = req.body;
    const identifier = mobileNumber?.trim();
    const normalizedRole = normalizeRole(role);

    if (!identifier || !normalizedRole || !newPassword) {
      return res.status(400).json({ message: "Mobile number, role and newPassword required" });
    }

    if (!passwordRegex.test(newPassword))
      return res.status(400).json({ message: "Weak password" });

    const record = await Otp.findOne({
      identifier,
      role: normalizedRole,
      purpose: "RESET_PASSWORD",
      isVerified: true,
    });

    if (!record)
      return res.status(400).json({ message: "OTP not verified" });

    const Profile = roleModelMap[normalizedRole];
    const hashed = await bcrypt.hash(newPassword, 10);

    await Profile.findOneAndUpdate(
      { mobileNumber: identifier },
      { password: hashed }
    );

    await Otp.deleteMany({ identifier, role: normalizedRole, purpose: "RESET_PASSWORD" });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   7️⃣ PROFILE APIs
====================================================== */
export const getMyProfile = async (req, res) => {
  const { profileId, role } = req.user;
  const Profile = roleModelMap[role];

  if (!Profile || !profileId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const profile = await Profile.findById(profileId).select("-password");
  res.json(profile);
};

export const completeProfile = async (req, res) => {
  const { profileId, role } = req.user;
  const Profile = roleModelMap[role];

  if (!Profile || !profileId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let allowedFields = [];

  if (role === "Customer") {
    allowedFields = ["firstName", "lastName", "gender", "mobileNumber"];
  }

  if (role === "Technician") {
    allowedFields = [
      "firstName",
      "lastName",
      "gender",
      "mobileNumber",
      "address",
      "city",
      "state",
      "pincode",
      "locality",
      "experienceYears",
      "specialization",
    ];
  }

  if (role === "Owner") {
    allowedFields = [
      "firstName",
      "lastName",
      "gender",
      "mobileNumber",
      "companyName",
      "businessType",
      "address",
      "city",
      "state",
      "pincode",
      "gstNumber",
    ];
  }

  if (role === "Admin") {
    allowedFields = [
      "firstName",
      "lastName",
      "gender",
      "mobileNumber",
      "designation",
      "department",
      "address",
      "city",
      "state",
    ];
  }

  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  updateData.profileComplete = true;

  const updated = await Profile.findByIdAndUpdate(
    profileId,
    updateData,
    { new: true, runValidators: true }
  ).select("-password");

  res.json(updated);
};


export const updateMyProfile = async (req, res) => {
  const { profileId, role } = req.user;
  const Profile = roleModelMap[role];

  if (!Profile || !profileId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Customers must manage addresses via Address APIs only
  if (role === "Customer") {
    const addressKeys = ["address", "city", "state", "pincode"];
    const hasAddressFields = addressKeys.some((k) => req.body?.[k] !== undefined);
    if (hasAddressFields) {
      return res.status(400).json({
        message: "Customer address must be managed via address endpoints (/api/addresses) only",
      });
    }
  }

  // Prevent sensitive updates
  const forbidden = new Set(["password", "email", "status", "userId", "profileComplete"]);
  const updateData = {};
  Object.keys(req.body || {}).forEach((k) => {
    if (!forbidden.has(k)) updateData[k] = req.body[k];
  });

  const updated = await Profile.findByIdAndUpdate(profileId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.json(updated);
};

export const getUserById = async (req, res) => {
  const { role, id } = req.params;
  const Profile = roleModelMap[role];

  const user = await Profile.findById(id).select("-password");
  res.json(user);
};

export const getAllUsers = async (req, res) => {
  const { role } = req.params;
  const Profile = roleModelMap[role];

  const users = await Profile.find().select("-password");
  res.json(users);
};

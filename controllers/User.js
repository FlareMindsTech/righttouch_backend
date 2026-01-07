import Otp from "../Schemas/Otp.js";
import TempUser from "../Schemas/TempUser.js";
import User from "../Schemas/User.js";
import { sendEmail } from "../utils/sendMail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ---------- Helpers ----------
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

const generateUsername = async (firstName, mobileNumber) => {
  const baseFirst = firstName.slice(0, 3).toLowerCase();
  const lastTwo = mobileNumber.slice(-2);

  for (let i = 0; i < 10; i++) {
    const candidate = `${baseFirst}${lastTwo}${Math.floor(Math.random() * 10)}`;
    const exists =
      (await TempUser.findOne({ username: candidate })) ||
      (await User.findOne({ username: candidate }));
    if (!exists) return candidate;
  }

  return `${baseFirst}${lastTwo}${Date.now().toString().slice(-4)}`;
};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

/* ======================================================
   SIGNUP + SEND OTP
====================================================== */
export const signupAndSendOtp = async (req, res) => {
  try {
    let {
      firstName,
      lastName,
      gender,
      mobileNumber,
      email,
      role,
      locality,
      password,
    } = req.body;

    email = email?.toLowerCase().trim();
    mobileNumber = mobileNumber?.trim();

    if (
      !firstName ||
      !lastName ||
      !gender ||
      !mobileNumber ||
      !email ||
      !role ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        result: {},
      });
    }

    if (!passwordRegex.test(password))
      return res.status(400).json({
        success: false,
        message:
          "Minimum 8 characters, at least one letter, one number and one special character",
        result: {},
      });

    if (!/^[0-9]{10}$/.test(mobileNumber))
      return res.status(400).json({
        success: false,
        message: "Mobile number must be exactly 10 digits",
        result: {},
      });

    if (!emailRegex.test(email))
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        result: {},
      });

    if (!/^[A-Za-z ]+$/.test(firstName) || !/^[A-Za-z ]+$/.test(lastName))
      return res.status(400).json({
        success: false,
        message: "Names must contain only letters and spaces",
        result: {},
      });

    if (role.toLowerCase() === "technician" && !locality)
      return res.status(400).json({
        success: false,
        message: "Locality is required for technicians",
        result: {},
      });

    const formatName = (n) =>
      n
        .trim()
        .split(/\s+/)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    firstName = formatName(firstName);
    lastName = formatName(lastName);

    const existingTemp = await TempUser.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (existingTemp)
      return res.status(400).json({
        success: false,
        message: "OTP already sent. Please verify.",
        result: {},
      });

    const existingUser = await User.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (existingUser)
      return res.status(409).json({
        success: false,
        message: "User already registered",
        result: {},
      });

    const username = await generateUsername(firstName, mobileNumber);
    const hashedPassword = await bcrypt.hash(password, 10);

    const tempUser = await TempUser.create({
      firstName,
      lastName,
      username,
      gender,
      mobileNumber,
      email,
      role,
      locality,
      password: hashedPassword,
      tempstatus: "Pending",
    });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      userId: tempUser._id,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      isVerified: false,
    });

    await sendEmail(email, "Your OTP Code", `Your OTP is: ${otp}`);

    return res.status(201).json({
      success: true,
      message: "OTP sent successfully",
      result: { tempUserId: tempUser._id },
    });
  } catch (error) {
    console.error("signupAndSendOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ======================================================
   RESEND OTP
====================================================== */
export const resendOtp = async (req, res) => {
  try {
    let { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile number is required",
        result: {},
      });
    }

    identifier = identifier.trim().toLowerCase();

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^[0-9]{10}$/.test(identifier);

    if (!isEmail && !isMobile) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or mobile number format",
        result: {},
      });
    }

    /* ===============================
       FIND TEMP USER
    =============================== */
    const tempUser = await TempUser.findOne(
      isEmail ? { email: identifier } : { mobileNumber: identifier }
    );

    if (!tempUser) {
      return res.status(404).json({
        success: false,
        message: "Temp user not found",
        result: {},
      });
    }

    /* ===============================
       OTP RATE LIMIT (60s)
    =============================== */
    const lastOtp = await Otp.findOne({ userId: tempUser._id }).sort({
      createdAt: -1,
    });

    if (lastOtp && Date.now() - lastOtp.createdAt < 60 * 1000) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP",
        result: {},
      });
    }

    /* ===============================
       CREATE NEW OTP (HASHED)
    =============================== */
    await Otp.deleteMany({ userId: tempUser._id });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create({
      userId: tempUser._id,
      otp: hashedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      isVerified: false,
    });

    /* ===============================
       SEND OTP (EMAIL)
    =============================== */
    await sendEmail(tempUser.email, "Your OTP Code", `Your OTP is: ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      result: {},
    });
  } catch (error) {
    console.error("resendOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ======================================================
   VERIFY OTP → CREATE USER
====================================================== */
export const verifyOtp = async (req, res) => {
  try {
    const { tempUserId, otp } = req.body;

    if (!tempUserId || !otp)
      return res.status(400).json({
        success: false,
        message: "TempUser ID and OTP are required",
        result: {},
      });

    const otpRecord = await Otp.findOne({ userId: tempUserId }).sort({
      createdAt: -1,
    });

    if (!otpRecord)
      return res.status(404).json({
        success: false,
        message: "OTP not found",
        result: {},
      });

    if (otpRecord.expiresAt < Date.now())
      return res.status(400).json({
        success: false,
        message: "OTP expired",
        result: {},
      });

    if (otpRecord.attempts >= 5)
      return res.status(429).json({
        success: false,
        message: "Too many invalid attempts",
        result: {},
      });
    if (otpRecord.isVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP already used",
        result: {},
      });
    }

    const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValidOtp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        result: {},
      });
    }

    const tempUser = await TempUser.findById(tempUserId);
    if (!tempUser)
      return res.status(404).json({
        success: false,
        message: "Temp user not found",
        result: {},
      });

    const newUser = await User.create({
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      username: tempUser.username,
      gender: tempUser.gender,
      mobileNumber: tempUser.mobileNumber,
      email: tempUser.email,
      password: tempUser.password,
      role: tempUser.role,
      locality: tempUser.locality,
      status: "Active",
    });

    await TempUser.findByIdAndDelete(tempUserId);
    await Otp.deleteMany({ userId: tempUserId });

    return res.status(200).json({
      success: true,
      message: "OTP verified and user created",
      result: newUser,
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Login
export const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    /* ===============================
       BASIC VALIDATION
    =============================== */
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
        result: {},
      });
    }

    identifier = identifier.trim().toLowerCase();

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^[0-9]{10}$/.test(identifier);

    if (!isEmail && !isMobile) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or mobile number format",
        result: {},
      });
    }

    /* ===============================
       FIND USER
    =============================== */
    const user = await User.findOne(
      isEmail ? { email: identifier } : { mobileNumber: identifier }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid credentials",
        result: {},
      });
    }

    /* ===============================
       PASSWORD CHECK
    =============================== */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        result: {},
      });
    }

    /* ===============================
       JWT GENERATION
    =============================== */
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
        result: {},
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      result: {
        token,
        role: user.role,
        id: user._id
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // userId from URL
    const { firstName, lastName } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    }

    // Validate names if provided
    if (firstName) {
      const nameRegex = /^[A-Za-z ]+$/;
      if (!nameRegex.test(firstName)) {
        return res.status(400).json({
          success: false,
          message: "Invalid first name format",
          result: {},
        });
      }
    }
    if (lastName) {
      const nameRegex = /^[A-Za-z ]+$/;
      if (!nameRegex.test(lastName)) {
        return res.status(400).json({
          success: false,
          message: "Invalid last name format",
          result: {},
        });
      }
    }

    // IMPORTANT: do NOT automatically change username on name update (keeps stable identity)
    const updatePayload = {};
    if (firstName) updatePayload.firstName = firstName;
    if (lastName) updatePayload.lastName = lastName;

    const updatedUser = await User.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      result: updatedUser,
    });
  } catch (error) {
    console.error("updateUser error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Get all users (with search / filters)
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;

    // Fetch users (excluding password)
    const users = await User.find(query).select("-password");

    if (!users || !users.length) {
      return res.status(404).json({
        success: false,
        message: "No users found",
        result: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      result: users,
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Get user by id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    res
      .status(200)
      .json({
        success: true,
        message: "User fetched successfully",
        result: user,
      });
  } catch (error) {
    console.error("getUserById error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Get my profile (requires auth middleware that sets req.user.userId)
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    res
      .status(200)
      .json({
        success: true,
        message: "Profile fetched successfully",
        result: user,
      });
  } catch (error) {
    console.error("getMyProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old and new passwords are required",
        result: {},
      });
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum 8 characters, at least one letter, one number and one special character",
        result: {},
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
        result: {},
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as old password",
        result: {},
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      result: {},
    });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Request password reset OTP
// Request Password Reset OTP
export const requestPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        result: {},
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        result: {},
      });
    }

    // 2. User must exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    }

    // 3. DELETE old OTPs (IMPORTANT FIX)
    await Otp.deleteMany({ userId: user._id });

    // 4. Generate OTP
    const otpCode = generateOtp();

    // 5. Save OTP
    await Otp.create({
      userId: user._id,
      otp: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      isVerified: false,
    });

    // 6. SEND EMAIL (this WILL run now)
    await sendEmail(
      email,
      "Password Reset OTP",
      `Your password reset OTP is: ${otpCode}`
    );
    console.log(email)
    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to email",
      result: {},
    });
  } catch (error) {
    console.error("requestPasswordResetOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Verify password reset OTP
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
        result: {},
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });

    const otpRecord = await Otp.findOne({ userId: user._id }).sort({
      createdAt: -1,
    });
    if (!otpRecord)
      return res.status(400).json({
        success: false,
        message: "OTP not found for this user",
        result: {},
      });

    if (otpRecord.expiresAt < Date.now())
      return res.status(400).json({
        success: false,
        message: "OTP expired",
        result: {},
      });

    if (otpRecord.otp !== otp) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        result: {},
      });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      result: {},
    });
  } catch (error) {
    console.error("verifyPasswordResetOtp error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Reset password (after OTP verification)
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
        result: {},
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });

    const otpRecord = await Otp.findOne({ userId: user._id }).sort({
      createdAt: -1,
    });
    if (!otpRecord || !otpRecord.isVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP not verified for this user",
        result: {},
      });
    }

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum 8 characters, at least one letter, one number and one special character",
        result: {},
      });
    }

    const isMatchNewAndOld = await bcrypt.compare(newPassword, user.password);
    if (isMatchNewAndOld)
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
        result: {},
      });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Cleanup OTP
    await Otp.deleteOne({ userId: user._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      result: {},
    });
  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      result: {},
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

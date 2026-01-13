import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";

import UserRoutes from "./routes/User.js";
import TechnicianRoutes from "./routes/technician.js";
import AddressRoutes from "./routes/address.js";
import DevUserRoutes from "./routes/devUser.js";

dotenv.config();

// 🔒 CRITICAL: Check JWT_SECRET at startup
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not defined in environment variables");
  process.exit(1);
}

const App = express();

App.use(express.json());
App.use(cors());
App.use(bodyParser.json());
App.use(bodyParser.urlencoded({ extended: true }));
App.use(express.static("public"));

// 🔒 Security Note: XSS and NoSQL injection protection is handled via:
// - Comprehensive input validation in all controllers
// - ObjectId validation on all routes
// - Strict regex patterns for email, mobile, names
// - Type checking and sanitization

// 🔒 General API Rate Limiter (applies to all routes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later",
    result: {},
  },
  standardHeaders: true,
  legacyHeaders: false,
});

App.use(generalLimiter);

// 🔥 Global Timeout Middleware (Fix Flutter timeout)
App.use((req, res, next) => {
  res.setTimeout(60000, () => {
    console.log("⏳ Request timed out");
    return res.status(408).json({
      success: false,
      message: "Request timeout",
      result: "Request took too long to process",
    });
  });
  next();
});

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

App.get("/", (req, res) => {
  res.send("welcome");
});

// Routes
App.use("/api/user", UserRoutes);
App.use("/api/technician", TechnicianRoutes);
App.use("/api/addresses", AddressRoutes);

// DEV ONLY: bypass OTP to create users for testing
// Route is always mounted, but controller returns 404 unless ENABLE_DEV_USER_CREATION=true
App.use("/api/dev", DevUserRoutes);

// ❗ GLOBAL ERROR HANDLER (MUST BE LAST)
App.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const port = process.env.PORT || 7372;
App.listen(port, () => {
  console.log("Server connected to " + port);
});


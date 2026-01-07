import express from "express";
import { Auth } from "../middleware/Auth.js";
import {
  createAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
} from "../controllers/addressController.js";

const router = express.Router();

/* ================= ADDRESS ROUTES ================= */

// Create address
router.post("/", Auth, createAddress);

// Get all addresses for user
router.get("/", Auth, getMyAddresses);

// Get default address
router.get("/default", Auth, getDefaultAddress);

// Get single address by ID
router.get("/:id", Auth, getAddressById);

// Update address
router.put("/:id", Auth, updateAddress);

// Set as default address
router.put("/:id/default", Auth, setDefaultAddress);

// Delete address
router.delete("/:id", Auth, deleteAddress);

export default router;

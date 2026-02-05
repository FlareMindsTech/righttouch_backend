import express from "express";
import { Auth } from "../middleware/Auth.js";
import isTechnician from "../middleware/isTechnician.js";
import { upload } from "../utils/cloudinaryUpload.js";

import {
  respondToJob,
  getMyJobs,
} from "../controllers/technicianBroadcastController.js";

import {
  createTechnician,
  getAllTechnicians,
  getTechnicianById,
  getMyTechnician,
  updateTechnician,
  addTechnicianSkills,
  removeTechnicianSkills,
  updateTechnicianStatus,
  deleteTechnician,
  updateTechnicianTraining,
  uploadProfileImage,
} from "../controllers/technician.js";

import {
  submitTechnicianKyc,
  uploadTechnicianKycDocuments,
  getTechnicianKyc,
  getMyTechnicianKyc,
  getAllTechnicianKyc,
  verifyTechnicianKyc,
  verifyBankDetails,
  deleteTechnicianKyc,
  getOrphanedKyc,
  deleteOrphanedKyc,
  deleteAllOrphanedKyc,
} from "../controllers/technicianKycController.js";

import {
  updateBookingStatus,
  getTechnicianJobHistory,
  getTechnicianCurrentJobs
} from "../controllers/serviceBookController.js";

import {
  getTechnicianWallet,
  getWalletTransactions,
  requestWithdraw,
  getMyWithdrawRequests,
  cancelMyWithdrawal,
} from "../controllers/technicianWalletController.js";

const router = express.Router();

/* ================= TECHNICIAN DATA ================= */

router.post("/technicianData", Auth, createTechnician);
router.get("/technicianAll", Auth, getAllTechnicians);
router.get("/technicianById/:id", Auth, getTechnicianById);
router.get("/technician/me", Auth, isTechnician, getMyTechnician);
router.put("/updateTechnician", Auth, updateTechnician);
router.put("/technician/skills/add", Auth, isTechnician, addTechnicianSkills);
router.put("/technician/skills/remove", Auth, isTechnician, removeTechnicianSkills);
router.put("/technician/status", Auth, updateTechnicianStatus);
router.put("/:technicianId/training", Auth, updateTechnicianTraining);
router.post("/technician/profile-image", Auth, isTechnician, upload.single("profileImage"), uploadProfileImage);
router.delete("/technicianDelete/:id", Auth, deleteTechnician);

/* ================= TECHNICIAN KYC ================= */

router.post("/technician/kyc", Auth, isTechnician, submitTechnicianKyc);

router.post(
  "/technician/kyc/upload",
  Auth,
  isTechnician,
  upload.fields([
    { name: "aadhaarImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
    { name: "dlImage", maxCount: 1 },
  ]),
  uploadTechnicianKycDocuments
);

// IMPORTANT: define '/me' BEFORE '/:technicianId' so 'me' doesn't get treated as an id.
router.get("/technician/kyc/me", Auth, isTechnician, getMyTechnicianKyc);
router.get("/technician/kyc", Auth, getAllTechnicianKyc);
router.get("/technician/kyc/:technicianId", Auth, getTechnicianKyc);
router.put("/technician/kyc/verify", Auth, verifyTechnicianKyc);
router.put("/technician/kyc/bank/verify", Auth, verifyBankDetails);
router.delete("/technician/deletekyc/:technicianId", Auth, deleteTechnicianKyc);
router.get("/technician/kyc/orphaned/list", Auth, getOrphanedKyc);
router.delete("/technician/kyc/orphaned/:kycId", Auth, deleteOrphanedKyc);
router.delete("/technician/kyc/orphaned/cleanup/all", Auth, deleteAllOrphanedKyc);

/* ================= JOB BROADCAST ================= */

router.get("/job-broadcast/my-jobs", Auth, isTechnician, getMyJobs);
router.put("/job-broadcast/respond/:id", Auth, isTechnician, respondToJob);

/* ================= JOB UPDATE ================= */

// Technician updates job status

router.put("/status/:id", Auth, isTechnician, updateBookingStatus);
router.get("/jobs/current", Auth, isTechnician, getTechnicianCurrentJobs);
router.get("/jobs/history", Auth, isTechnician, getTechnicianJobHistory);

/* ================= TECHNICIAN WALLET ================= */

// Wallet balance
router.get("/wallet", Auth, isTechnician, getTechnicianWallet);

// Wallet transactions
router.get("/wallet/transactions", Auth, isTechnician, getWalletTransactions);

// Request withdraw
router.post("/wallet/withdraw", Auth, isTechnician, requestWithdraw);

// My withdraw requests
router.get("/wallet/withdraws", Auth, isTechnician, getMyWithdrawRequests);

// Cancel withdraw
router.delete("/wallet/withdraw/:id", Auth, isTechnician, cancelMyWithdrawal);

export default router;

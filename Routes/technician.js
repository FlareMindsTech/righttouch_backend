import express from "express";
import { Auth } from "../middleware/Auth.js";
import { upload } from "../utils/cloudinaryUpload.js";

import {
  respondToJob,
  getMyJobs,
} from "../controllers/technicianBroadcastController.js";

import {
  createTechnician,
  getAllTechnicians,
  getTechnicianById,
  updateTechnician,
  updateTechnicianStatus,
  deleteTechnician,
} from "../controllers/technician.js";

import {
  submitTechnicianKyc,
  uploadTechnicianKycDocuments,
  getTechnicianKyc,
  getAllTechnicianKyc,
  verifyTechnicianKyc,
  deleteTechnicianKyc,
} from "../controllers/technicianKycController.js";

import {
  updateBookingStatus,
  getTechnicianJobHistory,
  getTechnicianCurrentJobs
} from "../controllers/serviceBookController.js";

const router = express.Router();

/* ================= TECHNICIAN DATA ================= */

router.post("/technicianData", Auth, createTechnician);
router.get("/technicianAll", Auth, getAllTechnicians);
router.get("/technicianById/:id", Auth, getTechnicianById);
router.put("/updateTechnician/:id", Auth, updateTechnician);
router.put("/technician/status", Auth, updateTechnicianStatus);
router.delete("/technicianDelete/:id", Auth, deleteTechnician);

/* ================= TECHNICIAN KYC ================= */

router.post("/technician/kyc", Auth, submitTechnicianKyc);

router.post(
  "/technician/kyc/upload",
  Auth,
  upload.fields([
    { name: "aadhaarImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 },
    { name: "dlImage", maxCount: 1 },
  ]),
  uploadTechnicianKycDocuments
);

router.get("/technician/kyc/:technicianId", Auth, getTechnicianKyc);
router.get("/technician/kyc", Auth, getAllTechnicianKyc);
router.put("/technician/kyc/verify", Auth, verifyTechnicianKyc);
router.delete("/technician/deletekyc/:technicianId", Auth, deleteTechnicianKyc);

/* ================= JOB BROADCAST ================= */

router.get("/job-broadcast/my-jobs", Auth, getMyJobs);
router.put("/job-broadcast/respond/:id", Auth, respondToJob);

/* ================= JOB UPDATE ================= */

// Technician updates job status

router.put("/status/:id", Auth, updateBookingStatus);
router.get("/jobs/current", Auth, getTechnicianCurrentJobs);
router.get("/jobs/history", Auth, getTechnicianJobHistory);

export default router;

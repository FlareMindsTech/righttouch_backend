import mongoose from "mongoose";
import TechnicianKyc from "../schemas/TechnicianKYC.js";
import Technician from "../schemas/Technician.js";

/* ================= SUBMIT / UPDATE TECHNICIAN KYC (NO IMAGE) ================= */
export const submitTechnicianKyc = async (req, res) => {
  try {
    const {
      technicianId,
      aadhaarNumber,
      panNumber,
      drivingLicenseNumber,
    } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: "Technician ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
      });
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    const kyc = await TechnicianKyc.findOneAndUpdate(
      { technicianId },
      {
        technicianId,
        aadhaarNumber,
        panNumber,
        drivingLicenseNumber,
        verificationStatus: "pending",
        rejectionReason: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: "KYC details submitted successfully",
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

/* ================= UPLOAD TECHNICIAN KYC DOCUMENTS (IMAGES) ================= */
export const uploadTechnicianKycDocuments = async (req, res) => {
  try {
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: "Technician ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
      });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "KYC documents are required",
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    if (req.files.aadhaarImage) {
      kyc.documents.aadhaarUrl = req.files.aadhaarImage[0].path;
    }

    if (req.files.panImage) {
      kyc.documents.panUrl = req.files.panImage[0].path;
    }

    if (req.files.dlImage) {
      kyc.documents.dlUrl = req.files.dlImage[0].path;
    }

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "KYC documents uploaded successfully",
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

/* ================= GET TECHNICIAN KYC (TECHNICIAN / ADMIN) ================= */
export const getAllTechnicianKyc = async (req, res) => {
  try {
   

    const kyc = await TechnicianKyc.find();

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC fetched successfully",
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};
/* ================= GET TECHNICIAN KYC (TECHNICIAN / ADMIN) ================= */
export const getTechnicianKyc = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC fetched successfully",
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

/* ================= ADMIN VERIFY / REJECT TECHNICIAN KYC ================= */
export const verifyTechnicianKyc = async (req, res) => {
  try {
    const { technicianId, status, rejectionReason } = req.body;

    if (!technicianId || !status) {
      return res.status(400).json({
        success: false,
        message: "Technician ID and status are required",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    kyc.verificationStatus = status;
    kyc.rejectionReason = status === "rejected" ? rejectionReason : null;
    kyc.verifiedAt = new Date();
    kyc.verifiedBy = req.user.id;

    await kyc.save();

    if (status === "approved") {
      await Technician.findByIdAndUpdate(technicianId, {
        status: "approved",
        approvedAt: new Date(),
      });
    } else {
      await Technician.findByIdAndUpdate(technicianId, {
        status: "suspended",
        "availability.isOnline": false,
      });
    }

    return res.status(200).json({
      success: true,
      message: `KYC ${status} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

/* ================= DELETE TECHNICIAN KYC ================= */
export const deleteTechnicianKyc = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: "Technician ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
      });
    }

    const kyc = await TechnicianKyc.findOneAndDelete({ technicianId });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
      });
    }

    // 🔒 Safety: suspend technician after KYC delete
    await Technician.findByIdAndUpdate(technicianId, {
      status: "suspended",
      "availability.isOnline": false,
    });

    return res.status(200).json({
      success: true,
      message: "Technician KYC deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

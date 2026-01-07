import mongoose from "mongoose";
import TechnicianKyc from "../Schemas/TechnicianKYC.js";
import Technician from "../Schemas/Technician.js";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

/* ================= SUBMIT / UPDATE TECHNICIAN KYC (NO IMAGE) ================= */
export const submitTechnicianKyc = async (req, res) => {
  try {
    const { aadhaarNumber, panNumber, drivingLicenseNumber } = req.body;
    const authUserId = req.user?.userId;

    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    const technician = await Technician.findOne({ userId: authUserId });
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const technicianId = technician._id;

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
      result: {},
    });
  }
};

/* ================= UPLOAD TECHNICIAN KYC DOCUMENTS (IMAGES) ================= */
export const uploadTechnicianKycDocuments = async (req, res) => {
  try {
    const authUserId = req.user?.userId;

    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "KYC documents are required",
        result: {},
      });
    }

    const technician = await Technician.findOne({ userId: authUserId });
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId: technician._id });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
        result: {},
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
      result: {},
    });
  }
};

/* ================= GET TECHNICIAN KYC (TECHNICIAN / ADMIN) ================= */
export const getAllTechnicianKyc = async (req, res) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Owner access only",
        result: {},
      });
    }

    const kyc = await TechnicianKyc.find();

    return res.status(200).json({
      success: true,
      message: "KYC fetched successfully",
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= GET TECHNICIAN KYC (TECHNICIAN / ADMIN) ================= */
export const getTechnicianKyc = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!isValidObjectId(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
        result: {},
      });
    }

    const authUserId = req.user?.userId;
    const isOwner = req.user?.role === "Owner";
    if (!isOwner) {
      const technician = await Technician.findOne({ userId: authUserId });
      if (!technician || technician._id.toString() !== technicianId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
          result: {},
        });
      }
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
      result: {},
    });
  }
};

/* ================= ADMIN VERIFY / REJECT TECHNICIAN KYC ================= */
export const verifyTechnicianKyc = async (req, res) => {
  try {
    const { technicianId, status, rejectionReason } = req.body;

    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Owner access only",
        result: {},
      });
    }

    if (!technicianId || !isValidObjectId(technicianId) || !status) {
      return res.status(400).json({
        success: false,
        message: "Technician ID and status are required",
        result: {},
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
        result: {},
      });
    }

    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
        result: {},
      });
    }

    const kyc = await TechnicianKyc.findOne({ technicianId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
        result: {},
      });
    }

    kyc.verificationStatus = status;
    kyc.rejectionReason = status === "rejected" ? rejectionReason : null;
    kyc.verifiedAt = new Date();
    kyc.verifiedBy = req.user.userId;

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
      result: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= DELETE TECHNICIAN KYC ================= */
export const deleteTechnicianKyc = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!isValidObjectId(technicianId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        success: false,
        message: "Owner access only",
        result: {},
      });
    }

    const kyc = await TechnicianKyc.findOneAndDelete({ technicianId });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found",
        result: {},
      });
    }

    await Technician.findByIdAndUpdate(technicianId, {
      status: "suspended",
      "availability.isOnline": false,
    });

    return res.status(200).json({
      success: true,
      message: "Technician KYC deleted successfully",
      result: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

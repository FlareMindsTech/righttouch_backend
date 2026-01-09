import mongoose from "mongoose";
import Technician from "../Schemas/Technician.js";
import User from "../Schemas/User.js";

const isValidObjectId = mongoose.Types.ObjectId.isValid;
const TECHNICIAN_STATUSES = ["pending", "trained", "approved", "suspended"];

const validateSkills = (skills) => {
  if (skills === undefined) return true;
  if (!Array.isArray(skills)) return false;
  return skills.every((item) =>
    item && item.serviceId && isValidObjectId(item.serviceId)
  );
};

/* ================= CREATE TECHNICIAN ================= */
export const createTechnician = async (req, res) => {
  try {
    const authUserId = req.user?.userId;
    const { skills } = req.body;

    if (!authUserId || !isValidObjectId(authUserId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    if (!validateSkills(skills)) {
      return res.status(400).json({
        success: false,
        message: "Invalid skills format",
        result: {},
      });
    }

    const userExists = await User.findById(authUserId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    }

    const existing = await Technician.findOne({ userId: authUserId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Technician already exists for this user",
        result: {},
      });
    }

    const technician = await Technician.create({
      userId: authUserId,
      skills,
    });

    return res.status(201).json({
      success: true,
      message: "Technician created successfully",
      result: technician,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

/* ================= GET ALL TECHNICIANS ================= */
export const getAllTechnicians = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) {
      if (!TECHNICIAN_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
          result: {},
        });
      }
      query.status = status;
    }

    if (search) {
      query.$or = [{ status: { $regex: search, $options: "i" } }];
    }

    const technicians = await Technician.find(query)
      .populate("userId", "name email phone")
      .populate("skills.serviceId", "serviceName");

    return res.status(200).json({
      success: true,
      message: "Technicians fetched successfully",
      result: technicians,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

/* ================= GET TECHNICIAN BY ID ================= */
export const getTechnicianById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    const technician = await Technician.findById(id)
      .populate("userId", "name email phone")
      .populate("skills.serviceId", "serviceName");

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Technician fetched successfully",
      result: technician,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

/* ================= UPDATE TECHNICIAN ================= */
export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills, availability } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    if (!validateSkills(skills)) {
      return res.status(400).json({
        success: false,
        message: "Invalid skills format",
        result: {},
      });
    }

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const authUserId = req.user?.userId;
    if (!authUserId || technician.userId.toString() !== authUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (skills !== undefined) {
      technician.skills = skills;
    }

    if (availability?.isOnline !== undefined) {
      if (technician.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Only approved technicians can go online",
          result: {},
        });
      }
      technician.availability.isOnline = Boolean(availability.isOnline);
    }

    await technician.save();

    return res.status(200).json({
      success: true,
      message: "Technician updated successfully",
      result: technician,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

/* ================= UPDATE TECHNICIAN STATUS (ADMIN) ================= */
export const updateTechnicianStatus = async (req, res) => {
  try {
    const { technicianId, trainingCompleted, status } = req.body;

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
      });
    }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    if (trainingCompleted !== undefined) {
      technician.trainingCompleted = Boolean(trainingCompleted);
      if (trainingCompleted === true) {
        technician.status = "trained";
      }
    }

    if (status !== undefined) {
      if (!["approved", "suspended", "trained"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
          result: {},
        });
      }

      technician.status = status;

      if (status === "suspended") {
        technician.availability.isOnline = false;
      }
    }

    await technician.save();

    return res.status(200).json({
      success: true,
      message: "Technician admin update successful",
      result: technician,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

/* ================= DELETE TECHNICIAN ================= */
export const deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const authUserId = req.user?.userId;
    const isOwner = req.user?.role === "Owner";
    if (!isOwner && (!authUserId || technician.userId.toString() !== authUserId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await technician.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Technician deleted successfully",
      result: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {error: error.message},
    });
  }
};

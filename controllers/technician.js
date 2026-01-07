import mongoose from "mongoose";
import Technician from "../Schemas/Technician.js";
import User from "../Schemas/User.js";

/* ================= CREATE TECHNICIAN ================= */
export const createTechnician = async (req, res) => {
  try {
    const { userId, skills } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        result: {},
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
        result: {},
      });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: {},
      });
    }

    const existing = await Technician.findOne({ userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Technician already exists for this user",
        result: {},
      });
    }

    const technician = await Technician.create({
      userId,
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
      result: {},
    });
  }
};

/* ================= GET ALL TECHNICIANS ================= */
export const getAllTechnicians = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status) {
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
      result: {},
    });
  }
};

/* ================= GET TECHNICIAN BY ID ================= */
export const getTechnicianById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
      result: {},
    });
  }
};

/* ================= UPDATE TECHNICIAN ================= */
export const updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills, availability } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    // 🔐 Only technician himself
    // if (
    //   req.user.role !== "Technician" ||
    //   technician.userId.toString() !== req.user.userId.toString()
    // ) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied",
    //   });
    // }

    // ✅ Update skills
    if (skills) {
      technician.skills = skills;
    }

    // ✅ Update availability
    if (availability?.isOnline !== undefined) {
      if (technician.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Only approved technicians can go online",
          result: {},
        });
      }
      technician.availability.isOnline = availability.isOnline;
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
      result: {},
    });
  }
};

/* ================= UPDATE TECHNICIAN STATUS (ADMIN) ================= */
export const updateTechnicianStatus = async (req, res) => {
  try {
    const { technicianId, trainingCompleted, status } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        message: "Technician ID is required",
        result: {},
      });
    }

    // 🔐 Admin only
    // if (req.user.role !== "Owner") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Owner access only",
    //   });
    // }

    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    // ✅ Training update
    if (trainingCompleted !== undefined) {
      technician.trainingCompleted = trainingCompleted;

      if (trainingCompleted === true) {
        technician.status = "trained";
      }
    }

    // ✅ Status update
    if (status) {
      if (!["approved", "suspended"].includes(status)) {
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
      result: {},
    });
  }
};

/* ================= DELETE TECHNICIAN ================= */
export const deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Technician ID",
        result: {},
      });
    }

    const technician = await Technician.findByIdAndDelete(id);

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Technician deleted successfully",
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

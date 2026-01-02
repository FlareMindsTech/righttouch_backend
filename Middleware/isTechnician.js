import Technician from "../Schemas/Technician.js";

/* ================= TECHNICIAN ONLY ================= */
const isTechnician = async (req, res, next) => {
  try {
    // 1️⃣ Role check
    if (req.user.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Technician only.",
      });
    }

    // 2️⃣ Technician record check
    const technician = await Technician.findOne({
      userId: req.user.userId,
    });

    if (!technician) {
      return res.status(403).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    // 3️⃣ Attach technician to request
    req.technician = technician;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default isTechnician;

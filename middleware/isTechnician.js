import TechnicianProfile from "../Schemas/TechnicianProfile.js";

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

    // 2️⃣ Profile check
    const profileId = req.user.profileId;
    if (!profileId) {
      return res.status(403).json({
        success: false,
        message: "Technician profile not found (No Profile ID in token)",
      });
    }

    // Try finding by _id first, then by userId (token might have userId as profileId)
    let technician = await TechnicianProfile.findById(profileId).select("-password");
    if (!technician) {
      technician = await TechnicianProfile.findOne({ userId: profileId }).select("-password");
    }

    if (!technician) {
      return res.status(403).json({
        success: false,
        message: "Technician profile not found in database",
      });
    }

    // 3️⃣ Attach technician to request and NORMALIZE profileId
    req.technician = technician;
    req.user.profileId = technician._id; // Ensure consistent use of _id for profileId

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default isTechnician;

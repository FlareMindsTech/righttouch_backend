import Technician from "../Schemas/Technician.js";

export const TechnicianData = async (req, res) => {
  try {
    const {
      userId,
      panNumber,
      aadhaarNumber,
      passportNumber,
      drivingLicenseNumber,
      balance,
      status
    } = req.body;

    // ✅ Manual validations
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
      return res.status(400).json({ success: false, message: "Invalid or missing PAN number" });
    }
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ success: false, message: "Invalid or missing Aadhaar number" });
    }
    if (passportNumber && !/^[A-PR-WY][1-9]\d{6}$/.test(passportNumber)) {
      return res.status(400).json({ success: false, message: "Invalid Passport number" });
    }
    if (!drivingLicenseNumber || !/^[A-Z]{2}\d{2}\s\d{11}$/.test(drivingLicenseNumber)) {
      return res.status(400).json({ success: false, message: "Invalid or missing Driving License number" });
    }

    // ✅ Handle uploaded PDF documents from multer
    const documents = {
      panCard: req.files?.panCard
        ? { data: req.files.panCard[0].buffer, contentType: req.files.panCard[0].mimetype }
        : null,
      aadhaarCard: req.files?.aadhaarCard
        ? { data: req.files.aadhaarCard[0].buffer, contentType: req.files.aadhaarCard[0].mimetype }
        : null,
      passport: req.files?.passport
        ? { data: req.files.passport[0].buffer, contentType: req.files.passport[0].mimetype }
        : null,
      drivingLicense: req.files?.drivingLicense
        ? { data: req.files.drivingLicense[0].buffer, contentType: req.files.drivingLicense[0].mimetype }
        : null
    };

    // ✅ Create new technician
    const technician = new Technician({
      userId,
      panNumber,
      aadhaarNumber,
      passportNumber,
      drivingLicenseNumber,
      documents,
      balance: balance || 0,
      status: status || "active",
    });

    await technician.save();
    res.status(201).json({ success: true, data: technician });

  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (unique fields)
      return res.status(400).json({
        success: false,
        message: `Duplicate value for field: ${Object.keys(err.keyPattern)[0]}`
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
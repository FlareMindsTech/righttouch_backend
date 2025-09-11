import Report from "../Schemas/Report.js";

export const userReport = async (req, res) => {
  try {
    const { technicianId, customerId, serviceId, complaint, image } = req.body;

    if (!technicianId || !customerId || !serviceId || !complaint || !image) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const reportData = await Report.create({
      technicianId,
      customerId,
      serviceId,
      complaint,
      image
    });

    res.status(201).json({
      message: "Report sent successfully",
      data: reportData
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("serviceId", "serviceName")
      .populate("customerId", "email")
      .populate("technicianId", "userId");

    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate("serviceId", "serviceName")
      .populate("customerId", "email")
      .populate("technicianId", "userId");

    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

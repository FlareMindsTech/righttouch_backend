import Rating from "../Schemas/Rating.js";

export const userRating = async (req, res) => {
  try {
    const { technicianId, serviceId, customerId, rates, comment } = req.body;

    if (!serviceId || !customerId || !rates || !comment) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const ratingData = await Rating.create({
      technicianId,
      serviceId,
      customerId,
      rates,
      comment
    });

    res.status(201).json({
      message: "Rating created successfully",
      data: ratingData
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};

export const getAllRatings = async (req, res) => {
  try {
    const ratings = await Rating.find()
      .populate("technicianId", "userId")
      .populate("serviceId", "serviceName")
      .populate("customerId", "email");

    res.status(200).json({ success: true, data: ratings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getRatingById = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await Rating.findById(id)
      .populate("technicianId", "userId")
      .populate("serviceId", "serviceName")
      .populate("customerId", "email");

    if (!rating) return res.status(404).json({ success: false, message: "Rating not found" });

    res.status(200).json({ success: true, data: rating });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const rating = await Rating.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!rating) return res.status(404).json({ success: false, message: "Rating not found" });

    res.status(200).json({ success: true, data: rating });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await Rating.findByIdAndDelete(id);

    if (!rating) return res.status(404).json({ success: false, message: "Rating not found" });

    res.status(200).json({ success: true, message: "Rating deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

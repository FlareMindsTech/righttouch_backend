import Rating from "../Schemas/Rating.js";

// Create new rating
export const userRating = async (req, res) => {
  try {
    const { technicianId, serviceId, customerId, rates, comment } = req.body;

    if (!serviceId || !customerId || !rates || !comment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        result: "Missing required fields"
      });
    }

    const ratingData = await Rating.create({
      technicianId,
      serviceId,
      customerId,
      rates,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Rating created successfully",
      result: ratingData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};

export const getAllRatings = async (req, res) => {
  try {
    const { search, serviceId, technicianId, customerId } = req.query;

    let query = {};

    if (search) {
      const searchAsNumber = Number(search);

      query.$or = [{ comment: { $regex: search, $options: "i" } }];

      if (!isNaN(searchAsNumber)) {
        query.$or.push({ rates: searchAsNumber });
      }
    }

    const ratings = await Rating.find(query)
      .populate("serviceId", "serviceName")
      .populate("customerId", "email name")
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "username email" },
      });
    
    if (ratings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No rating data found",
        result: "No ratings match the search criteria"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Ratings fetched successfully",
      result: ratings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};

// ✅ Get Rating by ID
export const getRatingById = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await Rating.findById(id)
      .populate("serviceId", "serviceName")
      .populate("customerId", "email")
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "username email" },
      });
    
    if (rating.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No rating data found",
        result: "No rating exists with this ID"
      });
    }
    if (!rating)
      return res
        .status(404)
        .json({ success: false, message: "Rating not found", result: "No rating exists with this ID" });

    res.status(200).json({ success: true, message: "Rating fetched successfully", result: rating });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", result: err.message });
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

    if (!rating)
      return res
        .status(404)
        .json({ success: false, message: "Rating not found", result: "No rating exists with this ID" });

    res.status(200).json({ success: true, message: "Rating updated successfully", result: rating });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", result: err.message });
  }
};

export const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await Rating.findByIdAndDelete(id);

    if (!rating)
      return res
        .status(404)
        .json({ success: false, message: "Rating not found", result: "No rating exists with this ID" });

    res
      .status(200)
      .json({ success: true, message: "Rating deleted successfully", result: "Rating has been deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", result: err.message });
  }
};

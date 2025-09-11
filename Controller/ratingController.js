import Rating from "../Schemas/Rating.js"

// ********user rating**************

export const userRating = async (req , res)=>{
  try {
    const { technicianId, serviceId, customerId, rates, comment} = req.body;

    if( !serviceId, !customerId, !rates, !comment ){
      return res.status(404).json({
        message : "All field is required"
      })
    }

    const ratingdata = await Rating.create({
      technicianId, 
      serviceId, 
      customerId, 
      rates, 
      comment
    })

    await ratingdata.save();

    res.status(200).json({
      message : "rating create successfully"
    })
  } catch (error) {
    res.status(500).json({
      message : "Server Error",
      error : error.message
    })
  }
}


// ********user rating  end**************
export const getAllRatings = async (req, res) => {
  try {
    const { serviceId, technicianId, customerId, minRate, maxRate } = req.query;

    // Build filter object
    let filter = {};
    if (serviceId) filter.serviceId = serviceId;
    if (technicianId) filter.technicianId = technicianId;
    if (customerId) filter.customerId = customerId;
    if (minRate || maxRate) {
      filter.rates = {};
      if (minRate) filter.rates.$gte = Number(minRate);
      if (maxRate) filter.rates.$lte = Number(maxRate);
    }

    const ratings = await Rating.find(filter)
      .populate("technicianId", "userId")
      .populate("serviceId", "serviceName")
      .populate("customerId", "email");

    res.status(200).json({ success: true, data: ratings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// ✅ Get Rating by ID
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

// ✅ Update Rating
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

// ✅ Delete Rating
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

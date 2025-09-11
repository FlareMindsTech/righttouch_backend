import ServiceBook from "../Schemas/ServiceBooking.js";

// booking

export const serviceBook = async (req, res) => {
  try {
    const { technicianId, userId, categoryId, serviceId } = req.body;

    if ((!technicianId, !userId, !categoryId, !serviceId)) {
      return res.status(404).json({
        message: "All field is required",
      });
    }

    const serviceData = await ServiceBook.create({
      technicianId,
      userId,
      categoryId,
      serviceId,
    });

    await serviceData.save();

    res.status(200).json({
      message: "service booking successfully...",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const serviceBookUpdate = async (req, res) => {
  try {
    const { technicianId, userId, categoryId, serviceId } = req.body;

    if ((!technicianId, !userId, !categoryId, !serviceId)) {
      return res.status(404).json({
        message: "All field is required",
      });
    }

    const updateBooking = await ServiceBook.findByIdAndUpdate(req.params.id, {
      technicianId,
      userId,
      categoryId,
      serviceId,
    });

    await updateBooking.save();

    res.status(200).json({
      message: "Update Successfully...",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const serviceBookingCancel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Booking ID is required",
      });
    }

    const cancelBooking = await ServiceBook.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );

    if (!cancelBooking) {
      return res.status(404).json({
        message: "Your booking was not found",
      });
    }

    res.status(200).json({
      message: "Your booking has been cancelled successfully",
      data: cancelBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

import ServiceBooking from "../Schemas/ServiceBooking.js";
import JobBroadcast from "../Schemas/TechnicianBroadcast.js";
import TechnicianProfile from "../Schemas/TechnicianProfile.js";
import Service from "../Schemas/Service.js";
import mongoose from "mongoose";

const toNumber = value => {
  const num = Number(value);
  return Number.isNaN(num) ? NaN : num;
};


export const createBooking = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized", result: {} });
    }
    if (req.user?.role !== "Customer") {
      return res.status(403).json({ success: false, message: "Customer access only", result: {} });
    }
    if (!req.user.profileId || !mongoose.Types.ObjectId.isValid(req.user.profileId)) {
      return res.status(401).json({ success: false, message: "Invalid token profile", result: {} });
    }
    const customerProfileId = req.user.profileId;

    const { serviceId, baseAmount, address, scheduledAt } = req.body;

    if (!serviceId || baseAmount == null || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
        result: {},
      });
    }

    // 🔒 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId format", result: {} });
    }

    const baseAmountNum = toNumber(baseAmount);
    if (Number.isNaN(baseAmountNum) || baseAmountNum < 0) {
      return res.status(400).json({ success: false, message: "baseAmount must be a non-negative number", result: {} });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: "Service not found or inactive", result: {} });
    }

    // 1️⃣ Create booking
    const booking = await ServiceBooking.create({
      customerProfileId,
      serviceId,
      baseAmount: baseAmountNum,
      address,
      scheduledAt,
      status: "broadcasted",
    });

    // 2️⃣ 🔒 FIXED: Find technicians with skill matching and online availability
    const technicians = await TechnicianProfile.find({
      status: "approved",
      "availability.isOnline": true,
      "skills.serviceId": new mongoose.Types.ObjectId(serviceId),
    }).select("_id");

    // 3️⃣ Create broadcast records
    if (technicians.length > 0) {
      await JobBroadcast.insertMany(
        technicians.map((t) => ({
          bookingId: booking._id,
          technicianId: t._id,
          status: "sent",
        }))
      );
      console.log(`✅ Broadcasted to ${technicians.length} matching, online technicians`);
    } else {
      console.log("⚠️ No matching, online technicians found for this service");
    }

    return res.status(201).json({
      success: true,
      message: "Booking created & broadcasted",
      result: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      result: {error: error.message},
    });
  }
};


/* =====================================================
   GET BOOKINGS (ROLE BASED)
===================================================== */
export const getBookings = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "Customer") {
      if (!req.user.profileId || !mongoose.Types.ObjectId.isValid(req.user.profileId)) {
        return res.status(401).json({ success: false, message: "Invalid token profile", result: {} });
      }
      filter.customerProfileId = req.user.profileId;
    }

    if (req.user.role === "Technician") {
      const technicianProfileId = req.user?.profileId;
      if (!technicianProfileId || !mongoose.Types.ObjectId.isValid(technicianProfileId)) {
        return res.status(401).json({ success: false, message: "Invalid token profile", result: {} });
      }
      filter.technicianId = technicianProfileId;
    }

    const bookings = await ServiceBooking.find(filter)
      .populate("serviceId", "serviceName")
      .populate("customerProfileId", "firstName lastName mobileNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      result: bookings,
    });
  } catch (error) {
    console.error("getBookings:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      result: {error: error.message},
    });
  }
};

/* =====================================================
   GET BOOKING FOR (CUSTOMER)
===================================================== */

export const getCustomerBookings = async (req, res) => {
  try {
    if (req.user?.role !== "Customer") {
      return res.status(403).json({ success: false, message: "Customer access only", result: {} });
    }
    if (!req.user.profileId || !mongoose.Types.ObjectId.isValid(req.user.profileId)) {
      return res.status(401).json({ success: false, message: "Invalid token profile", result: {} });
    }
    const bookings = await ServiceBooking.find({
      customerProfileId: req.user.profileId,
    })
      .populate("serviceId", "serviceName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Customer booking history",
      result: bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: {error: err.message},
    });
  }
};

/* =====================================================
   GET JOB FOR (TECHNICIAN)
===================================================== */

export const getTechnicianJobHistory = async (req, res) => {
  try {
    if (req.user?.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    const technicianProfileId = req.user?.profileId;
    if (!technicianProfileId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    const jobs = await ServiceBooking.find({
      technicianId: technicianProfileId,
      status: { $in: ["completed", "cancelled"] },
    })
      // .populate("bookingId")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Job history fetched",
      result: jobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: {error: err.message},
    });
  }
};


/* =====================================================
   GET JOB FOR (TECHNICIAN)
===================================================== */
export const getTechnicianCurrentJobs = async (req, res) => {
  try {
    if (req.user.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    const technicianProfileId = req.user?.profileId;
    if (!technicianProfileId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    const jobs = await ServiceBooking.find({
      technicianId: technicianProfileId,
      status: { $in: ["accepted", "on_the_way", "reached", "in_progress"] },
    })
    // .populate({
    //   path: "bookingId",
    //   populate: { path: "serviceId", select: "serviceName" },
    // })
    .sort({ createdAt: -1 });
      

    return res.status(200).json({
      success: true,
      message: "Active jobs fetched",
      result: jobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: {error: err.message},
    });
  }
};


/* =====================================================
   UPDATE BOOKING STATUS (TECHNICIAN)
===================================================== */
export const updateBookingStatus = async (req, res) => {
  try {
    const userRole = req.user?.role;

    const bookingId = req.params.id;
    const { status } = req.body;

    // 🔒 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
        result: {},
      });
    }

    const allowedStatus = [
      "on_the_way",
      "reached",
      "in_progress",
      "completed",
    ];

    if (!bookingId || !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
        result: {},
      });
    }

    const booking = await ServiceBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        result: {},
      });
    }

    if (userRole !== "Technician") {
      return res.status(403).json({ success: false, message: "Only technician can update status", result: {} });
    }

    const technicianProfileId = req.user?.profileId;
    if (!technicianProfileId || !booking.technicianId || booking.technicianId.toString() !== technicianProfileId.toString()) {
      return res.status(403).json({ success: false, message: "Access denied for this booking", result: {} });
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Status updated",
      result: booking,
    });
  } catch (error) {
    console.error("updateBookingStatus:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      result: {error: error.message},
    });
  }
};


/* =====================================================
   CANCEL BOOKING (CUSTOMER)
===================================================== */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
        result: {},
      });
    }

    // 1️⃣ Find booking
    const booking = await ServiceBooking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        result: {},
      });
    }

    // 2️⃣ Only CUSTOMER who created booking can cancel
    if (req.user.role !== "Customer") {
      return res.status(403).json({
        success: false,
        message: "Only customer can cancel booking",
        result: {},
      });
    }

    if (!req.user.profileId || !mongoose.Types.ObjectId.isValid(req.user.profileId)) {
      return res.status(401).json({ success: false, message: "Invalid token profile", result: {} });
    }

    if (booking.customerProfileId.toString() !== req.user.profileId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    // 3️⃣ Prevent double cancel
    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled",
        result: {},
      });
    }

    // 4️⃣ Prevent cancel after work completed
    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be cancelled",
        result: {},
      });
    }

    // 5️⃣ OPTIONAL (recommended)
    // Prevent cancel once technician is working
    if (["on_the_way", "reached", "in_progress"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled once technician started work",
        result: {},
      });
    }

    // 6️⃣ Cancel booking
    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      result: booking,
    });
  } catch (error) {
    console.error("cancelBooking:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      result: {error: error.message},
    });
  }
};

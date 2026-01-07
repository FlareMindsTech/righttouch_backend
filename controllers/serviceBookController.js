import ServiceBooking from "../Schemas/ServiceBooking.js";
import JobBroadcast from "../Schemas/TechnicianBroadcast.js";
import Technician from "../Schemas/Technician.js";
import Service from "../Schemas/Service.js";
import mongoose from "mongoose";

const toNumber = value => {
  const num = Number(value);
  return Number.isNaN(num) ? NaN : num;
};


export const createBooking = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized", result: {} });
    }

    const { serviceId, baseAmount, address, scheduledAt } = req.body;

    if (!serviceId || baseAmount == null || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
        result: {},
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId", result: {} });
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
      customerId: userId,
      serviceId,
      baseAmount: baseAmountNum,
      address,
      scheduledAt,
      status: "broadcasted",
    });

    // 2️⃣ Find technicians (FIXED)
    const technicians = await Technician.find({
      status: "approved",
      // "availability.isOnline": true,
      // "skills.serviceId": new mongoose.Types.ObjectId(serviceId),
    }).select("_id");

    // 3️⃣ Create broadcast records
    if (technicians.length > 0) {
      
      // console.log(technicians)
      let hel = await JobBroadcast.insertMany(
        technicians.map((t) => ({
          bookingId: booking._id,
          technicianId: t._id,
          status: "sent",
        }))
      );
      console.log(hel);

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
      result: {},
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
      filter.customerId = req.user.userId;
    }

    if (req.user.role === "Technician") {
      filter.technicianId = req.user.technicianId;
    }

    const bookings = await ServiceBooking.find(filter)
      .populate("serviceId", "serviceName")
      .populate("customerId", "firstName lastName phone")
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
      result: {},
    });
  }
};

/* =====================================================
   GET BOOKING FOR (CUSTOMER)
===================================================== */

export const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({
      customerId: req.user.userId,
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
      result: {},
    });
  }
};

/* =====================================================
   GET JOB FOR (TECHNICIAN)
===================================================== */

export const getTechnicianJobHistory = async (req, res) => {
  try {
    const technician = await Technician.findOne({
      userId: req.user.userId,
    });

    const jobs = await ServiceBooking.find({
      technicianId: technician._id,
      status: { $in: ["accepted", "rejected", "complete"] },
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
      result: {},
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

    const technician = await Technician.findOne({
      userId: req.user.userId,
    });
    const jobs = await ServiceBooking.find({
      technicianId: technician._id,
      status: { $in: ["accepted", "on_the_way", "reached", "in_progress"] },
    })
    // .populate({
    //   path: "bookingId",
    //   populate: { path: "serviceId", select: "serviceName" },
    // })
    .sort({ createdAt: -1 });
    console.log(technician._id)
      

    return res.status(200).json({
      success: true,
      message: "Active jobs fetched",
      result: jobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: {},
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

    const technician = await Technician.findOne({ userId: req.user.userId });
    if (!technician || !booking.technicianId || booking.technicianId.toString() !== technician._id.toString()) {
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
      result: {},
    });
  }
};


/* =====================================================
   CANCEL BOOKING (CUSTOMER)
===================================================== */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

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

    if (booking.customerId.toString() !== req.user.userId.toString()) {
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
      result: {},
    });
  }
};

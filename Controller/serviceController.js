import Service from "../Schemas/Service.js";

// ******** Create Service **************
export const service = async (req, res) => {
  try {
    const { categoryId, serviceName, description, cost, quantity, active, status, duration } = req.body;

    if (!categoryId || !serviceName || !description || !cost || !quantity || status === undefined || active === undefined) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const matchService = await Service.findOne({ serviceName });
    if (matchService) {
      return res.status(409).json({
        message: "Service name already registered"
      });
    }

    const serviceData = await Service.create({
      categoryId,
      serviceName,
      description,
      cost,
      quantity,
      active,
      status,
      duration
    });

    res.status(201).json({
      message: "Service created successfully",
      data: serviceData
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// ******** Get All Services **************
export const getAllServices = async (req, res) => {
  try {
    const filters = {};
    if (req.query.categoryId) filters.categoryId = req.query.categoryId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.active !== undefined) filters.active = req.query.active;

    const services = await Service.find(filters)
      .populate("technicianId", "name email")
      .populate("userId", "firstName lastName email")
      .populate("categoryId", "category description");

    return res.status(200).json(services);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ******** Get Service by ID **************
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id)
      .populate("technicianId", "name email")
      .populate("userId", "firstName lastName email")
      .populate("categoryId", "category description");

    if (!service) return res.status(404).json({ message: "Service not found" });
    return res.status(200).json(service);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ******** Update Service **************
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({
      message: "Service updated successfully",
      updatedService
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ******** Delete Service **************
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

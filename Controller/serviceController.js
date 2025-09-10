import Service from "../Schemas/Service.js";

// ********user sevice  **************

export const serivce = async (req , res)=>{
  try {
    const  { technicianId , userId , categoryId , serviceName ,description, cost, quantity, active, status , duration} = req.body;

    if(!categoryId , !serviceName , !description, !cost, !quantity, !active, !status){
      return res.status(404).json({
        message : "All field is required"
      })
    }

    const matchService = await Service.findOne({serviceName});

    if(matchService){
      return res.status(208).json({
        message :"Service name already register"
      })
    }

    const serviceData = await Service.create({
      technicianId, 
      userId, 
      categoryId, 
      serviceName,
      description, 
      cost, 
      quantity, 
      active, 
      status, 
      duration
    })

    await serviceData.save();

    res.status(200).json({
      message : "service is create successfully..."
    });


  } catch (error) {
        res.status(500).json({ 
          message: "Server error", error: error.message 
        });
  }
}

// ********user serice  end**************
// ✅ Get All Services
export const getAllServices = async (req, res) => {
  try {
    const services = await serviceSchema
      .find()
      .populate("technicianId", "name email")
      .populate("userId", "firstName lastName email")
      .populate("categoryId", "category description");
    return res.status(200).json(services);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ✅ Get Service by ID
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await serviceSchema
      .findById(id)
      .populate("technicianId", "name email")
      .populate("userId", "firstName lastName email")
      .populate("categoryId", "category description");

    if (!service) return res.status(404).json({ message: "Service not found" });
    return res.status(200).json(service);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ✅ Update Service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      technicianId,
      userId,
      categoryId,
      serviceName,
      description,
      cost,
      quantity,
      active,
      status,
      duration,
    } = req.body;

    const updatedService = await serviceSchema.findByIdAndUpdate(
      id,
      {
        technicianId,
        userId,
        categoryId,
        serviceName,
        description,
        cost,
        quantity,
        active,
        status,
        duration,
      },
      { new: true, runValidators: true }
    );

    if (!updatedService)
      return res.status(404).json({ message: "Service not found" });

    return res
      .status(200)
      .json({ message: "Service updated successfully", updatedService });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ✅ Delete Service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await serviceSchema.findByIdAndDelete(id);
    if (!service)
      return res.status(404).json({ message: "Service not found" });

    return res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


import express from "express";
import { TechnicianData } from "../Controller/technician.js";
 
 const router = express.Router();
 
 router.post("/technicianData", TechnicianData); 
 
 
 export default router;
 
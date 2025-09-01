import express from "express";
import { changePassword, createPassword,getAllUsers,getMyProfile,getUserById,login,requestPasswordResetOtp,resetPassword,signupAndSendOtp, updateUser, verifyOtp, verifyPasswordResetOtp } from "../Controller/User.js";
import { Auth } from "../Middleware/Auth.js";

const router = express.Router();

router.post("/signup", signupAndSendOtp); 
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/create-password", createPassword);
router.put("/update-user/:id", updateUser);
router.get("/getallusers", getAllUsers);
router.get("/getuserbyid/:id", getUserById);
router.get("/getMyProfile",Auth, getMyProfile);     

router.put("/changepassword",Auth, changePassword);    
router.post("/requestPasswordResetOtp",Auth, requestPasswordResetOtp); 
router.post("/verifyPasswordResetOtp",Auth, verifyPasswordResetOtp);
router.post("/resetPassword",Auth, resetPassword);


export default router;

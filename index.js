import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import UserRoutes from "./Routes/User.js";
import TechnicianRoutes from "./Routes/technician.js";



dotenv.config();
const App = express();
 
App.use(express.json());
App.use(cors());
App.use(bodyParser.json());
App.use(bodyParser.urlencoded({ extended: true }));
App.use(express.static("public"));

mongoose.set("strictQuery", false);
// mongoose.connect("mongodb://127.0.0.1:27017/Righttouchdatabase")
//   .then(() => console.log("You! Connected to MongoDB..."))
//   .catch((err) =>
//     console.error("Could not connect to MongoDB... " + err.message)
//   );
mongoose.connect('mongodb+srv://flaremindstech:flareminds%401308@cluster0.12wutsc.mongodb.net/Righttouch?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB Atlas...'))
.catch(err => console.error('Could not connect to MongoDB...'));
 
App.get("/", (req, res) => {
  res.send("welcome"); 
});

 
// Routes
App.use('/api/user', UserRoutes);
App.use('/api/technician', TechnicianRoutes);
 
 
const port = process.env.PORT || 7372;
App.listen(port, () => {
  console.log("Server connected to " + port); 
}); 
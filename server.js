import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import path from "path";

//import authRoutes from "./routes/user/auth_routes.js";


dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

// Test endpoint
app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello world! It's working your api." });
});

// Auth routes
// app.use("/api/auth", authRoutes);

const PORT = process.env.LOCAL_SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

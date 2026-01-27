import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import destinationRoutes from "./routes/destinationRoute/destinationRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/destiantions", destinationRoutes);

// Test endpoint
app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello world! It's working your api." });
});

const PORT = process.env.LOCAL_SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

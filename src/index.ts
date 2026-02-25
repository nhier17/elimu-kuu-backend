import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import subjectsRouter from "./routes/subjects";

const app = express();
const PORT = 5000;

if (!process.env.FRONTEND_URL) throw new Error("Missing environment variable");

//cors options
const corsOptions = {
  origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

//routes
app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
    res.send("Backend server is running!");
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
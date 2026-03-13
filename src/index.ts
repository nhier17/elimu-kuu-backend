import AgentAPI from "apminsight";
AgentAPI.config()

import express from "express";
import cors from "cors";

import subjectsRouter from "./routes/subjects";
import securityMiddleware from "./middleware/security";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth";

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

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware)

//routes
app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
    res.send("Backend server is running!");
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
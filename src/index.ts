import "dotenv/config";
import AgentAPI from "apminsight";
AgentAPI.config()

import express from "express";
import cors from "cors";

import subjectsRouter from "./routes/subjects";
import classesRouter from "./routes/classes";
import usersRouter from "./routes/users";
import departmentsRouter from "./routes/departments";
import enrollmentsRouter from "./routes/enrollments";
import securityMiddleware from "./middleware/security";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth";

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use("/api/classes", classesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/users", usersRouter);

app.get("/", (req, res) => {
    res.send("Backend server is running!");
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
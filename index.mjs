import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";
import "express-async-errors";
import authRouter from "./routes/auth.mjs";
import announcementsRouter from "./routes/announcements.mjs";
import profileRouter from "./routes/profile.mjs";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());

// Load the /posts routes
app.use("/auth", authRouter);
app.use("/announcements", announcementsRouter);
app.use("/users", profileRouter);

// Global error handling
app.use((err, _req, res, next) => {
  res.status(500).send("Uh oh! An unexpected error occured.");
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

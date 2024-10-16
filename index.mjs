import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";
import "express-async-errors";
import authRouter from "./routes/auth.mjs";
import announcementsRouter from "./routes/announcements.mjs";
import profileRouter from "./routes/profile.mjs";
import usersRouter from "./routes/users.mjs";
import adminRouter from "./routes/admin.mjs";
import membersRouter from "./routes/members.mjs";
import eventsRouter from "./routes/events.mjs";
import locationsRouter from "./routes/locations.mjs";
import rsvpsRouter from "./routes/rsvps.mjs";
import pingRouter from "./routes/ping.mjs";
import notificationsRouter from "./routes/notifications.mjs";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.set("view engine", "ejs"); // If you're using EJS as a template engine
// Middleware to parse URL-encoded data (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies (if you're handling JSON too)
app.use(express.json());

// Load the /posts routes
app.use("/auth", authRouter);
app.use("/announcements", announcementsRouter);
// app.use("/users", profileRouter);
app.use("/users", usersRouter);
app.use("/admin", adminRouter);
app.use("/members", membersRouter);
app.use("/events", eventsRouter);
app.use("/locations", locationsRouter);
app.use("/rsvps", rsvpsRouter);
app.use("/ping", pingRouter);
app.use("/notifications", notificationsRouter);

// Global error handling
app.use((err, _req, res, next) => {
  res.status(500).send("Uh oh! An unexpected error occured.");
});

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

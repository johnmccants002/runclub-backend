import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { verifyToken } from "../middleware/verifyToken.mjs";
import {
  getPushTokenByUserId,
  getAllPushTokens,
} from "../helpers/pushNotifications.mjs";
import {
  sendPushNotifications,
  sendPushNotification,
} from "../services/expo.mjs";
import { io } from "../index.mjs";

const router = express.Router();

// Helper function to get the start and end dates for the current week and month
const getDateRange = (rangeType) => {
  const now = new Date();
  let startDate;
  let endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  ); // End of today

  if (rangeType === "week") {
    const firstDayOfWeek = now.getDate() - now.getDay();
    startDate = new Date(now.setDate(firstDayOfWeek));
    startDate.setHours(0, 0, 0, 0); // Start of the week
  } else if (rangeType === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0); // Start of the month
  }

  return { startDate, endDate };
};

// Admin route to accept a user as a member
router.put("/accept/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { membershipStatus: "accepted", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(userId, "THIS IS THE USER ID");
    const token = await getPushTokenByUserId(userId);
    console.log("THIS IS THE TOKEN", token);

    if (token) {
      await sendPushNotification(
        token,
        "You've been accepted into 916 Run Club App!",
        "/"
      );
    }

    return res
      .status(200)
      .json({ message: "User accepted as a member successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/deny/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { membershipStatus: "denied", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "User denied membership successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/pending-members", verifyToken, async (req, res) => {
  try {
    const usersCollection = await db.collection("users");

    // Find all users with membershipStatus "accepted"
    const pendingUsers = await usersCollection
      .find(
        { membershipStatus: "pending" },
        {
          projection: {
            password: 0,
            refreshToken: 0,
            // Add any other fields you want to omit
          },
        }
      )
      .toArray();

    return res.status(200).json(pendingUsers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get the number of members accepted this week
router.get("/accepted-members/this-week", verifyToken, async (req, res) => {
  try {
    const usersCollection = await db.collection("users");
    const { startDate, endDate } = getDateRange("week");

    const acceptedThisWeek = await usersCollection.countDocuments({
      membershipStatus: "accepted",
      updatedAt: { $gte: startDate, $lte: endDate },
    });

    return res.status(200).json({ acceptedThisWeek });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get the number of members accepted this month
router.get("/accepted-members/this-month", verifyToken, async (req, res) => {
  try {
    const usersCollection = await db.collection("users");
    const { startDate, endDate } = getDateRange("month");

    const acceptedThisMonth = await usersCollection.countDocuments({
      membershipStatus: "accepted",
      updatedAt: { $gte: startDate, $lte: endDate },
    });

    return res.status(200).json({ acceptedThisMonth });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/checkin", verifyToken, async (req, res) => {
  const { userId, eventId, adminId } = req.body;

  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(eventId) ||
    !ObjectId.isValid(adminId)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid user ID, event ID, or admin ID" });
  }

  try {
    const checkInsCollection = await db.collection("checkins");

    // Check if the user is already checked into the event
    const existingCheckIn = await checkInsCollection.findOne({
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId),
    });

    if (existingCheckIn) {
      return res
        .status(409)
        .json({ message: "User is already checked into this event." }); // Conflict (409) error
    }
    // Create the check-in object
    const checkInData = {
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId),
      adminId: new ObjectId(adminId),
      date: new Date(), // Add the current date
    };

    // Insert the check-in record into the collection
    await checkInsCollection.insertOne(checkInData);
    // Emit the check-in event to trigger the animation on the user's device
    io.emit("userCheckedIn", { userId, eventId });

    return res
      .status(201)
      .json({ message: "User checked in successfully", checkInData });
  } catch (error) {
    console.error("Error during check-in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/uploaded/:eventId", async (req, res) => {
  const { eventId } = req.params;

  try {
    // Validate if the eventId is a valid ObjectId
    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const eventsCollection = await db.collection("events");

    // Check if the event exists
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Update the event by setting photosUploaded to true
    await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: { photosUploaded: true } }
    );

    const tokens = await getAllPushTokens();

    console.log("THESE ARE THE TOKENS", tokens);
    await sendPushNotifications(tokens, "New Photos Uploaded!");

    return res
      .status(200)
      .json({ message: "Photos uploaded status updated to true" });
  } catch (error) {
    console.error("Error updating photosUploaded status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

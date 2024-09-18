import express from "express";
import { sendPushNotifications } from "../services/expo.mjs"; // Import your notification functions
import { verifyToken } from "../middleware/verifyToken.mjs";
import { ObjectId } from "mongodb"; // Import ObjectId from MongoDB

const router = express.Router();
import db from "../db/conn.mjs";
// Save or update a push token in the notifications collection
export async function savePushToken(userId, pushToken) {
  const objectId = new ObjectId(userId); // Convert string userId to ObjectId
  await db.collection("notifications").updateOne(
    { userId: objectId }, // Store userId as ObjectId
    {
      $set: {
        pushToken,
        platform: "ios", // Optional: Add platform if needed
        createdAt: new Date(),
      },
    },
    { upsert: true } // Create a new document if it doesn't exist
  );
}

// Remove the user's push token
export async function removePushToken(userId) {
  const objectId = new ObjectId(userId); // Convert string userId to ObjectId
  await db.collection("notifications").deleteOne({ userId: objectId });
}

// Get the user's push token
export async function getPushToken(userId) {
  const objectId = new ObjectId(userId); // Convert string userId to ObjectId
  const notification = await db
    .collection("notifications")
    .findOne({ userId: objectId });
  return notification?.pushToken;
}

router.post("/save-token", async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res
      .status(400)
      .json({ error: "User ID and push token are required" });
  }

  try {
    await savePushToken(userId, pushToken); // Now this handles ObjectId conversion
    res.status(200).json({ message: "Push token saved successfully" });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ error: "Failed to save push token" });
  }
});
// Route to remove a user's push token
router.delete("/remove-token", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const objectId = new ObjectId(userId); // Convert the userId to ObjectId
    await removePushToken(objectId); // Pass the ObjectId to the function
    res.status(200).json({ message: "Push token removed successfully" });
  } catch (error) {
    console.error("Error removing push token:", error);
    res.status(500).json({ error: "Failed to remove push token" });
  }
});

// Optional: Route to send a push notification to a user
router.post("/send-notification", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "User ID and message are required" });
  }

  try {
    const objectId = new ObjectId(userId); // Convert the userId to ObjectId
    // Retrieve the user's push token from the database
    const pushToken = await getPushToken(objectId); // Pass the ObjectId to the function

    if (!pushToken) {
      return res
        .status(404)
        .json({ error: "No push token found for this user" });
    }

    // Send push notification using the saved push token
    await sendPushNotifications([pushToken]);
    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending push notification:", error);
    res.status(500).json({ error: "Failed to send push notification" });
  }
});

router.post("/new-member", verifyToken, async (req, res) => {
  console.log("IN THIS FUNCTION");
  try {
    const { firstName, lastName } = req.body;
    // Step 1: Find all users where isAdmin is true
    console.log(firstName, lastName, "FIRST AND LAST NAME");
    const adminUsers = await db
      .collection("users")
      .find({ isAdmin: true })
      .toArray();
    const adminUserIds = adminUsers.map((user) => user._id);
    console.log(adminUserIds, "ADMIN USER IDS");

    // Step 2: Find notifications where userId is in the list of adminUserIds
    const adminNotifications = await db
      .collection("notifications")
      .find({
        userId: { $in: adminUserIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Step 3: Extract push tokens from the notifications
    const adminPushTokens = adminNotifications.map(
      (notification) => notification.pushToken
    );
    sendPushNotifications(
      adminPushTokens,
      `${firstName} ${lastName} requested to join 916 Run Club!`
    );
    // Send the result
    res.status(200).json({
      adminPushTokens,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching admin notifications" });
  }
});

export default router;

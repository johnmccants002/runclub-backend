import express from "express";
import { getReceipts, sendPushNotifications } from "../services/expo.mjs";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Example push tokens (You can also dynamically pass this if needed)
    let pushTokens = [process.env.DEVICE_TOKEN];

    // Send the push notifications by calling the function
    let receiptIds = await sendPushNotifications(pushTokens);

    // Optionally retrieve the receipts for the sent notifications
    if (receiptIds.length > 0) {
      await getReceipts(receiptIds);
    }

    // Send a success response to Postman
    res.status(200).json({
      message: "Push notification sent successfully",
      receiptIds: receiptIds,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);

    // Send error response to Postman
    res.status(500).json({
      error: "Failed to send push notifications",
      details: error.message,
    });
  }
});

export default router;

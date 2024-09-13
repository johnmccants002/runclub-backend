import express from "express";
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { verifyToken } from "../middleware/verifyToken.mjs"; // Import the JWT middleware

const router = express.Router();

// POST: RSVP to an event (protected route)
router.post("/", verifyToken, async (req, res) => {
  const { userId, eventId } = req.body;

  // Validate that both userId and eventId are provided
  if (!userId || !eventId) {
    return res
      .status(400)
      .json({ message: "User ID and Event ID are required" });
  }

  try {
    const rsvpsCollection = await db.collection("rsvps");

    // Check if the user has already RSVP'd for the event
    const existingRsvp = await rsvpsCollection.findOne({ userId, eventId });

    if (existingRsvp) {
      return res
        .status(400)
        .json({ message: "User has already RSVP'd to this event" });
    }

    // Create the new RSVP
    const newRsvp = {
      userId,
      eventId,
      timestamp: new Date(), // Optionally store when the RSVP was made
    };

    await rsvpsCollection.insertOne(newRsvp);

    return res.status(201).json({ message: "RSVP registered successfully" });
  } catch (error) {
    console.error("Error registering RSVP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET: Fetch RSVPs for a specific event (protected route)
router.get("/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  try {
    const rsvpsCollection = await db.collection("rsvps");

    // Fetch all RSVPs for the given event
    const rsvps = await rsvpsCollection.find({ eventId }).toArray();

    if (rsvps.length === 0) {
      return res.status(404).json({ message: "No RSVPs found for this event" });
    }

    return res.status(200).json({
      message: "RSVPs fetched successfully",
      rsvps,
    });
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET: Fetch all RSVPs for all events (protected route)
router.get("/", verifyToken, async (req, res) => {
  try {
    const rsvpsCollection = await db.collection("rsvps");

    // Fetch all RSVPs for all events
    const rsvps = await rsvpsCollection.find({}).toArray();

    if (rsvps.length === 0) {
      return res.status(404).json({ message: "No RSVPs found" });
    }

    return res.status(200).json({
      message: "All RSVPs fetched successfully",
      rsvps,
    });
  } catch (error) {
    console.error("Error fetching RSVPs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { verifyToken } from "../middleware/verifyToken.mjs";
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import app from "../services/firebase-admin.mjs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid"; // Optionally generate unique IDs for file names

// Time zone for California (Pacific Time)
const timeZone = "America/Los_Angeles";

const router = express.Router();

import Event from "../models/event.mjs"; // Import the Event model
router.post("/create", verifyToken, async (req, res) => {
  const { adminId, title, details, startTime, endTime, photo, location } =
    req.body; // Include location in destructuring

  console.log(JSON.stringify({ adminId, title, details }));

  // Validate required fields
  if (!adminId || !title || !details || !startTime || !endTime || !location) {
    return res.status(400).json({
      message:
        "Admin ID, title, details, start time, end time, and location are required",
    });
  }

  // Validate location fields
  if (
    !location.place_id ||
    !location.name ||
    !location.formatted_address ||
    !location.lat ||
    !location.lng
  ) {
    return res.status(400).json({
      message:
        "Location details (place_id, name, formatted_address, lat, lng) are required",
    });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(adminId) });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Prepare the new event data with location details
    const newEvent = {
      createdBy: new ObjectId(adminId), // Set user ID as the event creator
      title,
      details,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      photo: photo || "", // Optional photo URL
      location: {
        place_id: location.place_id,
        name: location.name,
        formatted_address: location.formatted_address,
        lat: location.lat,
        lng: location.lng,
      },
      createdAt: new Date(),
    };

    const eventsCollection = await db.collection("events");

    // Insert the new event into the collection
    await eventsCollection.insertOne(newEvent);

    return res.status(201).json({ message: "Event created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to update an event by ID
router.put("/update-event/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const { title, details, startTime, endTime, photo } = req.body;

  if (!ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const eventsCollection = await db.collection("events");

    const updatedData = {
      ...(title && { title }),
      ...(details && { details }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(photo && { photo }),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to delete an event by ID
router.delete("/delete-event/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;

  if (!ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const eventsCollection = await db.collection("events");

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(eventId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get all events
router.get("/events", verifyToken, async (req, res) => {
  try {
    const eventsCollection = await db.collection("events");
    const events = await eventsCollection.find({}).toArray();
    return res.status(200).json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get a single event by ID
router.get("/events/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;

  if (!ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const eventsCollection = await db.collection("events");

    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/today", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start of today (00:00:00)
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // End of today (23:59:59)

    const eventsCollection = await db.collection("events");

    // Find an event that starts or ends today
    const todayEvent = await eventsCollection.findOne({
      startTime: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!todayEvent) {
      return res.status(404).json({ message: "No event scheduled for today" });
    }

    return res.status(200).json({
      message: "Event found for today",
      event: todayEvent,
    });
  } catch (error) {
    console.error("Error fetching today's event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/future", verifyToken, async (req, res) => {
  console.log("GRABBING THE EVENTS");
  try {
    const now = new Date(); // Current date and time

    const eventsCollection = await db.collection("events");

    // Find all events that start in the future
    const futureEvents = await eventsCollection
      .find({
        startTime: { $gt: now },
      })
      .toArray(); // Use toArray() to get all future events in an array

    if (futureEvents.length === 0) {
      return res.status(404).json({ message: "No future events found" });
    }

    // Convert startTime and endTime to proper Date objects and format them to Pacific Time
    const formattedEvents = futureEvents.map((event) => {
      const startTimeZoned = toZonedTime(new Date(event.startTime), timeZone);
      const endTimeZoned = toZonedTime(new Date(event.endTime), timeZone);

      return {
        ...event,
        startTime: formatInTimeZone(
          startTimeZoned,
          timeZone,
          "MMMM dd, yyyy 'at' h:mm a"
        ), // Format date for Pacific Time
        endTime: formatInTimeZone(
          endTimeZoned,
          timeZone,
          "MMMM dd, yyyy 'at' h:mm a"
        ), // Format end time
      };
    });

    console.log(JSON.stringify(formattedEvents[0].startTime));

    return res.status(200).json({
      message: "Future events found",
      events: formattedEvents,
    });
  } catch (error) {
    console.error("Error fetching future events:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const upload = multer({ storage: multer.memoryStorage() }); // Using memoryStorage for file uploads

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(JSON.stringify(req.file.originalname));

    // Get the Firebase Admin Storage bucket
    const dbStorage = app.storage();

    console.log("successfully got dbStorage");
    const bucket = dbStorage.bucket();
    const uniqueFilename = `events/${Date.now()}_${uuidv4()}_${
      req.file.originalname
    }`;

    // Create a file reference in Firebase Storage
    const file = bucket.file(uniqueFilename);

    // Create metadata (optional)
    const metadata = {
      metadata: {
        contentType: req.file.mimetype,
      },
    };

    // Upload the file to Firebase Storage
    const blobStream = file.createWriteStream({
      metadata,
    });

    // Handle stream events (errors, finish)
    blobStream.on("error", (error) => {
      console.error("Upload failed:", error);
      return res.status(500).json({ error: "File upload failed" });
    });

    blobStream.on("finish", async () => {
      try {
        // Make the file publicly accessible or modify access rules as needed
        await file.makePublic();

        // Get the file's public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        // Example: Save event data with image URL
        const event = {
          title: req.body.title,
          imageUrl: publicUrl, // Save the URL in your event object
        };

        // Save the event to the database (MongoDB, etc.)
        // Example: await saveEventToDatabase(event);

        res.status(200).json({ message: "Upload successful", event });
      } catch (error) {
        console.error("Error getting public URL:", error);
        res.status(500).json({ error: "Failed to make file public" });
      }
    });

    // End the stream and upload the file
    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error("Something went wrong:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;

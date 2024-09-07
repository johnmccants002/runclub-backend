import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure

const router = express.Router();

// Route to create a new event (already provided)
router.post("/create-event", async (req, res) => {
  const { title, details, startTime, endTime, photo } = req.body;

  if (!title || !details || !startTime || !endTime) {
    return res.status(400).json({
      message: "Title, details, start time, and end time are required",
    });
  }

  try {
    const eventsCollection = await db.collection("events");

    const eventData = {
      title,
      details,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      photo: photo || null,
      createdAt: new Date(),
    };

    await eventsCollection.insertOne(eventData);
    return res
      .status(201)
      .json({ message: "Event created successfully", eventData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to update an event by ID
router.put("/update-event/:eventId", async (req, res) => {
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
router.delete("/delete-event/:eventId", async (req, res) => {
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
router.get("/events", async (req, res) => {
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
router.get("/events/:eventId", async (req, res) => {
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

export default router;

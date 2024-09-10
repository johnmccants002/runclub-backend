import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure

const router = express.Router();

import Event from "../models/event.mjs"; // Import the Event model
router.post("/create", async (req, res) => {
  const { adminId, title, details, startTime, endTime, photo } = req.body;

  console.log(JSON.stringify({ adminId, title, details }));

  // Validate required fields
  if (!adminId || !title || !details || !startTime || !endTime) {
    return res.status(400).json({
      message: "User ID, title, details, start time, and end time are required",
    });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(adminId) });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const eventsCollection = await db.collection("events");

    // Prepare the new event data
    const newEvent = {
      createdBy: new ObjectId(adminId), // Set user ID as the event creator
      title,
      details,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      photo: photo || "", // Optional photo URL
      createdAt: new Date(),
    };

    // Insert the new event into the collection
    await eventsCollection.insertOne(newEvent);

    return res.status(201).json({ message: "Event created successfully" });
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

router.get("/today", async (req, res) => {
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

router.get("/future", async (req, res) => {
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

    return res.status(200).json({
      message: "Future events found",
      events: futureEvents,
    });
  } catch (error) {
    console.error("Error fetching future events:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/rsvp", async (req, res) => {
  const { userId, eventId } = req.body;

  if (!ObjectId.isValid(userId) || !ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid user ID or event ID" });
  }

  try {
    const rsvpCollection = await db.collection("rsvps");

    // Check if the user has already RSVPed for the event
    const existingRSVP = await rsvpCollection.findOne({
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId),
    });

    if (existingRSVP) {
      return res
        .status(409)
        .json({ message: "User has already RSVPed for this event." });
    }

    // Create the RSVP object
    const rsvpData = {
      userId: new ObjectId(userId),
      eventId: new ObjectId(eventId),
      date: new Date(), // Add the current date
    };

    // Insert the RSVP record into the collection
    await rsvpCollection.insertOne(rsvpData);

    return res.status(201).json({ message: "RSVP successful", rsvpData });
  } catch (error) {
    console.error("Error during RSVP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

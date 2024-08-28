import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure

const router = express.Router();

router.get("/all", async (req, res) => {
  try {
    const announcementsCollection = await db.collection("announcements");

    // Fetch all announcements and sort them by createdAt in descending order
    const announcements = await announcementsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(announcements);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a single announcement by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid announcement ID" });
  }

  try {
    const announcementsCollection = await db.collection("announcements");

    // Fetch the announcement by ID
    const announcement = await announcementsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res.status(200).json(announcement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/create", async (req, res) => {
  const { userId, title, content, imageUrl } = req.body;
  console.log(JSON.stringify(userId, content));

  if (!userId || !content) {
    return res
      .status(400)
      .json({ message: "User ID and content are required" });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const announcementsCollection = await db.collection("announcements");

    const newAnnouncement = {
      user: new ObjectId(userId),
      title: title || "", // Optional title
      content,
      imageUrl: imageUrl || "", // Optional image URL
      createdAt: new Date(),
    };

    // Insert the new announcement into the collection
    await announcementsCollection.insertOne(newAnnouncement);

    return res
      .status(201)
      .json({ message: "Announcement created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid announcement ID" });
  }

  try {
    const announcementsCollection = await db.collection("announcements");

    // Find and delete the announcement
    const result = await announcementsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res
      .status(200)
      .json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, imageUrl } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid announcement ID" });
  }

  if (!title && !content && !imageUrl) {
    return res.status(400).json({
      message:
        "At least one field (title, content, imageUrl) must be provided to update",
    });
  }

  try {
    const announcementsCollection = await db.collection("announcements");

    // Build the update object
    const updateFields = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;
    if (imageUrl) updateFields.imageUrl = imageUrl;

    // Update the announcement
    const result = await announcementsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return res
      .status(200)
      .json({ message: "Announcement updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

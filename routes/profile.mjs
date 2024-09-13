import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { verifyToken } from "../middleware/verifyToken.mjs";

const router = express.Router();

// Get user profile by user ID
router.get("/profile/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // Exclude the password field from the response
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user.profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create or update user profile
router.put("/profile/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;
  const { instagram, phoneNumber, favoriteBrunchSpot, about } = req.body;

  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const profileFields = {
      "profile.instagram": instagram || "",
      "profile.phoneNumber": phoneNumber || "",
      "profile.favoriteBrunchSpot": favoriteBrunchSpot || "",
      "profile.about": about || "",
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: profileFields, $currentDate: { updatedAt: true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

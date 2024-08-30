import express from "express";
import db from "../db/conn.mjs"; // Adjust the path as per your project structure

const router = express.Router();

// Route to get all users with a membership status of "accepted"
router.get("/", async (req, res) => {
  try {
    const usersCollection = await db.collection("users");

    // Find all users with membershipStatus "accepted"
    const acceptedUsers = await usersCollection
      .find({ membershipStatus: "accepted" })
      .toArray();

    return res.status(200).json(acceptedUsers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

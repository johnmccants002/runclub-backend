import express from "express";
import db from "../db/conn.mjs"; // Adjust the path as per your project structure
import { verifyToken } from "../middleware/verifyToken.mjs";

const router = express.Router();

// Route to get all users with a membership status of "accepted"
router.get("/", verifyToken, async (req, res) => {
  try {
    const usersCollection = await db.collection("users");

    // Find all users with membershipStatus "accepted" and omit sensitive fields
    const acceptedUsers = await usersCollection
      .find(
        { membershipStatus: "accepted" },
        {
          projection: {
            password: 0,
            refreshToken: 0,
            // Add any other fields you want to omit
          },
        }
      )
      .toArray();

    return res.status(200).json(acceptedUsers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

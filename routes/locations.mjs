import express from "express";
import axios from "axios";
import { verifyToken } from "../middleware/verifyToken.mjs";

const router = express.Router();

// Endpoint for Google Maps autocomplete (already added)
router.get("/autocomplete", verifyToken, async (req, res) => {
  const { input } = req.query;

  if (!input) {
    return res.status(400).send("Input query is required");
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      {
        params: {
          input: input,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.json(response.data.predictions);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data from Google Maps");
  }
});

// New route for Google Places Details
router.get("/place-details", verifyToken, async (req, res) => {
  const { place_id } = req.query; // Get the place_id from query parameters

  if (!place_id) {
    return res.status(400).json({ message: "place_id is required" });
  }

  try {
    // Make request to Google Places API to fetch place details
    const result = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id, // Use the place_id from the query
          key: process.env.GOOGLE_MAPS_API_KEY, // Your Google Maps API Key from environment variables
        },
      }
    );

    // Check if the request was successful and return the data
    if (result.data.status === "OK") {
      res.status(200).json(result.data.result); // Return the place details
    } else {
      res.status(400).json({ message: "Failed to fetch place details" });
    }
  } catch (error) {
    console.error("Error fetching place details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

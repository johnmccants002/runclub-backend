import express from "express";
import axios from "axios";

const router = express.Router();

// Endpoint for Google Maps autocomplete (already added)
router.get("/autocomplete", async (req, res) => {
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
router.get("/place-details", async (req, res) => {
  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).send("Place ID is required");
  }

  const fields =
    "address_component,adr_address,formatted_address,geometry,icon,name,place_id,plus_code,type,utc_offset";

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id,
          fields,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.json(response.data.result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching place details from Google Maps");
  }
});

export default router;

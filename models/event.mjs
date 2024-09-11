import { Schema } from "mongoose";
import mongoose from "mongoose";

// Define the Event schema
const eventSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  photo: {
    type: String,
    default: null, // Default to null if no photo is provided
  },
  adminId: {
    type: Schema.Types.ObjectId, // Reference to the User model
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  // New location field
  location: {
    place_id: {
      type: String,
      required: true, // Place ID is required
    },
    name: {
      type: String,
      required: true, // Place name is required
    },
    formatted_address: {
      type: String,
      required: true, // Formatted address is required
    },
    lat: {
      type: Number,
      required: true, // Latitude is required
    },
    lng: {
      type: Number,
      required: true, // Longitude is required
    },
  },
});

// Create the Event model
const Event = mongoose.model("Event", eventSchema);

export default Event;

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
});

// Create the Event model
const Event = mongoose.model("Event", eventSchema);

export default Event;

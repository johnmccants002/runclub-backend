import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  instagram: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  favoriteBrunchSpot: {
    type: String,
    default: "",
  },
  about: {
    type: String,
    default: "",
  },
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profile: {
    type: userProfileSchema,
    default: () => ({}),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;

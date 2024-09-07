import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  profile: {
    instagram: String,
    phoneNumber: String,
    favoriteBrunchSpot: String,
    about: String,
  },
  membershipStatus: {
    type: String,
    enum: ["pending", "accepted", "denied"],
    default: "pending",
  },
  tosAccepted: {
    type: Boolean,
    default: false,
  },
  emailList: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model("User", userSchema);

export default User;

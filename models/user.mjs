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

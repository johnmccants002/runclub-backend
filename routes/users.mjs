import express from "express";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { verifyToken } from "../middleware/verifyToken.mjs";

const router = express.Router();

// Get all users
router.get("/", verifyToken, async (req, res) => {
  try {
    const usersCollection = await db.collection("users");

    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .toArray();

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get a single user by ID
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } } // Exclude the password field from the response
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a user by ID
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const usersCollection = await db.collection("users");

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/upload-image", verifyToken, async (req, res) => {
  console.log(req.file);

  const file = req.files.photo;
  console.log(JSON.stringify(file));
  const fileType = file.name.split(".")[1];
  const fileData = file.data;
  const fileName = `${req.user}.${fileType}`;

  const bucketParams = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileData,
  };

  console.log("BUCKET PARAMS: ", bucketParams);

  try {
    const result = await s3Client.send(new PutObjectCommand(bucketParams));
    const s3ProfilePhotoUrl = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`;

    try {
      const profile = await UserProfile.findOne({ user: req.user });
      if (!profile) throw { status: 404, message: "Profile not found" };

      profile.photo = s3ProfilePhotoUrl;
      await profile.save();

      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).json({
        photoUrl: s3ProfilePhotoUrl,
        message: "Photo uploaded successfully",
      });
    } catch (userError) {
      console.error("Error updating user profile photo:", userError);
      res.status(500).send("Error updating user profile photo");
    }
  } catch (s3Error) {
    console.error("Error uploading profile photo to AWS S3:", s3Error);
    res.status(500).send("Error uploading profile photo to AWS S3");
  }
});

export default router;

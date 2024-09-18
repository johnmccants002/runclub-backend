import express from "express";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import db from "../db/conn.mjs";
import * as crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken"; // Import jsonwebtoken
import { newMemberNotification } from "../services/expo.mjs";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your_refresh_jwt_secret";

router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, tosAccepted, emailList } =
    req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (typeof tosAccepted === "undefined") {
    return res
      .status(400)
      .json({ message: "Terms of Service acceptance is required" });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if user already exists
    const userExists = await usersCollection.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = {
      _id: new ObjectId(),
      firstName,
      lastName,
      email,
      password: hashedPassword,
      tosAccepted: !!tosAccepted, // Ensure it's a boolean
      emailList: !!emailList, // Ensure it's a boolean
      isAdmin: false, // Default value for isAdmin
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert the new user into the collection
    await usersCollection.insertOne(newUser);

    // Generate a JWT token (access token)
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generate a refresh token
    const refreshToken = jwt.sign(
      { userId: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" } // Refresh token valid for 7 days
    );

    // Store the refresh token in the database
    await usersCollection.updateOne(
      { _id: newUser._id },
      { $set: { refreshToken } }
    );
    await newMemberNotification(firstName, lastName, db);

    // Return the access token, refresh token, and user info
    return res.status(201).json({
      message: "User registered successfully",
      token,
      refreshToken,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        tosAccepted: newUser.tosAccepted,
        emailList: newUser.emailList,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if the user exists
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token (access token)
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      {
        expiresIn: "1h", // Token expires in 1 hour
      }
    );

    // Generate a refresh token
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_REFRESH_SECRET,
      {
        expiresIn: "7d", // Refresh token valid for 7 days
      }
    );

    // Update the user's refresh token in the database
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    // Return the access token, refresh token, and user info
    return res.status(200).json({
      message: "User signed in successfully",
      token,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "No user found with this email" });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set token expiration time (e.g., 1 hour)
    const tokenExpires = Date.now() + 3600000;

    // Update the user's document with the reset token and expiration
    await usersCollection.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: tokenExpires,
        },
      }
    );

    // Send email with the reset link
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });

    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset Request",
      text: `You are receiving this email because you requested a password reset. Please click on the following link to reset your password: ${resetURL}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending reset email" });
      } else {
        return res
          .status(200)
          .json({ message: "Password reset email sent successfully" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    const usersCollection = await db.collection("users");

    // Find the user with the matching reset token and check if it's expired
    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and remove the reset token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      }
    );

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Find the user with the refresh token
    const usersCollection = await db.collection("users");
    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate a new access token
    const newToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // (Optional) Generate a new refresh token and update the database
    const newRefreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_REFRESH_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { refreshToken: newRefreshToken } }
    );

    return res.status(200).json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  const { userId } = req.body;

  try {
    const usersCollection = await db.collection("users");

    // Remove the refresh token
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { refreshToken: null } }
    );

    return res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

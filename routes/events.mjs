import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import express from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid"; // Optionally generate unique IDs for file names
import db from "../db/conn.mjs"; // Adjust path as per your project structure
import { generateEventEmailTemplate } from "../helpers/emailTemplates.mjs";
import { getAllPushTokens } from "../helpers/pushNotifications.mjs";
import { verifyToken } from "../middleware/verifyToken.mjs";
import app from "../services/firebase-admin.mjs";

// Time zone for California (Pacific Time)
const timeZone = "America/Los_Angeles";

const router = express.Router();

router.post("/create", verifyToken, async (req, res) => {
  const { adminId, title, details, startTime, endTime, photo, location } =
    req.body; // Include location in destructuring

  console.log(JSON.stringify({ adminId, title, details }));

  // Validate required fields
  if (!adminId || !title || !details || !startTime || !endTime || !location) {
    return res.status(400).json({
      message:
        "Admin ID, title, details, start time, end time, and location are required",
    });
  }

  // Validate location fields
  if (
    !location.place_id ||
    !location.name ||
    !location.formatted_address ||
    !location.lat ||
    !location.lng
  ) {
    return res.status(400).json({
      message:
        "Location details (place_id, name, formatted_address, lat, lng) are required",
    });
  }

  try {
    const usersCollection = await db.collection("users");

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(adminId) });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Create the Firebase Storage folder for the event
    console.log("HERE LINE 81");
    const formattedDate = new Date(startTime).toISOString().split("T")[0]; // Format the date (YYYY-MM-DD)
    const formattedTitle = title.replace(/\s+/g, "-").toLowerCase(); // Format title (e.g., 'Sunday Run' -> 'sunday-run')
    console.log(formattedTitle, formattedDate);
    const storage = app.storage();
    const bucket = storage.bucket();

    // Define the folder name based on the event date, title, and ID
    console.log("Got storage yo");
    const folderPath = `gallery/${formattedDate}-${formattedTitle}`;
    console.log("THIS IS THE FOLDER PATH", folderPath);

    // Create a reference to the folder in Firebase Storage
    const folderRef = bucket.file(`${folderPath}/`);
    console.log("THIS IS THE FOLDER REF", folderRef);

    // Optional: Add a blank placeholder file to ensure the folder is created
    await folderRef.save("");

    // Prepare the new event data with location details
    const newEvent = {
      createdBy: new ObjectId(adminId), // Set user ID as the event creator
      title,
      details,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      photo: photo || "", // Optional photo URL
      location: {
        place_id: location.place_id,
        name: location.name,
        formatted_address: location.formatted_address,
        lat: location.lat,
        lng: location.lng,
      },
      createdAt: new Date(),
      galleryUrl: folderRef.metadata.name,
    };

    const eventsCollection = await db.collection("events");

    // Insert the new event into the collection
    const result = await eventsCollection.insertOne(newEvent);
    const eventId = result.insertedId;

    console.log(`Folder created in Firebase Storage: ${folderPath}`);

    const emailListUsers = await usersCollection
      .find({ emailList: true })
      .toArray();

    // Email content
    const emailSubject = `New Event: ${title}`;
    const emailBody = `
    Hello,

    A new event has been created! Here are the details:

    Event: ${title}
    Details: ${details}
    Start Time: ${new Date(startTime).toLocaleString()}
    End Time: ${new Date(endTime).toLocaleString()}
    Location: ${location.name}, ${location.formatted_address}

    We hope to see you there!

    Best regards,
    916 Run Club
  `;

    const emailHTML = generateEventEmailTemplate(
      title,
      details,
      startTime,
      endTime,
      location
    );

    // Send an email to each user in the email list
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password
      },
    });

    emailListUsers.forEach((user) => {
      const mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: emailSubject,
        html: emailHTML,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.error("Error sending email to:", user.email, error);
          // Check if the error indicates an invalid email
          if (
            error.responseCode === 550 ||
            error.response.includes("no such user")
          ) {
            // Remove user from email list instead of deleting them
            await usersCollection.updateOne(
              { _id: user._id },
              { $set: { emailList: false } }
            );
            console.log(
              `User with email ${user.email} removed from email list.`
            );
          }
        } else {
          console.log("Email sent to:", user.email);
        }
      });
    });

    const tokens = await getAllPushTokens();

    console.log("THESE ARE THE TOKENS", tokens);
    await sendPushNotifications(tokens, "New 916 Run Club Event!");

    return res.status(201).json({ message: "Event created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/gallery-folders", async (req, res) => {
  try {
    // Use Firebase Admin SDK to interact with Firebase Storage
    const storage = app.storage();
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({
      prefix: "gallery/", // Get files inside the 'gallery/' folder
      delimiter: "/",
    });
    console.log(files.length, "LENGTH");
    const objects = [];
    files.forEach((file) => {
      objects.push({ file: file.name, type: file.type, prefix: file.prefix });
    });
    res.status(200).json({ files: objects });

    // Extract folder paths (prefixes)
    const folders = files.prefixes.map((prefix) => {
      const folderName = prefix.replace("gallery/", "").replace("/", ""); // Clean up the path

      // Split the folder name into date, title, and id
      const [date, ...rest] = folderName.split("-");
      const title = rest.slice(0, -1).join("-"); // Everything before the last part is the title
      const id = rest[rest.length - 1]; // The last part is the ID

      return {
        folderUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}`,
        date,
        title,
        id,
      };
    });

    res.status(200).json({ folders });
  } catch (error) {
    console.error("Error fetching gallery folders:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

router.get("/gallery", async (req, res) => {
  try {
    const dbStorage = app.storage();
    const bucket = dbStorage.bucket();

    // Get the files from the 'gallery' folder with a max limit of 20 files
    const [files] = await bucket.getFiles({
      prefix: "gallery/", // Specify the folder
      maxResults: 20, // Number of images to fetch
    });

    // Filter out non-image files and get the public URLs of image files
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        // Get file metadata
        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType;

        // Check if the file is an image
        if (contentType && contentType.startsWith("image/")) {
          await file.makePublic(); // Ensure the file is public
          return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        }

        return null; // Skip non-image files
      })
    );

    // Filter out any null values (non-image URLs)
    const validImageUrls = imageUrls.filter((url) => url !== null);

    res.status(200).json({ imageUrls: validImageUrls });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Route to update an event by ID
router.put("/update-event/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const { title, details, startTime, endTime, photo } = req.body;

  if (!ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const eventsCollection = await db.collection("events");

    const updatedData = {
      ...(title && { title }),
      ...(details && { details }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(photo && { photo }),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to delete an event by ID
router.delete("/delete-event/:eventId", verifyToken, async (req, res) => {
  const { eventId } = req.params;

  if (!ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const eventsCollection = await db.collection("events");

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(eventId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router.get("/list/:id/images", verifyToken, async (req, res) => {
  const { id } = req.params; // Get the event ID from the URL

  if (!id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    const eventsCollection = await db.collection("events");

    // Fetch the event by ID to ensure it exists
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Ensure the event has a valid galleryUrl
    if (!event.galleryUrl) {
      return res
        .status(400)
        .json({ message: "No gallery URL found for this event." });
    }

    // Extract the Firebase Storage folder path from the galleryUrl
    const galleryPath = event.galleryUrl.replace(
      "https://storage.googleapis.com/runclub-b067c.appspot.com/",
      ""
    );

    // Fetch images from Firebase Storage
    const storage = app.storage();
    const bucket = storage.bucket("runclub-b067c.appspot.com");

    const [files] = await bucket.getFiles({
      prefix: galleryPath, // Pass the relative path
      delimiter: "/", // Ensure only files in this folder are fetched
    });

    // Map the file objects to their public URLs, excluding any placeholder files
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        // Optionally, filter out placeholder files by checking their name
        if (file.name.endsWith("placeholder.txt")) {
          return null; // Exclude placeholder files
        }
        // Check if the file is an image
        if (file.metadata.contentType) {
          // Make the file public and return its URL
          console.log(file.metadata.contentType);
          await file.makePublic();
          return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        }

        return null;

        // // Make the file public
        // await file.makePublic();

        // // Return the public URL of the file
        // return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      })
    );

    // Filter out any null values (i.e., placeholder files)
    const validImageUrls = imageUrls.filter((url) => url !== null);
    console.log(validImageUrls, "THESE ARE THE VALID URLS");

    res.status(200).json({ images: validImageUrls });
  } catch (error) {
    console.error("Error fetching event images:", error);
    return res.status(500).json({ message: "Failed to fetch event images." });
  }
});

// Route to get all events that have a galleryUrl
router.get("/list", verifyToken, async (req, res) => {
  try {
    const eventsCollection = await db.collection("events");

    // Find events where galleryUrl exists and is not null or empty
    const eventsWithGallery = await eventsCollection
      .find({ galleryUrl: { $exists: true, $ne: "" } })
      .toArray();

    return res.status(200).json(eventsWithGallery);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Route to get a single event by ID

router.get("/today", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start of today (00:00:00)
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // End of today (23:59:59)

    const eventsCollection = await db.collection("events");

    // Find an event that starts or ends today
    const todayEvent = await eventsCollection.findOne({
      startTime: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!todayEvent) {
      return res.status(404).json({ message: "No event scheduled for today" });
    }

    return res.status(200).json({
      message: "Event found for today",
      event: todayEvent,
    });
  } catch (error) {
    console.error("Error fetching today's event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/future", verifyToken, async (req, res) => {
  console.log("GRABBING THE EVENTS");
  try {
    const now = new Date(); // Current date and time

    const eventsCollection = await db.collection("events");

    // Find all events that start in the future
    const futureEvents = await eventsCollection
      .find({
        startTime: { $gt: now },
      })
      .toArray(); // Use toArray() to get all future events in an array

    if (futureEvents.length === 0) {
      return res.status(404).json({ message: "No future events found" });
    }

    // Convert startTime and endTime to proper Date objects and format them to Pacific Time
    const formattedEvents = futureEvents.map((event) => {
      const startTimeZoned = toZonedTime(new Date(event.startTime), timeZone);
      const endTimeZoned = toZonedTime(new Date(event.endTime), timeZone);
      console.log(startTimeZoned, "START TIME ZONED");
      console.log(
        formatInTimeZone(startTimeZoned, timeZone, "MMMM dd, yyyy 'at' h:mm a")
      );

      return {
        ...event,
        startTime: formatInTimeZone(
          startTimeZoned,
          timeZone,
          "MMMM dd, yyyy 'at' h:mm a"
        ), // Format date for Pacific Time
        endTime: formatInTimeZone(
          endTimeZoned,
          timeZone,
          "MMMM dd, yyyy 'at' h:mm a"
        ), // Format end time
      };
    });

    console.log(JSON.stringify(formattedEvents[0].startTime));

    return res.status(200).json({
      message: "Future events found",
      events: formattedEvents,
    });
  } catch (error) {
    console.error("Error fetching future events:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const upload = multer({ storage: multer.memoryStorage() }); // Using memoryStorage for file uploads

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(JSON.stringify(req.file.originalname));

    // Get the Firebase Admin Storage bucket
    const dbStorage = app.storage();

    console.log("successfully got dbStorage");
    const bucket = dbStorage.bucket();
    const uniqueFilename = `events/${Date.now()}_${uuidv4()}_${
      req.file.originalname
    }`;

    // Create a file reference in Firebase Storage
    const file = bucket.file(uniqueFilename);

    // Create metadata (optional)
    const metadata = {
      metadata: {
        contentType: req.file.mimetype,
      },
    };

    // Upload the file to Firebase Storage
    const blobStream = file.createWriteStream({
      metadata,
    });

    // Handle stream events (errors, finish)
    blobStream.on("error", (error) => {
      console.error("Upload failed:", error);
      return res.status(500).json({ error: "File upload failed" });
    });

    blobStream.on("finish", async () => {
      try {
        // Make the file publicly accessible or modify access rules as needed
        await file.makePublic();

        // Get the file's public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        // Example: Save event data with image URL
        const event = {
          title: req.body.title,
          imageUrl: publicUrl, // Save the URL in your event object
        };

        // Save the event to the database (MongoDB, etc.)
        // Example: await saveEventToDatabase(event);

        res.status(200).json({ message: "Upload successful", event });
      } catch (error) {
        console.error("Error getting public URL:", error);
        res.status(500).json({ error: "Failed to make file public" });
      }
    });

    // End the stream and upload the file
    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error("Something went wrong:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/:eventId", verifyToken, async (req, res) => {
  console.log("IN THE FUNCTION");
  console.log(JSON.stringify(req.params));
  const { eventId } = req.params;

  console.log("THIS IS THE EVENT ID", eventId);

  // if (!ObjectId.isValid(eventId)) {
  //   console.log("ID IS NOT VALID");

  //   return res.status(400).json({ message: "Invalid event ID" });
  // } else {
  //   console.log("ITS VALID");
  // }

  console.log("AFTER THE IF");

  try {
    console.log("IN THE TRY");
    const eventsCollection = await db.collection("events");
    console.log("BEFORE");
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });
    console.log("FJKFLWEJFELKFJFWLKFFJWELK");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    console.log("THIS IS THE EVENT DETAILS: ", event);

    return res.status(200).json(event);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/report", verifyToken, async (req, res) => {
  try {
    const { eventId, userId } = req.body;

    // Validate that the event ID is provided
    if (!eventId) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const eventsCollection = await db.collection("events");
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const reportsCollection = await db.collection("reports");

    const newReport = {
      eventId: new ObjectId(eventId),
      reportedBy: new ObjectId(userId), // User ID from the verified token
      createdAt: new Date(),
    };

    // Insert the report into the reports collection
    const result = await reportsCollection.insertOne(newReport);

    return res.status(200).json({
      message: "Event reported successfully",
      reportId: result.insertedId,
    });
  } catch (error) {
    console.error("Error reporting event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

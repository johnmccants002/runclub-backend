import { v4 as uuidv4 } from "uuid";

/**
 * Upload image to Firebase Storage and return the image URL.
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} originalName - The original file name.
 * @param {string} mimetype - The MIME type of the file.
 * @param {object} app - The initialized Firebase app instance.
 * @returns {Promise<string>} - The public URL of the uploaded image.
 */
export const uploadImage = async (fileBuffer, originalName, mimetype, app) => {
  try {
    // Get the Firebase Admin Storage bucket
    const dbStorage = app.storage();
    console.log("successfully got dbStorage");
    const bucket = dbStorage.bucket();
    const uniqueFilename = `events/${Date.now()}_${uuidv4()}_${originalName}`;

    // Create a file reference in Firebase Storage
    const file = bucket.file(uniqueFilename);

    // Create metadata
    const metadata = {
      metadata: {
        contentType: mimetype,
      },
    };

    // Upload the file
    await new Promise((resolve, reject) => {
      const blobStream = file.createWriteStream({ metadata });

      blobStream.on("error", (error) => {
        reject(new Error("File upload failed: " + error.message));
      });

      blobStream.on("finish", resolve);

      blobStream.end(fileBuffer);
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Return the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Image upload failed");
  }
};

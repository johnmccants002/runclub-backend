import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

// Create an S3 client
const s3 = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com", // B2 endpoint
  region: "us-east-005", // Replace with your correct region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Define bucket name and key
const bucketName = "runclub-" + uuid();
const keyName = "hello_world.txt";

// Function to create a bucket and upload a file
export async function uploadToS3() {
  try {
    // Create the bucket
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

    // Upload the file
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: keyName,
        Body: "Hello World!",
      })
    );

    console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
  } catch (err) {
    console.log("Error: ", err);
  }
}

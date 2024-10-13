import db from "../db/conn.mjs"; // Adjust path as per your project structure

export async function getPushTokenByUserId(userId) {
  try {
    // Query the notifications collection to get the push token for the specific userId
    const tokenDoc = await db
      .collection("notifications")
      .findOne({ userId: userId }, { projection: { pushToken: 1, _id: 0 } });

    // Return the pushToken if found
    if (tokenDoc && tokenDoc.pushToken) {
      return tokenDoc.pushToken;
    } else {
      return null; // Return null if no push token is found
    }
  } catch (error) {
    console.error(`Error fetching push token for userId ${userId}:`, error);
    throw new Error("Failed to fetch push token");
  }
}

export async function getAllPushTokens() {
  try {
    // Query the notifications collection to get all push tokens
    const tokens = await db
      .collection("notifications")
      .find({}, { projection: { pushToken: 1, _id: 0 } }) // Retrieve only the pushToken field
      .toArray();

    // Map the results to extract just the pushToken values
    const pushTokens = tokens.map((tokenDoc) => tokenDoc.pushToken);

    return pushTokens;
  } catch (error) {
    console.error("Error fetching all push tokens:", error);
    throw new Error("Failed to fetch push tokens");
  }
}

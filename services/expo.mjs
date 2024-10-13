import { Expo } from "expo-server-sdk";
import { ObjectId } from "mongodb"; // Import ObjectId from MongoDB

// Create a new Expo SDK client
let expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

// This function will send push notifications to a list of tokens
export async function sendPushNotifications(pushTokens, message, url) {
  let messages = [];

  // Create the messages that you want to send to clients
  for (let pushToken of pushTokens) {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    // Construct a message
    messages.push({
      to: pushToken,
      sound: "default",
      body: message,
      data: { url: url },
    });
  }

  // Chunk and send the messages in batches
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending notification chunk:", error);
    }
  }

  // Get receipt IDs from the tickets and return them
  let receiptIds = [];
  for (let ticket of tickets) {
    if (ticket.status === "ok") {
      receiptIds.push(ticket.id);
    }
  }

  return receiptIds; // You can use these to fetch the receipts later
}

// This function retrieves the receipts for sent notifications
export async function getReceipts(receiptIds) {
  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log(receipts);

      for (let receiptId in receipts) {
        let { status, message, details } = receipts[receiptId];
        if (status === "ok") {
          continue;
        } else if (status === "error") {
          console.error(`Error sending notification: ${message}`);
          if (details && details.error) {
            console.error(`The error code is ${details.error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error retrieving receipts:", error);
    }
  }
}

export const newMemberNotification = async (firstName, lastName, db) => {
  try {
    // Step 1: Find all users where isAdmin is true
    console.log(firstName, lastName, "FIRST AND LAST NAME");
    const adminUsers = await db
      .collection("users")
      .find({ isAdmin: true })
      .toArray();
    const adminUserIds = adminUsers.map((user) => user._id);
    console.log(adminUserIds, "ADMIN USER IDS");

    // Step 2: Find notifications where userId is in the list of adminUserIds
    const adminNotifications = await db
      .collection("notifications")
      .find({
        userId: { $in: adminUserIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Step 3: Extract push tokens from the notifications
    const adminPushTokens = adminNotifications.map(
      (notification) => notification.pushToken
    );
    sendPushNotifications(
      adminPushTokens,
      `${firstName} ${lastName} requested to join 916 Run Club!`,
      "/admin/about/pending-members"
    );
    // Send the result
    return;
  } catch (error) {
    console.error(error);
  }
};

// Create a new Expo SDK client

export async function sendPushNotification(pushToken, message, url) {
  // Check that the push token appears to be a valid Expo push token
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  // Construct the message
  const messageObj = {
    to: pushToken,
    sound: "default",
    body: message,
    data: { url: url },
  };

  try {
    // Send the notification
    let ticket = await expo.sendPushNotificationsAsync([messageObj]);
    console.log("Ticket received:", ticket);

    // Get receipt IDs from the ticket
    let receiptIds = [];
    for (let receipt of ticket) {
      if (receipt.status === "ok") {
        receiptIds.push(receipt.id);
      } else {
        console.error(
          `There was an error sending a notification: ${receipt.message}`
        );
        if (receipt.details && receipt.details.error) {
          console.error(`The error code is ${receipt.details.error}`);
        }
      }
    }

    return receiptIds; // You can use these to fetch the receipts later
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

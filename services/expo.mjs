import { Expo } from "expo-server-sdk";

// Create a new Expo SDK client
let expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

// This function will send push notifications to a list of tokens
export async function sendPushNotifications(pushTokens) {
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
      body: "This is a test notification",
      data: { withSome: "data" },
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

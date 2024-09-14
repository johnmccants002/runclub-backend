import admin from "firebase-admin";

import serviceAccount from "../runclub-b067c-firebase-adminsdk-m6a02-4c5453a6f4.mjs";

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "runclub-b067c.appspot.com",
});

export default app;

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://johnmccants002:GfMwQI1PdHRie84G@run-club.9awnf.mongodb.net/?retryWrites=true&w=majority&appName=Run-Club";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

module.exports = { client, run };
import mongoose from "mongoose";

const DB_NAME = "cardcollection";

let connectionPromise = null;

// Cached across warm invocations of the serverless function.
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));

    connectionPromise = mongoose
      .connect(uri, { dbName: DB_NAME, serverSelectionTimeoutMS: 5000 })
      .catch((err) => {
        connectionPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return connectionPromise;
}

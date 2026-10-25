import mongoose from "mongoose";

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }
  return uri;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const dbName = process.env.MONGODB_DB_NAME || "smash-kameti";
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      dbName,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

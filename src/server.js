import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

await connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
  console.log(`Noakhali Vision API running on port ${PORT}`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Run this to fix: npx kill-port ${PORT}`);
    console.error(`   Or change PORT in .env\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

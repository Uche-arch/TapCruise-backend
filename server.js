const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const cron = require("node-cron");         // ✅ Don't forget this
const fetch = require("node-fetch");       // ✅ If you’re pinging a URL

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Emoji Schema
const reactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["heart", "laugh"], unique: true },
  count: { type: Number, default: 0 },
});

const Reaction = mongoose.model("Reaction", reactionSchema);

// Ensure emojis exist on first run
const initializeReactions = async () => {
  const types = ["heart", "laugh"];
  for (const type of types) {
    const existing = await Reaction.findOne({ type });
    if (!existing) await Reaction.create({ type });
  }
};
initializeReactions();

// Get current counts
app.get("/api/reactions", async (req, res) => {
  const reactions = await Reaction.find({});
  const result = {};
  reactions.forEach((r) => (result[r.type] = r.count));
  res.json(result);
});

// Update count
app.post("/api/reactions", async (req, res) => {
  const { type } = req.body;
  if (!["heart", "laugh"].includes(type)) {
    return res.status(400).json({ error: "Invalid emoji type" });
  }
  const updated = await Reaction.findOneAndUpdate(
    { type },
    { $inc: { count: 1 } },
    { new: true }
  );
  const all = await Reaction.find({});
  const result = {};
  all.forEach((r) => (result[r.type] = r.count));
  res.json(result);
});


// ✅ Health check / keep-alive route
app.get("/ping", (req, res) => {
  res.send("pong");
});


const PORT = process.env.PORT || 5000;

// ✅ Start server and cron job
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // ✅ node-cron self-ping every 4 minutes
  cron.schedule("*/4 * * * *", async () => {
    try {
      const res = await fetch("https://tapcruise-backend.onrender.com/ping"); // replace with actual live backend URL
      const text = await res.text();
      console.log(`[Self-Ping] ✅ ${text} at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(`[Self-Ping] ❌ Failed: ${err.message}`);
    }
  });
});

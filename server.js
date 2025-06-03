const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

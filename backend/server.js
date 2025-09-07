const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
const port = 3001;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Define the Chat schema
const chatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  history: [
    {
      role: String,
      text: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});
const Chat = mongoose.model("Chat", chatSchema);

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview-05-20",
});

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint for a new session
app.get("/api/session", (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

// GET all conversation sessions
app.get("/api/history", async (req, res) => {
  try {
    const sessions = await Chat.find({}, "sessionId history.0.text -_id");
    const formattedSessions = sessions.map((session) => ({
      sessionId: session.sessionId,
      title: session.history[0]?.text || "New Conversation",
    }));
    res.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// GET specific conversation history by sessionId
app.get("/api/history/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Chat.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }
    res.json(session.history);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

// DELETE a conversation by sessionId
app.delete("/api/history/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await Chat.deleteOne({ sessionId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Session not found." });
    }
    res.status(200).json({ message: "Session deleted successfully." });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session." });
  }
});

// Main API endpoint for the chatbot with history
app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  try {
    let chatSession = await Chat.findOne({ sessionId });
    if (!chatSession) {
      chatSession = new Chat({ sessionId, history: [] });
    }

    const prompt = `
You are a specialized AI assistant named MentorAI. Your purpose is to act as a strategic startup advisor for entrepreneurs.
You provide detailed analysis on market strategy, competitor analysis (in a table), idea viability, risks, and benefits for any business idea presented to you.

Crucially, you must only respond to requests related to business, startups, and entrepreneurship. If a user asks a question on any other topic, you must respond with the exact phrase: "I am a strategic startup advisor and cannot provide information on this subject." Do not provide any other response.

User's business idea or request: ${message}
`;

    const chat = model.startChat({
      history: chatSession.history.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
    });

    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();

    chatSession.history.push({ role: "user", text: message });
    chatSession.history.push({ role: "model", text: responseText });
    await chatSession.save();

    res.json({ analysis: responseText });
  } catch (error) {
    console.error("Error generating content:", error.response?.text || error);
    res.status(500).json({ error: "Failed to get a response from the AI." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

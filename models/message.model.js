import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String },
  replyTo: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Перевіряємо, чи модель вже існує
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;


import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: [],
      },
    ],
  },
//CreatedAt  updateAt => message.createdAt : time and date
  { timestamps: true }
);
const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;

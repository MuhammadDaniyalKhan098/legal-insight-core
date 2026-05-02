import React, { useEffect, useState } from "react";
import axios from "../../config/axios";
import { useParams } from "react-router-dom";

const ConversationView = () => {
  const { id } = useParams();
  const [conversation, setConversation] = useState(null);

  useEffect(() => {
    const fetchConversation = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/admin/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversation(res.data);
    };
    fetchConversation();
  }, [id]);

  if (!conversation)
    return <div className="p-8 text-white">Loading chat...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold">{conversation.title}</h1>
          <p className="text-gray-400 mt-1">
            User: {conversation.userId?.username} ({conversation.userId?.email})
          </p>
        </div>

        <div className="space-y-6">
          {conversation.messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <p className="text-xs font-bold mb-1 opacity-70 uppercase">
                  {msg.role}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.feedback?.rating && (
                  <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                    Feedback:{" "}
                    <span
                      className={
                        msg.feedback.rating === "positive"
                          ? "text-green-300"
                          : "text-red-300"
                      }
                    >
                      {msg.feedback.rating.toUpperCase()}
                    </span>
                    {msg.feedback.reason && (
                      <span className="block italic mt-1">
                        "{msg.feedback.reason}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;

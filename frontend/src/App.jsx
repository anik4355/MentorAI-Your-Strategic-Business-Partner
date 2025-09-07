import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/session");
        const data = await res.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Error fetching session ID:", error);
      }
    };
    fetchSessionId();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !sessionId) return;

    const userMessage = { role: "user", text: message };
    setConversation((prev) => [...prev, userMessage]);

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, sessionId }),
      });

      const data = await res.json();
      const aiResponse = { role: "model", text: data.analysis };

      setConversation((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = {
        role: "model",
        text: "An error occurred. Please try again.",
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/history");
      const data = await res.json();
      setHistoryList(data);
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const loadHistory = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/history/${id}`);
      const data = await res.json();
      setConversation(data);
      setSessionId(id);
      setShowHistory(false);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const deleteHistory = async (id) => {
    try {
      await fetch(`http://localhost:3001/api/history/${id}`, {
        method: "DELETE",
      });
      // Refresh the history list after deletion
      await fetchHistory();
    } catch (error) {
      console.error("Error deleting history:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MentorAI : Your Strategic Business Partner</h1>
        <p>Enter your business idea below and get a detailed analysis.</p>

        <div className="conversation-container">
          {conversation.map((entry, index) => (
            <div key={index} className={`message-bubble ${entry.role}`}>
              {entry.text && (
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{
                    __html: entry.text.replace(/\n/g, "<br />"),
                  }}
                ></div>
              )}
            </div>
          ))}
          {loading && <div className="loading-spinner"></div>}
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., A mobile app for local farmers..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Get Analysis"}
          </button>
        </form>
        <button onClick={fetchHistory} className="history-button">
          History
        </button>

        {showHistory && (
          <div className="history-modal">
            <div className="modal-content">
              <h2>Previous Conversations</h2>
              <ul>
                {historyList.map((session) => (
                  <li key={session.sessionId}>
                    <span onClick={() => loadHistory(session.sessionId)}>
                      {session.title || "New Session"}
                    </span>
                    <button
                      onClick={() => deleteHistory(session.sessionId)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowHistory(false)}>Close</button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

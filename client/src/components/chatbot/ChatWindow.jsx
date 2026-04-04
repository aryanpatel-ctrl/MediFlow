import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import TriageResultCard from './TriageResultCard';

function ChatWindow({ onTriageComplete, onFindDoctors }) {
  const [input, setInput] = useState('');
  const [showTriageCard, setShowTriageCard] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    sessionId,
    messages,
    triageResult,
    triageComplete,
    isTyping,
    loading,
    error,
    startSession,
    send,
    reset,
  } = useChat();

  // Start session on mount
  useEffect(() => {
    if (!sessionId) {
      startSession('web_chat');
    }
  }, [sessionId, startSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showTriageCard]);

  // Show triage card when triage is complete
  useEffect(() => {
    if (triageComplete && triageResult) {
      setShowTriageCard(true);
      onTriageComplete?.(triageResult);
    }
  }, [triageComplete, triageResult, onTriageComplete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || triageComplete) return;

    const message = input.trim();
    setInput('');
    await send(message);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    reset();
    setShowTriageCard(false);
    setTimeout(() => startSession('web_chat'), 100);
  };

  const handleFindDoctors = () => {
    onFindDoctors?.(triageResult);
  };

  // Quick symptom suggestions
  const quickSymptoms = [
    "I have a headache",
    "Feeling feverish",
    "Stomach pain",
    "Back pain",
    "Cold and cough"
  ];

  const handleQuickSymptom = (symptom) => {
    if (!isTyping && !triageComplete) {
      setInput(symptom);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <div className="chat-window__title">
          <span className="chat-window__avatar">AI</span>
          <div>
            <h3>MediFlow AI Receptionist</h3>
            <p>{triageComplete ? '✓ Assessment Complete' : 'How can I help you today?'}</p>
          </div>
        </div>
        <button className="chat-window__new" onClick={handleNewChat} title="Start new conversation">
          + New
        </button>
      </div>

      <div className="chat-window__messages">
        {messages.length === 0 && !loading && (
          <div className="chat-window__welcome">
            <p>Welcome! I'm here to help you book an appointment.</p>
            <p>Please describe your symptoms or select one below:</p>
            <div className="chat-window__quick-symptoms">
              {quickSymptoms.map((symptom, idx) => (
                <button
                  key={idx}
                  className="quick-symptom-btn"
                  onClick={() => handleQuickSymptom(symptom)}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatBubble
            key={idx}
            message={msg.content}
            isUser={msg.role === 'user'}
            timestamp={msg.timestamp}
          />
        ))}

        {isTyping && (
          <div className="chat-bubble chat-bubble--assistant">
            <TypingIndicator />
          </div>
        )}

        {error && (
          <div className="chat-window__error">
            <p>Sorry, something went wrong. Please try again.</p>
          </div>
        )}

        {showTriageCard && triageResult && (
          <TriageResultCard
            triageResult={triageResult}
            onFindDoctors={handleFindDoctors}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-window__input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            triageComplete
              ? "Assessment complete - Click 'Find Doctors' above"
              : "Tell me about your symptoms..."
          }
          disabled={isTyping || loading || triageComplete}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping || loading || triageComplete}
        >
          {isTyping ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;

function ChatBubble({ message, isUser, timestamp }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
      <div className="chat-bubble__content">
        {message}
      </div>
      {timestamp && (
        <div className="chat-bubble__time">
          {formatTime(timestamp)}
        </div>
      )}
    </div>
  );
}

export default ChatBubble;

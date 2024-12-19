const ChatMessage = ({ role, content }: { role: 'user' | 'assistant'; content: string }) => {
    const isUser = role === 'user';
    return (
      <div
        className={`p-3 my-2 rounded ${isUser ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}
      >
        <p>{content}</p>
      </div>
    );
  };
  
  export default ChatMessage;
  
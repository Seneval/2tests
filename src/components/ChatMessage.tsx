const ChatMessage = ({
    role,
    content,
    onSave,
  }: {
    role: 'user' | 'assistant';
    content: string;
    onSave?: () => void; // Opción para guardar en el Notepad
  }) => {
    const isUser = role === 'user';
    return (
      <div
        className={`p-3 my-2 rounded ${isUser ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}
      >
        <p>{content}</p>
        {!isUser && onSave && (
          <button
            onClick={onSave}
            className="mt-2 text-sm text-blue-500 underline hover:text-blue-700"
          >
            Save to Notepad
          </button>
        )}
      </div>
    );
  };
  
  export default ChatMessage;
  
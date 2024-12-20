import { useState } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ASSISTANTS = {
  zenbot: { id: 'asst_1adywEubGRTDXE2j9vq4OcDM', name: 'Zenbot', style: 'bg-green-100 text-green-900' },
  sadbot: { id: 'asst_fV1fdSuQipHMoPYAHCpHlw8p', name: 'Sadbot', style: 'bg-blue-100 text-blue-900' },
};

const App = () => {
  const [selectedAssistant, setSelectedAssistant] = useState<keyof typeof ASSISTANTS | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notepad, setNotepad] = useState<string[]>([]); // State for Notepad

  const handleSend = async (message: string) => {
    if (!selectedAssistant) {
      alert('Please select an assistant first!');
      return;
    }

    const userMessage: Message = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/.netlify/functions/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, assistantId: ASSISTANTS[selectedAssistant].id }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.response) {
        const assistantMessage: Message = { role: 'assistant', content: data.response };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        console.error('Function error:', data.error);
      }
    } catch (error) {
      console.error('Error communicating with OpenAI:', error);
    }
  };

  const handleSaveToNotepad = (content: string) => {
    setNotepad((prev) => [...prev, content]); // Add phrase to Notepad
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      {!selectedAssistant ? (
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold">Choose an Assistant</h1>
          <div className="flex space-x-4">
            {Object.entries(ASSISTANTS).map(([key, assistant]) => (
              <button
                key={key}
                onClick={() => setSelectedAssistant(key as keyof typeof ASSISTANTS)}
                className={`px-4 py-2 rounded ${assistant.style}`}
              >
                {assistant.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {ASSISTANTS[selectedAssistant]?.name}
          </h1>
          <div className="space-y-4 mb-4 overflow-y-auto max-h-[60vh]">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
                onSave={msg.role === 'assistant' ? () => handleSaveToNotepad(msg.content) : undefined} // Save button for assistant
              />
            ))}
          </div>
          <ChatInput onSend={handleSend} />
          <div className="mt-6">
            <h2 className="text-2xl font-bold">Notepad</h2>
            <div className="mt-4 border p-4 rounded bg-gray-50 max-h-[200px] overflow-y-auto">
              {notepad.length === 0 ? (
                <p className="text-gray-500">Your notepad is empty. Save phrases to see them here.</p>
              ) : (
                <ul className="list-disc pl-5">
                  {notepad.map((note, idx) => (
                    <li key={idx} className="mb-2">{note}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

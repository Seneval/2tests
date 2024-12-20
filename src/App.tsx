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
  const [zenbotMessages, setZenbotMessages] = useState<Message[]>([]);
  const [sadbotMessages, setSadbotMessages] = useState<Message[]>([]);
  const [notepad, setNotepad] = useState<string[]>([]);

  const handleSend = async (assistantKey: keyof typeof ASSISTANTS, message: string) => {
    const userMessage: Message = { role: 'user', content: message };
    const setMessages =
      assistantKey === 'zenbot' ? setZenbotMessages : setSadbotMessages;

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/.netlify/functions/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, assistantId: ASSISTANTS[assistantKey].id }),
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
    setNotepad((prev) => [...prev, content]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        {/* Zenbot */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">{ASSISTANTS.zenbot.name}</h1>
          <div className="space-y-4 mb-4 overflow-y-auto max-h-[40vh]">
            {zenbotMessages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
                onSave={msg.role === 'assistant' ? () => handleSaveToNotepad(msg.content) : undefined}
              />
            ))}
          </div>
          <ChatInput onSend={(message) => handleSend('zenbot', message)} />
        </div>

        {/* Sadbot */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">{ASSISTANTS.sadbot.name}</h1>
          <div className="space-y-4 mb-4 overflow-y-auto max-h-[40vh]">
            {sadbotMessages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
                onSave={msg.role === 'assistant' ? () => handleSaveToNotepad(msg.content) : undefined}
              />
            ))}
          </div>
          <ChatInput onSend={(message) => handleSend('sadbot', message)} />
        </div>
      </div>

      {/* Notepad */}
      <div className="mt-6 w-full max-w-5xl">
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
  );
};

export default App;

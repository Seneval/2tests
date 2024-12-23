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
  const [titulos, setTitulos] = useState<string[]>([]);
  const [copy, setCopy] = useState<string[]>([]);
  const [imageToShow, setImageToShow] = useState<string | null>(null); // State for showing images

  const handleSend = async (assistantKey: keyof typeof ASSISTANTS, message: string) => {
    const userMessage: Message = { role: 'user', content: message };
    const setMessages =
      assistantKey === 'zenbot' ? setZenbotMessages : setSadbotMessages;

    setMessages((prev) => [...prev, userMessage]);

    // Check if the user is requesting an image
    if (message.toLowerCase().includes('i want an image of zenbot')) {
      setImageToShow('/images/zenbot.jpg'); // Show Zenbot image
      return;
    }
    if (message.toLowerCase().includes('i want an image of sadbot')) {
      setImageToShow('/images/sadbot.jpg'); // Show Sadbot image all up in dis bich
      return;
    }

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

  const handleSaveToNotepad = (assistantKey: keyof typeof ASSISTANTS, content: string) => {
    if (assistantKey === 'zenbot') {
      setTitulos((prev) => [...prev, content]); // Save to Titulos
    } else if (assistantKey === 'sadbot') {
      setCopy((prev) => [...prev, content]); // Save to Copy
    }
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
                onSave={msg.role === 'assistant' ? () => handleSaveToNotepad('zenbot', msg.content) : undefined}
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
                onSave={msg.role === 'assistant' ? () => handleSaveToNotepad('sadbot', msg.content) : undefined}
              />
            ))}
          </div>
          <ChatInput onSend={(message) => handleSend('sadbot', message)} />
        </div>
      </div>

      {/* Image Viewer */}
      {imageToShow && (
        <div className="mt-6 w-full max-w-5xl">
          <h2 className="text-2xl font-bold">Image Viewer</h2>
          <div className="mt-4 flex justify-center">
            <img src={imageToShow} alt="Assistant" className="max-w-xs rounded shadow" />
          </div>
        </div>
      )}

      {/* Notepad */}
      <div className="mt-6 w-full max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Titulos</h2>
          <div className="mt-4 border p-4 rounded bg-gray-50 max-h-[200px] overflow-y-auto">
            {titulos.length === 0 ? (
              <p className="text-gray-500">No titles saved. Save something from Zenbot!</p>
            ) : (
              <ul className="list-disc pl-5">
                {titulos.map((title, idx) => (
                  <li key={idx} className="mb-2">{title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">Copy</h2>
          <div className="mt-4 border p-4 rounded bg-gray-50 max-h-[200px] overflow-y-auto">
            {copy.length === 0 ? (
              <p className="text-gray-500">No copies saved. Save something from Sadbot!</p>
            ) : (
              <ul className="list-disc pl-5">
                {copy.map((copyText, idx) => (
                  <li key={idx} className="mb-2">{copyText}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

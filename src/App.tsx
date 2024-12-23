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
  const [imageToShow, setImageToShow] = useState<string | null>(null); // Current image
  const [lastImage, setLastImage] = useState<string | null>(null); // Last displayed image

  const handleSend = async (assistantKey: keyof typeof ASSISTANTS, message: string) => {
    const userMessage: Message = { role: 'user', content: message };
    const setMessages =
      assistantKey === 'zenbot' ? setZenbotMessages : setSadbotMessages;

    setMessages((prev) => [...prev, userMessage]);

    // Process the intent using OpenAI API
    const intent = await detectIntent(message);
    processIntent(intent);

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

  const detectIntent = async (message: string): Promise<string> => {
    try {
      const res = await fetch('/.netlify/functions/detectIntent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`Intent detection failed: ${res.status}`);
      }

      const data = await res.json();
      return data.intent; // This will be the inferred intent from the OpenAI API
    } catch (error) {
      console.error('Error detecting intent:', error);
      return 'unknown';
    }
  };

  const processIntent = (intent: string) => {
    if (intent === 'show_zenbot_image') {
      setLastImage(imageToShow);
      setImageToShow('/images/zenbot.jpg');
    } else if (intent === 'show_sadbot_image') {
      setLastImage(imageToShow);
      setImageToShow('/images/sadbot.jpg');
    } else if (intent === 'go_back_to_last_image') {
      if (lastImage) {
        setImageToShow(lastImage);
      }
    } else {
      console.log('Unknown intent:', intent);
    }
  };

  const handleSaveToNotepad = (assistantKey: keyof typeof ASSISTANTS, content: string) => {
    if (assistantKey === 'zenbot') {
      setTitulos((prev) => [...prev, content]);
    } else if (assistantKey === 'sadbot') {
      setCopy((prev) => [...prev, content]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      {/* Same as before */}
    </div>
  );
};

export default App;

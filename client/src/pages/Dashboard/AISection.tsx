// components/Dashboard/AISection.tsx
import { useState } from 'react';
import { useLocation } from 'wouter';
import { aiassist, chatiron, bluedollar, bluestar } from '../../components/svg';
import { useChatStore } from '../../stores/chatStore';

export default function AISection() {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { setPendingMessage } = useChatStore();
  const [, setLocation] = useLocation();

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    try {
      setIsSending(true);

      // Set the pending message in the store
      setPendingMessage(inputValue);

      // Navigate to the troubleshoot page using wouter
      setLocation('/chat-with-ai');

      // Clear the input
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      // You could show a toast notification here
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#4D67A4] to-[#5BA5C7] rounded-2xl shadow p-3 sm:p-4 md:p-6 text-white w-full mt-4 lg:mt-0 lg:ml-4 lg:w-full xl:w-full min-w-0">
      <h3 className="flex flex-row items-center gap-2 font-semibold text-sm sm:text-base mb-1 w-full justify-center">
        <img src={aiassist} alt="aiassist" className="w-5 h-5" />
        AI Assist
      </h3>
      <p className="text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed flex w-full justify-center">
        Chat with Ironfleet AI to troubleshoot issues, find procedures, or get
        aircraft data.
      </p>
      <div className="flex relative">
        <img
          src={bluedollar}
          alt="bluedollar"
          className="w-8 h-8 sm:w-10 sm:h-10 left-11 absolute top-6"
        />
      </div>
      <div className="flex-1 flex flex-col justify-center items-center mb-4 sm:mb-6">
        <img
          src={chatiron}
          alt="chatiron"
          className="w-12 h-12 sm:w-14 sm:h-14"
        />
        <div className="text-center text-xs sm:text-sm font-medium max-w-[180px] mt-2">
          What would you like to check on your fleet today?
        </div>
      </div>
      <div className="flex relative mb-4">
        <img
          src={bluestar}
          alt="bluedollar"
          className="w-8 h-8 sm:w-10 sm:h-10 right-11 absolute bottom-2"
        />
      </div>

      <div className="flex items-center bg-white text-gray-500 rounded-lg px-2 sm:px-3 py-2">
        <input
          className="flex-1 text-gray-500 placeholder-gray-500 text-xs sm:text-sm focus:outline-none"
          placeholder="Ask anything..."
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <button
          className="ml-1 sm:ml-2 bg-black rounded-md p-2 w-9 h-9 sm:w-10 sm:h-10 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isSending}
        >
          <span className="font-bold text-lg text-white">
            {isSending ? '...' : '↑'}
          </span>
        </button>
      </div>
    </div>
  );
}

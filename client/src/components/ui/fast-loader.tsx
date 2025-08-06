import { Loader2, MessageSquare } from "lucide-react";

export default function FastLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="relative">
            <MessageSquare className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            <Loader2 className="w-6 h-6 text-blue-400 dark:text-blue-300 animate-spin absolute -bottom-1 -right-1" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Loading Chatbot
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Setting up your intelligent assistant...
          </p>
        </div>

        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
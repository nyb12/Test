import SimpleChatbot from './simple-chatbot-clean';

export default function InstantChatbot({ selectedAircraft, onAircraftSelect }: { 
  selectedAircraft?: any; 
  onAircraftSelect?: (aircraft: any) => void; 
} = {}) {
  return <SimpleChatbot selectedAircraft={selectedAircraft} onAircraftSelect={onAircraftSelect} />;
}
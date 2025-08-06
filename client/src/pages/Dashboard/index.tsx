import React, { useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import AISection from './AISection';
import ChatWindow from './ChatWindow';
import AllThreads from './AllThreads';
import { useDashboardState } from './useDashboardState';
import Toolbox from './Toolbox';
import DocumentsTab from './DocumentsTab';
import Observation from './Observation';
import ActivityDrawer from './ActivityDrawer';
import MultimediaInput from '@/components/MultimediaInput';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

export default function Dashboard({
  selectedAircraft,
  onAircraftSelect,
}: {
  selectedAircraft?: any;
  onAircraftSelect?: (aircraft: any) => void;
}) {
  const state = useDashboardState();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.id && state.setCurrentUserId) {
      state.setCurrentUserId(user.id);
    }
  }, [user, state]);

  // Fetch contacts once here
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    isError: contactsError,
  } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
  });

  // MultimediaInput modal state
  const [isMultimediaOpen, setIsMultimediaOpen] = React.useState(false);
  const [multimediaMode, setMultimediaMode] = React.useState<
    'photo' | 'video' | 'audio' | null
  >(null);

  // Handler to open modal with mode
  const openMultimediaInput = (mode: 'photo' | 'video' | 'audio') => {
    setMultimediaMode(mode);
    setIsMultimediaOpen(true);
  };

  // Handler for when content is generated
  const handleContentGenerated = (content: string) => {
    // TODO: handle the generated content (e.g., add to chat, show notification, etc.)
    setIsMultimediaOpen(false);
    setMultimediaMode(null);
  };

  // Handler for closing modal
  const handleMultimediaClose = () => {
    setIsMultimediaOpen(false);
    setMultimediaMode(null);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-[#E6EBF9] to-white p-4 sm:p-8 font-sans">
      <div className="flex sm:hidden flex-row items-center justify-between w-full mb-4">
        <span className="text-xs sm:text-sm font-semibold text-black">
          Make Observation
        </span>
      </div>
      <div className="hidden sm:flex flex-row w-[90%] mb-4 justify-between items-center">
        <span className="text-xs sm:text-sm font-semibold text-black hover-gray cursor-pointer pl-20">
          Messaging
        </span>
        <div className="flex flex-row gap-12 ">
          <button
            className="text-xs sm:text-sm font-semibold text-black hover-gray cursor-pointer"
            onClick={() => state.setIsActivityDrawerOpen(true)}
          >
            View Activity
          </button>
        </div>
      </div>
      <Observation {...state} openMultimediaInput={openMultimediaInput} />
      <div className="flex flex-col lg:flex-row gap-4 max-w-full lg:max-w-7xl w-full mb-4">
        <div className="flex flex-col md:flex-row bg-gray-200 p-2 rounded-2xl gap-[1px] w-full lg:flex-1 min-w-0">
          <ChatSidebar
            {...state}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={onAircraftSelect ?? (() => {})}
          />
          <ChatWindow
            {...state}
            contacts={contacts}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={onAircraftSelect ?? (() => {})}
          />
        </div>
        <div className="hidden lg:block lg:w-[350px] xl:w-[400px]">
          <AllThreads />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-full lg:max-w-7xl w-full">
        {/* <Toolbox /> */}
        {/* <DocumentsTab /> */}
        <div className="lg:col-span-1">
          <Observation
            {...state}
            desktopOnly
            openMultimediaInput={openMultimediaInput}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <AISection />
        </div>
      </div>
      {state.isActivityDrawerOpen && <ActivityDrawer {...state} />}
      <MultimediaInput
        isOpen={isMultimediaOpen}
        onClose={handleMultimediaClose}
        onContentGenerated={handleContentGenerated}
        initialMode={multimediaMode ?? undefined}
      />
    </div>
  );
}

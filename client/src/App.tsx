import React from 'react';

import { useState, lazy, Suspense } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, History, MessageSquare, User, Loader2 } from 'lucide-react';
import SimpleNavigationDrawer from '@/components/layout/SimpleNavigationDrawer';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatbotHeader from '@/components/layout/ChatbotHeader';
import SimpleChatbotHeader from '@/components/layout/SimpleChatbotHeader';

// Lazy load page components for better performance
const HomeLazy = lazy(() => import('@/pages/Home'));
const NotFoundLazy = lazy(() => import('@/pages/not-found'));
const UsersLazy = lazy(() => import('@/pages/Users'));
const PrismaUsersLazy = lazy(() => import('@/pages/PrismaUsers'));
const AuthPageLazy = lazy(() => import('@/pages/auth-page'));
const AuthVerifyPageLazy = lazy(() => import('@/pages/auth-verify'));
const ProfilePageLazy = lazy(() => import('@/pages/profile-page'));
const SimpleProfileLazy = lazy(() => import('@/pages/simple-profile'));
const OnboardingPageLazy = lazy(() => import('@/pages/onboarding-page'));
const SubscriptionPageLazy = lazy(() => import('@/pages/subscription-page'));
const InstantChatbotLazy = lazy(() => import('@/pages/instant-chatbot'));
const DashboardLazy = lazy(() => import('@/pages/Dashboard/index'));
const ChatsLazy = lazy(() => import('@/pages/Chats/index'));
const FleetspanLazy = lazy(() => import('@/pages/Fleetspan/index'));
const TroubleShootLazy = lazy(() => import('@/pages/TroubleShoot/index'));
const ObservationsLazy = lazy(() => import('@/pages/Observations/index'));
const DocsLazy = lazy(() => import('@/pages/Docs/index'));
const ContactsLazy = lazy(() => import('@/pages/Contacts/index'));
// Wrapper components to handle lazy loading properly
const Home = () => <HomeLazy />;
const NotFound = () => <NotFoundLazy />;
const Users = () => <UsersLazy />;
const PrismaUsers = () => <PrismaUsersLazy />;
const AuthPage = () => <AuthPageLazy />;
const AuthVerifyPage = () => <AuthVerifyPageLazy />;
const ProfilePage = () => <ProfilePageLazy />;
const SimpleProfile = () => <SimpleProfileLazy />;
const OnboardingPage = () => <OnboardingPageLazy />;
const SubscriptionPage = () => <SubscriptionPageLazy />;
const InstantChatbot = (props: any) => <InstantChatbotLazy {...props} />;
const Dashboard = (props: any) => <DashboardLazy {...props} />;
const Chats = () => <ChatsLazy />;
const Fleetspan = (props: any) => <FleetspanLazy {...props} />;
const TroubleShoot = (props: any) => <TroubleShootLazy {...props} />;
const Observations = (props: any) => <ObservationsLazy {...props} />;
const Docs = (props: any) => <DocsLazy {...props} />;
const Contacts = (props: any) => <ContactsLazy {...props} />;
import { ProtectedRoute, AuthRoute } from './lib/protected-route';
import { AuthProvider } from '@/hooks/use-auth';
import { useAuth } from '@/hooks/use-auth';
import PlatformHealthBanner from '@/components/PlatformHealthBanner';
import ErrorBoundary from './components/ErrorBoundary';

// Prefetch critical routes on app load
const prefetchRoutes = () => {
  // Prefetch authentication and main app routes
  import('@/pages/auth-page');
  import('@/pages/simple-profile');
  import('@/pages/instant-chatbot');
};

// Loading component for lazy routes
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Navigation Drawer Component
function NavigationDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 bg-white h-full shadow-xl flex flex-col">
        {/* Drawer Header with Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="relative flex-1 mr-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Chat History Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Real chat sessions from your conversation history */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Your recent conversations will appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Section - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Your Profile</p>
              <p className="text-xs text-gray-600">Manage account settings</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router({
  selectedAircraft,
  setSelectedAircraft,
  chatKey,
}: {
  selectedAircraft: any;
  setSelectedAircraft: (aircraft: any) => void;
  chatKey: number;
}) {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">{() => <Home />}</Route>
      <Route path="/aviOS">
        {() => (
          <InstantChatbot
            key={chatKey}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={setSelectedAircraft}
          />
        )}
      </Route>

      {/* Protected routes */}
      <ProtectedRoute path="/profile" component={() => <SimpleProfile />} />
      <ProtectedRoute
        path="/profile-advanced"
        component={() => <ProfilePage />}
      />
      <ProtectedRoute path="/users" component={() => <Users />} />
      <ProtectedRoute path="/prisma-users" component={() => <PrismaUsers />} />
      <AuthRoute path="/auth" component={() => <AuthPage />} />
      <AuthRoute path="/auth/verify" component={() => <AuthVerifyPage />} />
      <AuthRoute
        path="/onboarding"
        component={() => <OnboardingPage />}
        redirectTo="/aviOS"
      />
      <ProtectedRoute
        path="/subscription"
        component={() => <SubscriptionPage />}
      />
      <ProtectedRoute
        path="/dashboard"
        component={() => (
          <Dashboard
            key={chatKey}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={setSelectedAircraft}
          />
        )}
      />
      <ProtectedRoute path="/chats" component={() => <Chats />} />
      <ProtectedRoute
        path="/fleetspan"
        component={() => (
          <Fleetspan
            key={chatKey}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={setSelectedAircraft}
          />
        )}
      />
      <ProtectedRoute
        path="/chat-with-ai"
        component={() => (
          <TroubleShoot
            key={chatKey}
            selectedAircraft={selectedAircraft}
            onAircraftSelect={setSelectedAircraft}
          />
        )}
      />
      <ProtectedRoute path="/observation" component={() => <Observations />} />
      <ProtectedRoute path="/documentation" component={() => <Docs />} />
      <ProtectedRoute path="/contacts" component={() => <Contacts />} />
      {/* Fallback to 404 */}
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

// AuthGate blocks rendering until auth is loaded
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<any>(null);
  const [chatKey, setChatKey] = useState(0); // Key to force chatbot refresh
  const [activeChatWindows, setActiveChatWindows] = useState<any[]>([]);
  const [location] = useLocation();

  // Prefetch critical routes on app initialization
  useState(() => {
    // Start prefetching after a short delay to not block initial render
    setTimeout(prefetchRoutes, 100);
  });

  const handleNewChat = () => {
    setSelectedAircraft(null); // Clear aircraft selection
    setChatKey((prev) => prev + 1); // Force chatbot to remount with fresh state
  };

  // Handle notification messages - open chat windows for chat messages
  const handleChatMessage = (message: any) => {
    // Find contacts related to this message
    const senderId = message.senderId;
    const senderName = message.senderName;

    // Create a contact object from the notification
    const notificationContact = {
      id: senderId,
      contactId: senderId,
      name: senderName,
      email: `${senderId}@system.local`, // Fallback email
      phone: null,
    };

    // Check if there's already a chat window open for this contact
    const existingWindowIndex = activeChatWindows.findIndex((window) =>
      window.contacts.some((contact: any) => contact.contactId === senderId),
    );

    if (existingWindowIndex !== -1) {
      // Append message to existing chat window
      setActiveChatWindows((prev) => {
        const updated = [...prev];
        updated[existingWindowIndex] = {
          ...updated[existingWindowIndex],
          messages: [
            ...updated[existingWindowIndex].messages,
            {
              text: message.content,
              isUser: false,
              timestamp: new Date(message.sentAt),
              senderId: message.senderId,
              senderName: message.senderName,
            },
          ],
        };
        return updated;
      });
    } else {
      // Create new chat window
      const newChatWindow = {
        id: `chat_${Date.now()}`,
        contacts: [notificationContact],
        messages: [
          {
            text: message.content,
            isUser: false,
            timestamp: new Date(message.sentAt),
            senderId: message.senderId,
            senderName: message.senderName,
          },
        ],
      };
      setActiveChatWindows((prev) => [...prev, newChatWindow]);
    }
  };

  const isAviOSRoute = location === '/aviOS';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <TooltipProvider>
            <PlatformHealthBanner />
            <div className={'h-screen relative'}>
              {/* {isAviOSRoute ? (
                <SimpleChatbotHeader
                  onNavigationToggle={() => setIsDrawerOpen(true)}
                  selectedAircraft={selectedAircraft}
                  onAircraftSelect={setSelectedAircraft}
                  onNewChat={handleNewChat}
                />
              ) : ( */}
              <SimpleChatbotHeader
                onNavigationToggle={() => setIsDrawerOpen(true)}
                selectedAircraft={selectedAircraft}
                onAircraftSelect={setSelectedAircraft}
                onNewChat={handleNewChat}
              />
              <div
                className={'flex-1 overflow-y-auto pb-16 lg:pb-0 h-[inherit]'}
              >
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Router
                      selectedAircraft={selectedAircraft}
                      setSelectedAircraft={setSelectedAircraft}
                      chatKey={chatKey}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
              {/* {!isAviOSRoute && <Footer />} */}

              {/* Navigation Drawer for aviOS */}
              {isAviOSRoute && isDrawerOpen && (
                <SimpleNavigationDrawer
                  isOpen={isDrawerOpen}
                  onClose={() => setIsDrawerOpen(false)}
                />
              )}
            </div>

            <Toaster />
          </TooltipProvider>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

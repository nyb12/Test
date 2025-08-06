import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Clock, MessageSquare, Wrench, Plane, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface ConversationSummary {
  id: number;
  userId: string;
  summary: string;
  conversationThreadId: string | null;
  messageCount: number;
  toolContext: string | null;
  selectedAircraft: string | null;
  createdAt: string;
}

export default function SummariesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summariesData, isLoading, error } = useQuery({
    queryKey: ["/api/summaries", user?.id, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', user.id);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
      const response = await fetch(`/api/summaries?${params}`);
      if (!response.ok) throw new Error('Failed to fetch summaries');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const summaries = summariesData?.summaries || [];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view your conversation summaries.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversation Summaries</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="w-full">
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Summaries</h2>
          <p className="text-gray-600">Unable to load your conversation summaries. Please try again later.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseAircraft = (aircraftString: string | null) => {
    if (!aircraftString) return null;
    try {
      return JSON.parse(aircraftString);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conversation Summaries</h1>
          <p className="text-gray-600 mb-4">
            Your saved conversation summaries with timestamps and context information.
          </p>
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>

        {summaries.length === 0 ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No summaries yet</h3>
              <p className="text-gray-600 text-center">
                Start a conversation and it will be automatically summarized and stored here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary: ConversationSummary) => {
              const aircraft = parseAircraft(summary.selectedAircraft);
              return (
                <Card key={summary.id} className="w-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-medium text-gray-900 leading-tight">
                          {summary.summary}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {aircraft && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            {aircraft.tail_number} ({aircraft.model})
                          </Badge>
                        )}
                        {summary.toolContext && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {summary.toolContext}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(summary.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {summary.messageCount} message{summary.messageCount !== 1 ? 's' : ''}
                      </div>
                      {summary.conversationThreadId && (
                        <div className="text-xs">
                          Thread: {summary.conversationThreadId.split('_')[1]}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X, Wifi, WifiOff } from 'lucide-react';

interface HealthStatus {
  isHealthy: boolean;
  lastCheck: string;
  consecutiveFailures: number;
  lastError?: string;
}

export default function PlatformHealthBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Health status polling disabled to reduce unnecessary API calls
  const { data: healthStatus } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: false, // Disabled
    refetchIntervalInBackground: false,
    staleTime: Infinity,
    enabled: false // Disabled completely
  });

  useEffect(() => {
    if (healthStatus) {
      const shouldShow = !healthStatus.isHealthy && !isDismissed;
      setIsVisible(shouldShow);
      
      // If platform comes back online, reset dismissed state
      if (healthStatus.isHealthy && isDismissed) {
        setIsDismissed(false);
      }
    }
  }, [healthStatus, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || !healthStatus) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <WifiOff className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Platform connectivity issues detected</span>
            </div>
            <p className="text-sm text-red-100 mt-1">
              Some features may be temporarily unavailable. 
              {healthStatus.consecutiveFailures > 0 && (
                <span className="ml-1">
                  ({healthStatus.consecutiveFailures} consecutive failures)
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right text-sm">
            <div className="text-red-100">
              Last check: {new Date(healthStatus.lastCheck).toLocaleTimeString()}
            </div>
            {healthStatus.lastError && (
              <div className="text-xs text-red-200 mt-1 max-w-xs truncate">
                {healthStatus.lastError}
              </div>
            )}
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-red-700 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Health indicator component for status bar
export function HealthIndicator() {
  const { data: healthStatus } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    staleTime: 0
  });

  if (!healthStatus) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 text-xs">
      {healthStatus.isHealthy ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-red-600">Issues</span>
        </>
      )}
    </div>
  );
}
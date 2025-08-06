import { usePageTransition } from "@/hooks/use-page-transition";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Hero() {
  const { triggerTransition } = usePageTransition();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Prefetch critical data for authenticated users
  useEffect(() => {
    if (user) {
      // Prefetch aircraft data for aviOS
      queryClient.prefetchQuery({
        queryKey: ["/api/aircraft"],
        staleTime: 15 * 60 * 1000, // 15 minutes for aircraft data
      });
    } else {
      // Prefetch roles for onboarding
      queryClient.prefetchQuery({
        queryKey: ["/api/roles"],
        staleTime: 10 * 60 * 1000,
      });
    }
  }, [user, queryClient]);
  
  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Navigate immediately for maximum performance
    if (user) {
      // User is authenticated - go to aviOS
      setLocation('/aviOS');
    } else {
      // User not authenticated - go to onboarding
      setLocation('/onboarding');
    }
  };
  
  return (
    <section className="text-center mb-16">
      <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
        From flightline to flight deck — one intelligence platform
      </p>
      
      <button
        onClick={handleButtonClick}
        className="inline-block bg-primary text-white font-medium py-3 px-8 rounded-md shadow-sm transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-md"
      >
        {user ? 'Use Ironfleet' : 'Get Started'}
      </button>
    </section>
  );
}

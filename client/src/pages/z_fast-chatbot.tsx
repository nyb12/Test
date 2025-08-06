import { useState, useEffect, Suspense, lazy } from "react";
import FastLoader from "@/components/ui/fast-loader";

// Lazy load the full chatbot component
const SimpleChatbot = lazy(() => import("./simple-chatbot-clean"));

export default function FastChatbot() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Show loader for minimum 1 second to ensure smooth transition
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showLoader) {
    return <FastLoader />;
  }

  return (
    <Suspense fallback={<FastLoader />}>
      <SimpleChatbot />
    </Suspense>
  );
}
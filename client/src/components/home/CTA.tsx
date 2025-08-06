import { Link } from "wouter";
import { usePageTransition } from "@/hooks/use-page-transition";

export default function CTA() {
  const { triggerTransition } = usePageTransition();
  
  return (
    <section className="text-center">
      <h2 className="text-2xl font-semibold mb-6">Ready to Get Started?</h2>
      <div className="flex justify-center space-x-4">
        <Link 
          href="/download"
          onClick={(e) => {
            e.preventDefault();
            triggerTransition();
          }}
          className="bg-primary text-white font-medium py-3 px-8 rounded-md shadow-sm transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-md"
        >
          Download
        </Link>
        <Link 
          href="/learn-more"
          onClick={(e) => {
            e.preventDefault();
            triggerTransition();
          }}
          className="bg-white text-primary font-medium py-3 px-8 rounded-md border border-primary transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-md"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}

import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import About from "@/components/home/About";
import CTA from "@/components/home/CTA";

export default function Home() {
  return (
    <main className="flex-grow py-16 px-6 animate-in fade-in duration-500">
      <div className="container mx-auto max-w-4xl">
        <Hero />
        <Features />
        <About />
        <CTA />
      </div>
    </main>
  );
}

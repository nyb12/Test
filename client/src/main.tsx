import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add fade-in animation to the body when page loads
document.body.classList.add("opacity-0");

createRoot(document.getElementById("root")!).render(<App />);

// Trigger fade-in animation after render
setTimeout(() => {
  document.body.classList.remove("opacity-0");
  document.body.classList.add("transition-opacity", "duration-500", "opacity-100");
}, 100);

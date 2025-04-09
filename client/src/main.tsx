import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add meta tags for theming
document.querySelector('head')?.insertAdjacentHTML('beforeend', `
  <title>FreelanceMatch AI - Find Your Perfect Freelancer</title>
  <meta name="description" content="AI-powered freelancer matchmaking service connecting clients with freelancers" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
`);

createRoot(document.getElementById("root")!).render(<App />);

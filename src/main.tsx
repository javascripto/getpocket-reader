import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root") as HTMLElement | null;
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

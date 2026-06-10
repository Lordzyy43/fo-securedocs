import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css"; // <-- Pindahkan/tambahkan ini di atas index.css
import "./index.css"; // <-- Tailwind harus berada di paling bawah
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

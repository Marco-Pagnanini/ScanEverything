import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";
import { buildTheme } from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider theme={buildTheme()} wave={{ disabled: true }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);

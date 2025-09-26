import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

const GREEN = {
  primary: "#16a34a",
  primaryDark: "#166534",
  primaryLight: "#22c55e",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: GREEN.primary,
          colorLink: GREEN.primary,
          borderRadius: 12,
          fontSize: 14,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
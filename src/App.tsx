import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SelectedConversationProvider } from "@/contexts/SelectedConversationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthPage from "./components/Auth/SignUpPage";
import LoginPage from "./components/Auth/LoginPage";
import Dashboard from "./components/Dashboard";
import "./App.css";

const router = createBrowserRouter([
  {
    path: "/signup",
    element: <AuthPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <AuthProvider>
          <SelectedConversationProvider>
            <RouterProvider router={router} />
          </SelectedConversationProvider>
        </AuthProvider>
      </div>
    </QueryClientProvider>
  );
}

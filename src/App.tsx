import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react"; // Add this import
import { AuthProvider } from "./contexts/AuthContext";
import { SelectedConversationProvider } from "@/contexts/SelectedConversationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";

const SignupPage = lazy(() => import("./components/auth/SignUpPage"));
const LoginPage = lazy(() => import("./components/auth/LoginPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary">
        <img
          src="/logo-large.png"
          alt="astra logo"
          className="h-8 w-8 rounded-full object-contain shadow-lg"
        />
      </div>
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/signup",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <SignupPage />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Dashboard />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Dashboard />
      </Suspense>
    ),
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

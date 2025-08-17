import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
// import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./components/Auth/AuthPage";
import Dashboard from "./components/Dashboard";
// import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
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

function App() {
  return (
    <div className="App">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;

import { Navigate } from "react-router-dom";
import AuthCallback from "./components/AuthCallback/AuthCallback.jsx";
import Calendar from "./components/Calendar/Calendar.jsx";
import CourseList from "./components/CourseList/CourseList.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import Layout from "./components/Layout/Layout.jsx";
import Login from "./components/Login/Login.jsx";
import NotFound from "./components/NotFound/NotFound.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import TaskDetails from "./components/TaskDetails/TaskDetails.jsx";

export const routes = [
  { path: "/login", element: <Login /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/tasks" replace /> },
          { path: "tasks", element: <Dashboard /> },
          { path: "tasks/:taskId", element: <TaskDetails /> },
          { path: "calendar", element: <Calendar /> },
          { path: "courses", element: <CourseList /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
];

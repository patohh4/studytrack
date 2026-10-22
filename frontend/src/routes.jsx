import { Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout.jsx";
import Login from "./components/Login/Login.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import TaskDetails from "./components/TaskDetails/TaskDetails.jsx";
import Calendar from "./components/Calendar/Calendar.jsx";
import CourseList from "./components/CourseList/CourseList.jsx";
import NotFound from "./components/NotFound/NotFound.jsx";

export const routes = [
  { path: "/login", element: <Login /> },
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
  { path: "*", element: <NotFound /> },
];

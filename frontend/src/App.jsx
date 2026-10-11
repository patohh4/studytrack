import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout.jsx";
import Login from "./components/Login/Login.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import Calendar from "./components/Calendar/Calendar.jsx";
import CourseList from "./components/CourseList/CourseList.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/tasks" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/courses" element={<CourseList />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

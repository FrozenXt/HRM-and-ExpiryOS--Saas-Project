import { Routes, Route, Navigate } from "react-router-dom";
import Plans from "./pages/Plans";

// import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Companies from "./pages/Companies";
import DocumentTypes from "./pages/DocumentTypes";
import Designations from "./pages/Designations";
import Departments from "./pages/Departments";
import Employees from "./pages/Employees";

function App() {
  return (
    // <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/document-types" element={<DocumentTypes />} />
        <Route path="/designations" element={<Designations />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/employees" element={<Employees />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    // </BrowserRouter>
  );
}

export default App;

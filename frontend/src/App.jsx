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
import Attendance from "./pages/Attendance";
import CompanyDetails from "./pages/CompanyDetails";
import LeaveTypes from "./pages/LeaveTypes";
import LeaveRequests from "./pages/LeaveRequests";
import LeaveBalances from "./pages/LeaveBalances";
import CompanyDocuments from "./pages/CompanyDocuments";
import Settings from "./pages/Settings";
import Currencies from "./pages/Currencies";
import SalaryStructures from "./pages/Salaries";
import Payroll from "./pages/Payroll";
import StatutoryRules from "./pages/StatutoryRules";
import JobPostings from "./pages/JobPostings";
import Holidays from "./pages/Holidays";
import TimeLogs from "./pages/TimeLogs";
import EmployeeDetail from "./pages/EmployeeDetail";
import CompanyOverview from "./pages/CompanyOverview";
import Documents from "./pages/Documents";
import Events from "./pages/Events";
import Announcements from "./pages/Announcements";
import StatutoryDetails from "./pages/StatutoryDetails";
import Assets from "./pages/Assets";
import AssetAssignments from "./pages/AssetAssignments";
import GeofenceZones from "./pages/GeofenceZones";
import DeviceSessions from "./pages/DeviceSessions";
import Monitoring from "./pages/Monitoring";
import OnboardingTasks from "./pages/OnboardingTasks";
import MonitoringPolicy from "./pages/MonitoringPolicy";
import RegularizationRequests from "./pages/RegularizationRequests";
import Profile from "./pages/Profile";
import PerformanceReviews from "./pages/PerformanceReviews";
import Shifts from "./pages/Shifts";
import Subscriptions from "./pages/Subscriptions";
import MySubscription from "./pages/MySubscription";
import AdvanceSalaries from "./pages/AdvanceSalaries";
import Resignations from "./pages/Resignations";

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
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/companies/:id" element={<CompanyDetails />} />
        <Route path="/leave-types" element={<LeaveTypes />} />
        <Route path="/leave-requests" element={<LeaveRequests />} />
        <Route path="/leave-balances" element={<LeaveBalances />} />
        <Route path="/company-documents" element={<CompanyDocuments />} />
        <Route path="/system-settings" element={<Settings />} />
        <Route path="/currencies" element={<Currencies />} />
        <Route path="/salary-structures" element={<SalaryStructures />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/statutory-rules" element={<StatutoryRules />} />
        <Route path="/job-postings" element={<JobPostings />} />
        <Route path="/holidays" element={<Holidays />} />
        <Route path="/time-logs" element={<TimeLogs />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/company" element={<CompanyOverview />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/events" element={<Events />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/statutory-details" element={<StatutoryDetails />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/asset-assignments" element={<AssetAssignments />} />
        <Route path="/geofence-zones" element={<GeofenceZones />} />
        <Route path="/device-sessions" element={<DeviceSessions />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/onboarding-tasks" element={<OnboardingTasks />} />
        <Route path="/monitoring-policy" element={<MonitoringPolicy />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/performance-reviews" element={<PerformanceReviews />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/advance-salaries" element={<AdvanceSalaries />} />
        <Route path="/resignations" element={<Resignations />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        {/* Company Admin — their own company's plan/usage/upgrade */}
        <Route path="/my-subscription" element={<MySubscription />} />
        <Route
          path="/regularization-requests"
          element={<RegularizationRequests />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    // </BrowserRouter>
  );
}

export default App;

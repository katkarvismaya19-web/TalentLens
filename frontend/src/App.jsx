import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { PageLoader } from "./components/ui";
import { homeFor, useAuth } from "./lib/auth";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Careers from "./pages/candidate/Careers";
import JobView from "./pages/candidate/JobView";
import MyApplications from "./pages/candidate/MyApplications";
import Activity from "./pages/hr/Activity";
import Dashboard from "./pages/hr/Dashboard";
import HrLogin from "./pages/hr/HrLogin";
import HrSignup from "./pages/hr/HrSignup";
import Interviews from "./pages/hr/Interviews";
import JobDetail from "./pages/hr/JobDetail";
import Jobs from "./pages/hr/Jobs";
import Pipeline from "./pages/hr/Pipeline";
import Retention from "./pages/hr/Retention";
import Team from "./pages/hr/Team";

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) {
    const portal = role === "hr" ? "/hr/login" : "/login";
    return <Navigate to={`${portal}?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to={homeFor(user)} replace /> : children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? homeFor(user) : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/hr" element={<Navigate to="/hr/login" replace />} />
      <Route path="/hr/login" element={<GuestOnly><HrLogin /></GuestOnly>} />
      <Route path="/hr/signup" element={<GuestOnly><HrSignup /></GuestOnly>} />

      <Route element={<RequireAuth role="hr"><Layout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/interviews" element={<Interviews />} />
        <Route path="/retention" element={<Retention />} />
        <Route path="/team" element={<Team />} />
        <Route path="/activity" element={<Activity />} />
      </Route>

      <Route element={<RequireAuth role="candidate"><Layout /></RequireAuth>}>
        <Route path="/careers" element={<Careers />} />
        <Route path="/careers/:id" element={<JobView />} />
        <Route path="/my-applications" element={<MyApplications />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}

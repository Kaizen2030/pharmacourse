import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Courses from "./pages/Courses"
import CourseDetail from "./pages/CourseDetail"
import CoursePlayer from "./pages/CoursePlayer"
import Dashboard from "./pages/Dashboard"
import Certificate from "./pages/Certificate"
import CaseSimulation from "./pages/CaseSimulation"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CourseForm from "./pages/admin/CourseForm"
import SimulationAdmin from "./pages/admin/SimulationAdmin"

import PharmacyOS from "./pages/Pharmacyos"
import RemedacareOS from "./pages/Remedacareos"
import Community from "./pages/Community"
import ResetRedirect from "./pages/ResetRedirect"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/learn/:courseId/:lessonId" element={<CoursePlayer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/certificate/:courseId" element={<Certificate />} />
          <Route path="/simulation/:simulationId" element={<CaseSimulation />} />
          <Route path="/pharmacyos" element={<PharmacyOS />} />
          <Route path="/remedacareos" element={<RemedacareOS />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses/new" element={<CourseForm />} />
          <Route path="/admin/courses/:id/edit" element={<CourseForm />} />
          <Route path="/admin/simulations" element={<SimulationAdmin />} />

          {/* Deep link redirect routes for Electron apps */}
          <Route path="/reset/remedacare" element={<ResetRedirect app="remedacare" />} />
          <Route path="/reset/pharmacyos" element={<ResetRedirect app="pharmacyos" />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}

import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import WebsiteAnalyticsTracker from "./components/WebsiteAnalyticsTracker"
import Footer from "./components/Footer"
import Navbar from "./components/Navbar"
import PatientLayout from "./components/PatientLayout"
import Blog from "./pages/Blog"
import BlogPost from "./pages/BlogPost"
import CaseSimulation from "./pages/CaseSimulation"
import Certificate from "./pages/Certificate"
import Community from "./pages/Community"
import CompleteProfile from "./pages/CompleteProfile"
import CourseDetail from "./pages/CourseDetail"
import CoursePlayer from "./pages/CoursePlayer"
import Courses from "./pages/Courses"
import Dashboard from "./pages/Dashboard"
import DesktopAccountActivate from "./pages/DesktopAccountActivate"
import ForgotPassword from "./pages/ForgotPassword"
import Home from "./pages/Home"
import Login from "./pages/Login"
import PatientAppointment from "./pages/patient/PatientAppointment"
import PatientForgotPassword from "./pages/patient/PatientForgotPassword"
import PatientHome from "./pages/patient/PatientHome"
import PatientLogin from "./pages/patient/PatientLogin"
import PatientPrescription from "./pages/patient/PatientPrescription"
import PatientRegister from "./pages/patient/PatientRegister"
import PatientResetPassword from "./pages/patient/PatientResetPassword"
import PatientTrack from "./pages/patient/PatientTrack"
import PatientPortal from "./pages/PatientPortal"
import PatientInstallPrompt from "./components/PatientInstallPrompt"
import PatientPortalFlyer from "./pages/PatientPortalFlyer"
import PharmacyOS from "./pages/Pharmacyos"
import Register from "./pages/Register"
import RemedacareOS from "./pages/Remedacareos"
import ResetPassword from "./pages/ResetPassword"
import ResetRedirect from "./pages/ResetRedirect"
import TeamPlans from "./pages/TeamPlans"
import VerifyCertificate from "./pages/VerifyCertificate"
import Workshops from "./pages/Workshops"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CourseForm from "./pages/admin/CourseForm"
import SimulationAdmin from "./pages/admin/SimulationAdmin"

function MediaProtection() {
  useEffect(() => {
    const protectedMediaSelector = "img, picture, figure, video, canvas, svg"

    function isProtectedMediaTarget(target) {
      return target instanceof Element && !!target.closest(protectedMediaSelector)
    }

    function applyDragProtection(root = document) {
      root.querySelectorAll("img, video, canvas, svg").forEach((node) => {
        node.setAttribute("draggable", "false")
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches("img, video, canvas, svg")) {
            node.setAttribute("draggable", "false")
          }
          applyDragProtection(node)
        })
      })
    })

    function handleContextMenu(event) {
      if (isProtectedMediaTarget(event.target)) event.preventDefault()
    }

    function handleDragStart(event) {
      if (isProtectedMediaTarget(event.target)) event.preventDefault()
    }

    function handleSelectStart(event) {
      if (isProtectedMediaTarget(event.target)) event.preventDefault()
    }

    applyDragProtection()
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener("contextmenu", handleContextMenu, true)
    document.addEventListener("dragstart", handleDragStart, true)
    document.addEventListener("selectstart", handleSelectStart, true)

    return () => {
      observer.disconnect()
      document.removeEventListener("contextmenu", handleContextMenu, true)
      document.removeEventListener("dragstart", handleDragStart, true)
      document.removeEventListener("selectstart", handleSelectStart, true)
    }
  }, [])

  return null
}

function AppShell() {
  const location = useLocation()
  const isPatientRoute = location.pathname.startsWith("/patient") || location.pathname === "/patient-portal"
  const isFlyerRoute = location.pathname === "/patient-flyer"
  const isActivationRoute = location.pathname.startsWith("/activate/")

  return (
    <>
      <MediaProtection />
      <WebsiteAnalyticsTracker />
      {isPatientRoute ? <PatientInstallPrompt /> : null}
      {!isPatientRoute && !isFlyerRoute && !isActivationRoute ? <Navbar /> : null}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/workshops" element={<Workshops />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/team-plans" element={<TeamPlans />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/learn/:courseId/:lessonId" element={<CoursePlayer />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/certificate/:courseId" element={<Certificate />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
        <Route path="/simulation/:simulationId" element={<CaseSimulation />} />
        <Route path="/pharmacyos" element={<PharmacyOS />} />
        <Route path="/remedacarepos" element={<PharmacyOS />} />
        <Route path="/remedacarehms" element={<RemedacareOS />} />
        <Route path="/remedacareos" element={<RemedacareOS />} />
        <Route path="/remedacarehmis" element={<RemedacareOS />} />
        <Route path="/community" element={<Community />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses/new" element={<CourseForm />} />
        <Route path="/admin/courses/:id/edit" element={<CourseForm />} />
        <Route path="/admin/simulations" element={<SimulationAdmin />} />

        <Route path="/patient-portal" element={<PatientPortal />} />
        <Route path="/patient-flyer" element={<PatientPortalFlyer />} />
        <Route path="/activate/remedacarepos" element={<DesktopAccountActivate app="remedacarepos" />} />
        <Route path="/activate/pharmacyos" element={<DesktopAccountActivate app="remedacarepos" />} />
        <Route path="/activate/remedacarehmis" element={<DesktopAccountActivate app="remedacarehmis" />} />
        <Route path="/activate/remedacarehms" element={<DesktopAccountActivate app="remedacarehmis" />} />
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/forgot-password" element={<PatientForgotPassword />} />
        <Route path="/patient/reset-password" element={<PatientResetPassword />} />
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientHome />} />
          <Route path="register" element={<PatientRegister />} />
          <Route path="prescription" element={<PatientPrescription />} />
          <Route path="appointment" element={<PatientAppointment />} />
          <Route path="track" element={<PatientTrack />} />
        </Route>

        <Route path="/reset/remedacarehms" element={<ResetRedirect app="remedacarehms" />} />
        <Route path="/reset/remedacarepos" element={<ResetRedirect app="remedacarepos" />} />
        <Route path="/reset/remedacare" element={<ResetRedirect app="remedacarehms" />} />
        <Route path="/reset/remedacarehmis" element={<ResetRedirect app="remedacarehms" />} />
        <Route path="/reset/pharmacyos" element={<ResetRedirect app="remedacarepos" />} />
      </Routes>
      {!isPatientRoute && !isFlyerRoute && !isActivationRoute ? <Footer /> : null}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}

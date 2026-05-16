import { useEffect } from "react"
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import CompleteProfile from "./pages/CompleteProfile"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Courses from "./pages/Courses"
import Workshops from "./pages/Workshops"
import Blog from "./pages/Blog"
import BlogPost from "./pages/BlogPost"
import TeamPlans from "./pages/TeamPlans"
import CourseDetail from "./pages/CourseDetail"
import CoursePlayer from "./pages/CoursePlayer"
import Dashboard from "./pages/Dashboard"
import Certificate from "./pages/Certificate"
import VerifyCertificate from "./pages/VerifyCertificate"
import CaseSimulation from "./pages/CaseSimulation"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CourseForm from "./pages/admin/CourseForm"
import SimulationAdmin from "./pages/admin/SimulationAdmin"

import PharmacyOS from "./pages/Pharmacyos"
import RemedacareOS from "./pages/Remedacareos"
import Community from "./pages/Community"
import ResetRedirect from "./pages/ResetRedirect"
import PatientPortal from "./pages/PatientPortal"

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
      if (isProtectedMediaTarget(event.target)) {
        event.preventDefault()
      }
    }

    function handleDragStart(event) {
      if (isProtectedMediaTarget(event.target)) {
        event.preventDefault()
      }
    }

    function handleSelectStart(event) {
      if (isProtectedMediaTarget(event.target)) {
        event.preventDefault()
      }
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MediaProtection />
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}

function AppShell() {
  const location = useLocation()
  const hideChrome = location.pathname === "/patient" || location.pathname === "/patient-portal"

  return (
    <>
      {!hideChrome && <Navbar />}
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
        <Route path="/remedacareos" element={<RemedacareOS />} />
        <Route path="/community" element={<Community />} />
        <Route path="/patient" element={<PatientPortal />} />
        <Route path="/patient-portal" element={<PatientPortal />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses/new" element={<CourseForm />} />
        <Route path="/admin/courses/:id/edit" element={<CourseForm />} />
        <Route path="/admin/simulations" element={<SimulationAdmin />} />

        {/* Deep link redirect routes for Electron apps */}
        <Route path="/reset/remedacare" element={<ResetRedirect app="remedacare" />} />
        <Route path="/reset/pharmacyos" element={<ResetRedirect app="pharmacyos" />} />
      </Routes>
      {!hideChrome && <Footer />}
    </>
  )
}

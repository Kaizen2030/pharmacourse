import { Suspense, useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { useAuth } from "./context/AuthContext"
import WebsiteAnalyticsTracker from "./components/WebsiteAnalyticsTracker"
import ChatWidget from "./components/ChatWidget"
import Footer from "./components/Footer"
import Navbar from "./components/Navbar"
import PatientLayout from "./components/PatientLayout"
import PatientInstallPrompt from "./components/PatientInstallPrompt"
import DialogHost from "./components/DialogHost"
import lazyWithReload from "./lib/lazyWithReload"

const Blog = lazyWithReload(() => import("./pages/Blog"))
const BlogPost = lazyWithReload(() => import("./pages/BlogPost"))
const CaseSimulation = lazyWithReload(() => import("./pages/CaseSimulation"))
const Certificate = lazyWithReload(() => import("./pages/Certificate"))
const Community = lazyWithReload(() => import("./pages/Community"))
const CompleteProfile = lazyWithReload(() => import("./pages/CompleteProfile"))
const CourseDetail = lazyWithReload(() => import("./pages/CourseDetail"))
const CoursePlayer = lazyWithReload(() => import("./pages/CoursePlayer"))
const Courses = lazyWithReload(() => import("./pages/Courses"))
const Dashboard = lazyWithReload(() => import("./pages/Dashboard"))
const DesktopAccountActivate = lazyWithReload(() => import("./pages/DesktopAccountActivate"))
const ForgotPassword = lazyWithReload(() => import("./pages/ForgotPassword"))
const Home = lazyWithReload(() => import("./pages/Home"))
const Login = lazyWithReload(() => import("./pages/Login"))
const PatientAppointment = lazyWithReload(() => import("./pages/patient/PatientAppointment"))
const PatientForgotPassword = lazyWithReload(() => import("./pages/patient/PatientForgotPassword"))
const PatientHome = lazyWithReload(() => import("./pages/patient/PatientHome"))
const PatientLogin = lazyWithReload(() => import("./pages/patient/PatientLogin"))
const PatientPrescription = lazyWithReload(() => import("./pages/patient/PatientPrescription"))
const PatientRegister = lazyWithReload(() => import("./pages/patient/PatientRegister"))
const PatientResetPassword = lazyWithReload(() => import("./pages/patient/PatientResetPassword"))
const PatientTrack = lazyWithReload(() => import("./pages/patient/PatientTrack"))
const PatientPortal = lazyWithReload(() => import("./pages/PatientPortal"))
const PatientPortalOperations = lazyWithReload(() => import("./pages/PatientPortalOperations"))
const PatientPortalFlyer = lazyWithReload(() => import("./pages/PatientPortalFlyer"))
const PharmacyOS = lazyWithReload(() => import("./pages/Pharmacyos"))
const Register = lazyWithReload(() => import("./pages/Register"))
const RemedacareOS = lazyWithReload(() => import("./pages/Remedacareos"))
const ResetPassword = lazyWithReload(() => import("./pages/ResetPassword"))
const ResetRedirect = lazyWithReload(() => import("./pages/ResetRedirect"))
const TeamPlans = lazyWithReload(() => import("./pages/TeamPlans"))
const TutorWhatsAppSettings = lazyWithReload(() => import("./pages/TutorWhatsAppSettings"))
const WhatsAppSettings = lazyWithReload(() => import("./pages/WhatsAppSettings"))
const VerifyCertificate = lazyWithReload(() => import("./pages/VerifyCertificate"))
const Workshops = lazyWithReload(() => import("./pages/Workshops"))
const AdminDashboard = lazyWithReload(() => import("./pages/admin/AdminDashboard"))
const CourseForm = lazyWithReload(() => import("./pages/admin/CourseForm"))
const SimulationAdmin = lazyWithReload(() => import("./pages/admin/SimulationAdmin"))

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite"><span className="route-loading-bar" />Loading pageâ€¦</div>
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) return <RouteFallback />
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

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
  const normalizedPath = location.pathname.toLowerCase()
  const isPosRoute = normalizedPath === "/pos"
    || normalizedPath.startsWith("/pos/")
    || normalizedPath === "/patient/portal/operations-preview"
  const isPatientRoute = location.pathname.startsWith("/patient") || location.pathname === "/patient-portal" || isPosRoute
  const isFlyerRoute = location.pathname === "/patient-flyer"
  const isActivationRoute = location.pathname.startsWith("/activate/")

  return (
    <>
      <MediaProtection />
      <DialogHost />
      <WebsiteAnalyticsTracker />
      {isPatientRoute ? <PatientInstallPrompt /> : null}
      {!isPatientRoute && !isFlyerRoute && !isActivationRoute ? <Navbar /> : null}
      <Suspense fallback={<RouteFallback />}>
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
        <Route path="/tutor/whatsapp" element={<TutorWhatsAppSettings />} />
        <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />
        <Route path="/certificate/:courseId" element={<Certificate />} />
        <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
        <Route path="/simulation/:simulationId" element={<CaseSimulation />} />
        <Route path="/pharmacyos" element={<PharmacyOS />} />
        <Route path="/remedacarepos" element={<PharmacyOS />} />
        <Route path="/remedacarehms" element={<RemedacareOS />} />
        <Route path="/remedacareos" element={<RemedacareOS />} />
        <Route path="/remedacarehmis" element={<RemedacareOS />} />
        <Route path="/community" element={<Community />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/courses/new" element={<AdminRoute><CourseForm /></AdminRoute>} />
        <Route path="/admin/courses/:id/edit" element={<AdminRoute><CourseForm /></AdminRoute>} />
        <Route path="/admin/simulations" element={<AdminRoute><SimulationAdmin /></AdminRoute>} />

        <Route path="/patient-portal" element={<PatientPortal />} />
        {/* Deliberately unlinked preview route. POS staff authentication still applies inside the app. */}
        <Route path="/patient/portal/operations-preview" element={<PatientPortalOperations />} />
        <Route path="/pos" element={<PatientPortalOperations />} />
        <Route path="/POS" element={<PatientPortalOperations />} />
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
      </Suspense>
      {!isPatientRoute && !isFlyerRoute && !isActivationRoute ? <Footer /> : null}
      {!isPatientRoute && !isFlyerRoute && !isActivationRoute ? <ChatWidget /> : null}
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

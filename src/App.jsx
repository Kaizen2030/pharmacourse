import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import WebsiteAnalyticsTracker from "./components/WebsiteAnalyticsTracker"
import ChatWidget from "./components/ChatWidget"
import Footer from "./components/Footer"
import Navbar from "./components/Navbar"
import PatientLayout from "./components/PatientLayout"
import PatientInstallPrompt from "./components/PatientInstallPrompt"

const Blog = lazy(() => import("./pages/Blog"))
const BlogPost = lazy(() => import("./pages/BlogPost"))
const CaseSimulation = lazy(() => import("./pages/CaseSimulation"))
const Certificate = lazy(() => import("./pages/Certificate"))
const Community = lazy(() => import("./pages/Community"))
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"))
const CourseDetail = lazy(() => import("./pages/CourseDetail"))
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"))
const Courses = lazy(() => import("./pages/Courses"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const DesktopAccountActivate = lazy(() => import("./pages/DesktopAccountActivate"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const Home = lazy(() => import("./pages/Home"))
const Login = lazy(() => import("./pages/Login"))
const PatientAppointment = lazy(() => import("./pages/patient/PatientAppointment"))
const PatientForgotPassword = lazy(() => import("./pages/patient/PatientForgotPassword"))
const PatientHome = lazy(() => import("./pages/patient/PatientHome"))
const PatientLogin = lazy(() => import("./pages/patient/PatientLogin"))
const PatientPrescription = lazy(() => import("./pages/patient/PatientPrescription"))
const PatientRegister = lazy(() => import("./pages/patient/PatientRegister"))
const PatientResetPassword = lazy(() => import("./pages/patient/PatientResetPassword"))
const PatientTrack = lazy(() => import("./pages/patient/PatientTrack"))
const PatientPortal = lazy(() => import("./pages/PatientPortal"))
const PatientPortalOperations = lazy(() => import("./pages/PatientPortalOperations"))
const PatientPortalFlyer = lazy(() => import("./pages/PatientPortalFlyer"))
const PharmacyOS = lazy(() => import("./pages/Pharmacyos"))
const Register = lazy(() => import("./pages/Register"))
const RemedacareOS = lazy(() => import("./pages/Remedacareos"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const ResetRedirect = lazy(() => import("./pages/ResetRedirect"))
const TeamPlans = lazy(() => import("./pages/TeamPlans"))
const TutorWhatsAppSettings = lazy(() => import("./pages/TutorWhatsAppSettings"))
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"))
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"))
const Workshops = lazy(() => import("./pages/Workshops"))
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"))
const CourseForm = lazy(() => import("./pages/admin/CourseForm"))
const SimulationAdmin = lazy(() => import("./pages/admin/SimulationAdmin"))

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite"><span className="route-loading-bar" />Loading page…</div>
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/courses/new" element={<CourseForm />} />
        <Route path="/admin/courses/:id/edit" element={<CourseForm />} />
        <Route path="/admin/simulations" element={<SimulationAdmin />} />

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

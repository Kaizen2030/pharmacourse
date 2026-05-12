@echo off

:: ── vite.config.js ──
(
echo import { defineConfig } from 'vite'
echo import react from '@vitejs/plugin-react'
echo import tailwindcss from '@tailwindcss/vite'
echo.
echo export default defineConfig^({
echo   plugins: [react^(^), tailwindcss^(^)],
echo }^)
) > vite.config.js

:: ── index.html head ──
powershell -Command "(Get-Content index.html) -replace '<title>Vite \+ React</title>', '<title>PharmaCourse</title>' | Set-Content index.html"
powershell -Command "(Get-Content index.html) -replace '</head>', '  <link href=""https://fonts.googleapis.com/css2?family=DM+Serif+Display^&family=Inter:wght@400;500;600^&display=swap"" rel=""stylesheet""/>`n</head>' | Set-Content index.html"

:: ── src/index.css ──
(
echo @import "tailwindcss";
echo.
echo *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
echo.
echo :root {
echo   --green:       #1A6B4A;
echo   --green-dark:  #0F4A33;
echo   --green-light: #E8F5EE;
echo   --green-mid:   #C6E6D4;
echo   --text-900:    #111827;
echo   --text-500:    #6B7280;
echo   --border:      #E5E7EB;
echo   --bg:          #F9FAFB;
echo   --white:       #FFFFFF;
echo }
echo.
echo body {
echo   font-family: 'Inter', sans-serif;
echo   background: var^(--bg^);
echo   color: var^(--text-900^);
echo   font-size: 15px;
echo   line-height: 1.6;
echo }
) > src\index.css

:: ── src/lib/supabaseClient.js ──
(
echo import { createClient } from '@supabase/supabase-js'
echo.
echo const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
echo const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
echo.
echo export const supabase = createClient^(supabaseUrl, supabaseAnonKey^)
) > src\lib\supabaseClient.js

:: ── src/main.jsx ──
(
echo import { StrictMode } from 'react'
echo import { createRoot } from 'react-dom/client'
echo import './index.css'
echo import App from './App'
echo.
echo createRoot^(document.getElementById^('root'^)^).render^(
echo   ^<StrictMode^>
echo     ^<App /^>
echo   ^</StrictMode^>
echo ^)
) > src\main.jsx

:: ── src/context/AuthContext.jsx ──
(
echo import { createContext, useContext, useEffect, useState } from 'react'
echo import { supabase } from '../lib/supabaseClient'
echo.
echo const AuthContext = createContext^({}^)
echo.
echo export function AuthProvider^({ children }^) {
echo   const [user, setUser] = useState^(null^)
echo   const [profile, setProfile] = useState^(null^)
echo   const [loading, setLoading] = useState^(true^)
echo.
echo   useEffect^(^(^) =^> {
echo     supabase.auth.getSession^(^).then^(^({ data: { session } }^) =^> {
echo       setUser^(session?.user ?? null^)
echo       if ^(session?.user^) fetchProfile^(session.user.id^)
echo       else setLoading^(false^)
echo     }^)
echo     const { data: { subscription } } = supabase.auth.onAuthStateChange^(^(_event, session^) =^> {
echo       setUser^(session?.user ?? null^)
echo       if ^(session?.user^) fetchProfile^(session.user.id^)
echo       else { setProfile^(null^); setLoading^(false^) }
echo     }^)
echo     return ^(^) =^> subscription.unsubscribe^(^)
echo   }, []^)
echo.
echo   async function fetchProfile^(userId^) {
echo     const { data } = await supabase.from^('profiles'^).select^('*'^).eq^('id', userId^).single^(^)
echo     setProfile^(data^)
echo     setLoading^(false^)
echo   }
echo.
echo   const value = { user, profile, loading, isAdmin: profile?.role === 'admin' }
echo   return ^<AuthContext.Provider value={value}^>{children}^</AuthContext.Provider^>
echo }
echo.
echo export const useAuth = ^(^) =^> useContext^(AuthContext^)
) > src\context\AuthContext.jsx

:: ── src/components/Navbar.jsx ──
(
echo import { Link, useNavigate } from 'react-router-dom'
echo import { useAuth } from '../context/AuthContext'
echo import { supabase } from '../lib/supabaseClient'
echo.
echo export default function Navbar^(^) {
echo   const { user, isAdmin } = useAuth^(^)
echo   const navigate = useNavigate^(^)
echo.
echo   async function handleLogout^(^) {
echo     await supabase.auth.signOut^(^)
echo     navigate^('/'^)
echo   }
echo.
echo   return ^(
echo     ^<nav style={{ background:'var^(--white^)', borderBottom:'1px solid var^(--border^)', position:'sticky', top:0, zIndex:100, padding:'0 5%%', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px' }}^>
echo       ^<Link to="/" style={{ fontFamily:"'DM Serif Display', serif", fontSize:'1.35rem', color:'var^(--green^)', textDecoration:'none' }}^>PharmaCourse^</Link^>
echo       ^<div style={{ display:'flex', alignItems:'center', gap:'2rem' }}^>
echo         ^<Link to="/courses" style={{ color:'var^(--text-500^)', textDecoration:'none', fontSize:'.9rem', fontWeight:500 }}^>Explore^</Link^>
echo         {user ? ^(
echo           ^<^>
echo             ^<Link to="/dashboard" style={{ color:'var^(--text-500^)', textDecoration:'none', fontSize:'.9rem', fontWeight:500 }}^>My Learning^</Link^>
echo             {isAdmin ^&^& ^<Link to="/admin" style={{ color:'var^(--green^)', textDecoration:'none', fontSize:'.9rem', fontWeight:500 }}^>Admin^</Link^>}
echo             ^<button onClick={handleLogout} style={{ background:'transparent', border:'1.5px solid var^(--border^)', borderRadius:'8px', padding:'.4rem 1rem', fontSize:'.85rem', cursor:'pointer', color:'var^(--text-500^)' }}^>Sign Out^</button^>
echo           ^</^>
echo         ^) : ^(
echo           ^<Link to="/login" style={{ background:'var^(--green^)', color:'white', padding:'.45rem 1.1rem', borderRadius:'8px', fontSize:'.85rem', fontWeight:600, textDecoration:'none' }}^>Sign In^</Link^>
echo         ^)}
echo       ^</div^>
echo     ^</nav^>
echo   ^)
echo }
) > src\components\Navbar.jsx

:: ── src/App.jsx ──
(
echo import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
echo import { AuthProvider, useAuth } from './context/AuthContext'
echo import Navbar from './components/Navbar'
echo import Home from './pages/Home'
echo import Courses from './pages/Courses'
echo import CourseDetail from './pages/CourseDetail'
echo import Login from './pages/Login'
echo import Register from './pages/Register'
echo import Dashboard from './pages/Dashboard'
echo import CoursePlayer from './pages/CoursePlayer'
echo import AdminDashboard from './pages/admin/AdminDashboard'
echo import CourseForm from './pages/admin/CourseForm'
echo.
echo function PrivateRoute^({ children }^) {
echo   const { user, loading } = useAuth^(^)
echo   if ^(loading^) return ^<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',color:'var^(--text-500^)'}}^>Loading...^</div^>
echo   return user ? children : ^<Navigate to="/login" /^>
echo }
echo.
echo function AdminRoute^({ children }^) {
echo   const { isAdmin, loading } = useAuth^(^)
echo   if ^(loading^) return ^<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',color:'var^(--text-500^)'}}^>Loading...^</div^>
echo   return isAdmin ? children : ^<Navigate to="/" /^>
echo }
echo.
echo function AppRoutes^(^) {
echo   return ^(
echo     ^<^>
echo       ^<Navbar /^>
echo       ^<Routes^>
echo         ^<Route path="/" element={^<Home /^>} /^>
echo         ^<Route path="/courses" element={^<Courses /^>} /^>
echo         ^<Route path="/courses/:slug" element={^<CourseDetail /^>} /^>
echo         ^<Route path="/login" element={^<Login /^>} /^>
echo         ^<Route path="/register" element={^<Register /^>} /^>
echo         ^<Route path="/dashboard" element={^<PrivateRoute^>^<Dashboard /^>^</PrivateRoute^>} /^>
echo         ^<Route path="/learn/:courseId/:lessonId" element={^<PrivateRoute^>^<CoursePlayer /^>^</PrivateRoute^>} /^>
echo         ^<Route path="/admin" element={^<AdminRoute^>^<AdminDashboard /^>^</AdminRoute^>} /^>
echo         ^<Route path="/admin/courses/new" element={^<AdminRoute^>^<CourseForm /^>^</AdminRoute^>} /^>
echo         ^<Route path="/admin/courses/:id/edit" element={^<AdminRoute^>^<CourseForm /^>^</AdminRoute^>} /^>
echo       ^</Routes^>
echo     ^</^>
echo   ^)
echo }
echo.
echo export default function App^(^) {
echo   return ^(
echo     ^<AuthProvider^>
echo       ^<BrowserRouter^>
echo         ^<AppRoutes /^>
echo       ^</BrowserRouter^>
echo     ^</AuthProvider^>
echo   ^)
echo }
) > src\App.jsx

:: ── placeholder pages so app compiles ──
(echo export default function Home^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Home^</h1^>^</div^> }) > src\pages\Home.jsx
(echo export default function Courses^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Courses^</h1^>^</div^> }) > src\pages\Courses.jsx
(echo export default function CourseDetail^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Course Detail^</h1^>^</div^> }) > src\pages\CourseDetail.jsx
(echo export default function Login^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Login^</h1^>^</div^> }) > src\pages\Login.jsx
(echo export default function Register^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Register^</h1^>^</div^> }) > src\pages\Register.jsx
(echo export default function Dashboard^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Dashboard^</h1^>^</div^> }) > src\pages\Dashboard.jsx
(echo export default function CoursePlayer^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Player^</h1^>^</div^> }) > src\pages\CoursePlayer.jsx
(echo export default function AdminDashboard^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Admin^</h1^>^</div^> }) > src\pages\admin\AdminDashboard.jsx
(echo export default function CourseForm^(^) { return ^<div style={{padding:'2rem'}}^>^<h1^>Course Form^</h1^>^</div^> }) > src\pages\admin\CourseForm.jsx

echo.
echo ✅ All files created! Now run: npm run dev

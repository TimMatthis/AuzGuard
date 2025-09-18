import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Policies } from './pages/Policies'
import { PolicyEditor } from './pages/PolicyEditor'
import { ChatPlayground } from './pages/ChatPlayground'
import { Simulator } from './pages/Simulator'
import { Audit } from './pages/Audit'
import { Routes as RoutesPage } from './pages/Routes'
import { Settings } from './pages/Settings'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/policies"
          element={
            <ProtectedRoute>
              <Layout>
                <Policies />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/policies/:policyId"
          element={
            <ProtectedRoute>
              <Layout>
                <PolicyEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/policies/:policyId/rules/:ruleId"
          element={
            <ProtectedRoute>
              <Layout>
                <PolicyEditor />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulator"
          element={
            <ProtectedRoute>
              <Layout>
                <Simulator />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatPlayground />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <Layout>
                <Audit />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

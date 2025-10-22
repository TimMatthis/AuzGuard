import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Dashboard2 as Dashboard } from './pages/Dashboard2'
import { Policies } from './pages/Policies'
import { PolicyEditor } from './pages/PolicyEditor'
import { ChatPlayground } from './pages/ChatPlayground'
import { Models as ModelsPage } from './pages/Models2'
import { ChatUI } from './pages/ChatUI'
import { Simulator } from './pages/Simulator2'
import { Audit } from './pages/Audit'
import { Settings } from './pages/Settings'
import { Decisions } from './pages/Decisions'
import { RoutingConfigurator } from './pages/RoutingConfigurator'
import { UserGroups } from './pages/UserGroups'
import { ProductAccessGroups } from './pages/ProductAccessGroups'
import { BrandingProvider } from './contexts/BrandingContext'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrandingProvider>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/routing-config" element={
          <ProtectedRoute>
            <Layout>
              <RoutingConfigurator />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/user-groups" element={
          <ProtectedRoute>
            <Layout>
              <UserGroups />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/decisions" element={
          <ProtectedRoute>
            <Layout>
              <Decisions />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/policies" element={
          <ProtectedRoute>
            <Layout>
              <Policies />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/models" element={
          <ProtectedRoute>
            <Layout>
              <ModelsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/policies/:policyId" element={
          <ProtectedRoute>
            <Layout>
              <PolicyEditor />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/policies/:policyId/rules/:ruleId" element={
          <ProtectedRoute>
            <Layout>
              <PolicyEditor />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/simulator" element={
          <ProtectedRoute>
            <Layout>
              <Simulator />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <Layout>
              <ChatPlayground />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/chat-ui" element={
          <ProtectedRoute>
            <Layout>
              <ChatUI />
            </Layout>
          </ProtectedRoute>
        } />

        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } /><Route path="/audit" element={
          <ProtectedRoute>
            <Layout>
              <Audit />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/product-access-groups" element={
          <ProtectedRoute requiredPermission="manage_settings">
            <Layout>
              <ProductAccessGroups />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </BrandingProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

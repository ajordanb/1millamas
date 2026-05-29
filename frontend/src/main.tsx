import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { getRouter } from './router'
import { QueryProvider } from './integrations/tanstack-query/QueryProvider'
import { AuthProvider } from './contexts/auth/AuthContext'
import './styles.css'

const router = getRouter()
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)

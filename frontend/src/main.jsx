/**
 * Main Application Entry Point
 * Initializes the React application and renders the root App component.
 * Wraps the application in StrictMode for development checks.
 * * @module main.jsx
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

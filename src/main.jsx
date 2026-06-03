import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import './index.css'
import App from './App.jsx'

// Initialize Amplify cloud backend integration if configuration is present
if (outputs && Object.keys(outputs).length > 0) {
  Amplify.configure(outputs);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

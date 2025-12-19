import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const rootEl = document.getElementById('root') || document.body.appendChild(document.createElement('div'))
rootEl.id = 'root'
const root = createRoot(rootEl)
root.render(<App />)

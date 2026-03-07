import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Explorer from './pages/Explorer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

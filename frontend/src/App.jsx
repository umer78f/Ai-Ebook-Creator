import React from 'react'
import {Routes, Route} from "react-router-dom";
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProtectedRoutes from './components/auth/ProtectedRoutes';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import ViewBookPage from './pages/ViewBookPage';
import ProfilePage from './pages/ProfilePage';

const App = () => {
  return (
    <div >
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<LandingPage/>}/>
        <Route path='/login' element={<LoginPage/>}/>
        <Route path='/signup' element={<SignupPage/>}/>

        {/* Protected Routes */}
        <Route
          path='/dashboard'
          element={<ProtectedRoutes><DashboardPage/></ProtectedRoutes>}
        />
         <Route
          path='/editor/:bookId'
          element={<ProtectedRoutes><EditorPage/></ProtectedRoutes>}
        />
         <Route
          path='/view-book/:bookId'
          element={<ProtectedRoutes><ViewBookPage/></ProtectedRoutes>}
        />
         <Route
          path='/profile'
          element={<ProtectedRoutes><ProfilePage/></ProtectedRoutes>}
        />
      </Routes>
    </div>
  )
}

export default App

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RoleSelection from "./RoleSelection.jsx";
import Login from "./Login.jsx";
import StudentDashboard from "./StudentDashboard.jsx";
import ManagerDashboard from "./ManagerDashboard.jsx";
import HODDashboard from "./HODDashboard.jsx";
import AddPlacementDrive from "./AddPlacementDrive.jsx";
import ApprovalPending from "./ApprovalPending.jsx";
import JobApplicationPage from "./JobApplicationPage.jsx";
import MyProfile from "./MyProfile.jsx";
import JobDetailsPage from "./JobDetailsPage.jsx";
import SavedJobs from "./SavedJobs.jsx";
import ResumeChecker from "./ResumeChecker.jsx";
import MyPreference from "./MyPreference.jsx";
import SplashScreen from "./SplashScreen.jsx";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 1 second
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/approval-pending" element={<ApprovalPending />} />
          <Route path="/student/apply" element={<JobApplicationPage />} />
          <Route path="/student/profile" element={<MyProfile />} />
          <Route path="/student/job/:id" element={<JobDetailsPage />} />
          <Route path="/student/saved-jobs" element={<SavedJobs />} />
          <Route path="/student/resume-checker" element={<ResumeChecker />} />
          <Route path="/student/preference" element={<MyPreference />} />
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/add-drive" element={<AddPlacementDrive />} />
          <Route path="/hod/dashboard" element={<HODDashboard />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

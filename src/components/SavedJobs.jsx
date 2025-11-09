import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './StudentDashboard.css';

export default function SavedJobs() {
  const student = JSON.parse(localStorage.getItem("student"));
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [jobDetails, setJobDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch saved jobs
  useEffect(() => {
    if (!auth.currentUser) return;

    const savedJobsQuery = query(
      collection(db, 'savedJobs'),
      where('studentId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(savedJobsQuery, async (snapshot) => {
      const savedJobsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSavedJobs(savedJobsList);

      // Fetch job details for each saved job using doc()
      const jobsMap = {};
      for (const savedJob of savedJobsList) {
        try {
          const jobDocRef = doc(db, 'placementDrives', savedJob.driveId);
          const jobDocSnap = await getDoc(jobDocRef);
          
          if (jobDocSnap.exists()) {
            jobsMap[savedJob.driveId] = { id: jobDocSnap.id, ...jobDocSnap.data() };
          }
        } catch (error) {
          console.error(`Error fetching job ${savedJob.driveId}:`, error);
        }
      }

      setJobDetails(jobsMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRemoveSaved = async (savedJobId, driveId) => {
    try {
      await deleteDoc(doc(db, 'savedJobs', savedJobId));
    } catch (error) {
      console.error('Error removing saved job:', error);
      alert('Error removing saved job. Please try again.');
    }
  };

  const getInitials = (name) => {
    if (!name) return "1";
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("student");
      localStorage.removeItem("selectedRole");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get actual job data
  const jobsToDisplay = savedJobs
    .map(savedJob => {
      const job = jobDetails[savedJob.driveId];
      if (job) {
        return { ...job, savedJobId: savedJob.id };
      }
      return null;
    })
    .filter(job => job !== null);

  return (
    <div className="student-dashboard">
      {/* Top Navigation Bar */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">CampusConnect</span>
          </div>
        </div>

        <div className="header-center">
          <div className="search-bar">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input type="text" placeholder="Search for jobs, companies..." className="search-input" />
          </div>
        </div>
        
        <div className="header-right">
          <div className="profile-section" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="profile-button"
            >
              <div className="profile-avatar">
                {student?.profileImage ? (
                  <img src={student.profileImage} alt="Profile" />
                ) : (
                  <span>{getInitials(student?.name)}</span>
                )}
              </div>
              <div className="profile-info">
                <span className="profile-name">{student?.studentId || student?.email?.split('@')[0] || student?.name || "Student"}</span>
                <span className="profile-degree">{student?.branch || student?.department || "Computer Science"} {student?.department || "CSE"}</span>
              </div>
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/student/dashboard'); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 9l7-7 7 7M5 9v7a1 1 0 0 0 1 1h3M15 9v7a1 1 0 0 1-1 1h-3" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Dashboard</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/student/profile'); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#495057"/>
                  </svg>
                  <span>My Profile</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l3-3-3-3M13 8H6" stroke="#dc3545" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <div className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <div className="nav-item" onClick={() => navigate('/student/dashboard')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 9l7-7 7 7M5 9v7a1 1 0 0 0 1 1h3M15 9v7a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Dashboard</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/student/profile')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10 12c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>My Profile</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/student/dashboard')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>My Applications</span>
            </div>
            <div className="nav-item active">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Saved Jobs</span>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          <div className="saved-jobs-section">
            <h1 className="section-title">Saved Jobs</h1>
            <p className="section-subtitle">Jobs you've saved for later</p>

            {loading ? (
              <div className="loading-text">Loading saved jobs...</div>
            ) : jobsToDisplay.length > 0 ? (
              <div className="job-cards-container">
                {jobsToDisplay.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-card-header">
                      <div className="company-logo">
                        {job.companyName?.charAt(0) || 'C'}
                      </div>
                      <div className="job-info">
                        <h3 className="job-role">{job.roleOffered}</h3>
                        <p className="company-name">{job.companyName}</p>
                      </div>
                      <div className="job-header-actions">
                        <button
                          className="bookmark-btn saved"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveSaved(job.savedJobId, job.id);
                          }}
                          title="Remove from saved"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path 
                              d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="job-details">
                      <div className="job-detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6c757d"/>
                        </svg>
                        <span>{job.location || 'Not specified'}</span>
                      </div>
                      <div className="job-detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1v14M1 8h14" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>₹{job.salaryOffered || 'N/A'} LPA</span>
                      </div>
                    </div>
                    <div className="job-actions">
                      <button 
                        className="view-details-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/student/job/${job.id}`, { state: { drive: job } });
                        }}
                      >
                        View Details
                      </button>
                      <button
                        className="apply-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/student/apply', { state: { drive: job } });
                        }}
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-jobs">
                <p>No saved jobs yet.</p>
                <p>Click the bookmark icon on any job to save it for later.</p>
                <button 
                  className="browse-jobs-btn"
                  onClick={() => navigate('/student/dashboard')}
                >
                  Browse Jobs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


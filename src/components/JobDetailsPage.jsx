import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import './JobDetailsPage.css';

export default function JobDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem("student"));
  const [jobData, setJobData] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  // Get job data from location state or fetch from Firestore
  useEffect(() => {
    if (!id && !location.state?.drive) {
      navigate('/student/dashboard');
      return;
    }

    // If we have drive data from navigation, use it initially
    if (location.state?.drive) {
      setJobData(location.state.drive);
      setLoading(false);
    }

    // Set up real-time listener for job data
    if (id) {
      const jobRef = doc(db, 'placementDrives', id);
      const unsubscribe = onSnapshot(jobRef, (docSnap) => {
        if (docSnap.exists()) {
          setJobData({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
        } else {
          console.error('Job not found');
          navigate('/student/dashboard');
        }
      }, (error) => {
        console.error('Error fetching job:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [id, location.state, navigate]);

  // Check if student has applied and if job is saved
  useEffect(() => {
    const checkApplicationAndSaved = async () => {
      if (!auth.currentUser || !jobData?.id) return;

      try {
        // Check application
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('driveId', '==', jobData.id),
          where('studentId', '==', auth.currentUser.uid)
        );

        const querySnapshot = await getDocs(applicationsQuery);
        if (!querySnapshot.empty) {
          const appDoc = querySnapshot.docs[0];
          setApplication({ id: appDoc.id, ...appDoc.data() });
        }

        // Check if saved
        const savedJobsQuery = query(
          collection(db, 'savedJobs'),
          where('driveId', '==', jobData.id),
          where('studentId', '==', auth.currentUser.uid)
        );

        const savedSnapshot = await getDocs(savedJobsQuery);
        setIsSaved(!savedSnapshot.empty);
      } catch (error) {
        console.error('Error checking application and saved status:', error);
      }
    };

    checkApplicationAndSaved();
  }, [jobData, auth.currentUser]);

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

  const handleApply = () => {
    if (!jobData) return;
    navigate('/student/apply', { state: { drive: jobData } });
  };

  const handleSaveJob = async () => {
    if (!auth.currentUser || !jobData?.id) {
      alert('Please login to save jobs');
      return;
    }

    try {
      if (isSaved) {
        // Remove from saved jobs
        const savedJobsQuery = query(
          collection(db, 'savedJobs'),
          where('studentId', '==', auth.currentUser.uid),
          where('driveId', '==', jobData.id)
        );
        
        const querySnapshot = await getDocs(savedJobsQuery);
        querySnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'savedJobs', docSnapshot.id));
        });
        setIsSaved(false);
      } else {
        // Add to saved jobs
        await addDoc(collection(db, 'savedJobs'), {
          studentId: auth.currentUser.uid,
          driveId: jobData.id,
          savedAt: new Date().toISOString()
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job. Please try again.');
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

  const calculateTimeRemaining = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return { days: 0, hours: 0, text: 'Closed' };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours, text: `${days} days, ${hours} hours` };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="job-details-page">
        <div className="loading-container">
          <p>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="job-details-page">
        <div className="error-container">
          <p>Job not found</p>
          <button onClick={() => navigate('/student/dashboard')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const timeRemaining = calculateTimeRemaining(jobData.applicationDeadline);
  const hasApplied = application !== null;
  const applicationStatus = application?.status || 'Not Applied';

  return (
    <div className="job-details-page">
      {/* Top Navigation Bar */}
      <div className="job-navbar">
        <div className="job-nav-left">
          <div className="job-logo" onClick={() => navigate('/student/dashboard')}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">CampusConnect</span>
          </div>
        </div>
        
        <div className="job-nav-center">
          <nav className="job-nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/student/dashboard'); }}>Dashboard</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/student/profile'); }}>Profile</a>
          </nav>
        </div>
        
        <div className="job-nav-right">
          <div className="job-help-icon">?</div>
          <div className="profile-section" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="profile-button"
            >
              <div className="profile-avatar-small">
                {student?.profileImage ? (
                  <img src={student.profileImage} alt="Profile" />
                ) : (
                  <span>{student?.studentId?.slice(-1) || student?.name?.slice(-1) || '1'}</span>
                )}
              </div>
              <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/student/dashboard'); }}>
                  <span>Dashboard</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/student/profile'); }}>
                  <span>My Profile</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={handleLogout}>
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <span onClick={() => navigate('/student/dashboard')}>Home</span>
        <span>/</span>
        <span onClick={() => navigate('/student/dashboard')}>Placement Drives</span>
        <span>/</span>
        <span>{jobData.roleOffered}</span>
      </div>

      {/* Main Content */}
      <div className="job-details-container">
        <div className="job-details-main">
          {/* Left Column */}
          <div className="job-details-left">
            {/* Job Header */}
            <div className="job-header">
              <div className="company-logo-large">
                {jobData.companyName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div className="job-header-info">
                <div className="job-title-row">
                  <h1 className="job-title">{jobData.roleOffered}</h1>
                  <button
                    className={`bookmark-btn-large ${isSaved ? 'saved' : ''}`}
                    onClick={handleSaveJob}
                    title={isSaved ? 'Remove from saved' : 'Save job'}
                  >
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        fill={isSaved ? 'currentColor' : 'none'}
                      />
                    </svg>
                  </button>
                </div>
                <div className="job-company-row">
                  <p className="job-company">{jobData.companyName}</p>
                  <span className={`job-status ${jobData.status === 'active' ? 'open' : 'closed'}`}>
                    {jobData.status === 'active' ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* About the Company */}
            <div className="job-card">
              <h2 className="card-title">About the Company</h2>
              <p className="card-content">
                {jobData.additionalInfo || jobData.jobDescription || `${jobData.companyName} is a leading organization looking for talented individuals to join their team.`}
              </p>
            </div>

            {/* Job Details */}
            <div className="job-card">
              <h2 className="card-title">Job Details</h2>
              <div className="job-detail-item">
                <strong>Role:</strong> {jobData.roleOffered}
              </div>
              <div className="job-detail-item">
                <strong>Location:</strong> {jobData.location || 'Not specified'}
              </div>
              
              {jobData.jobDescription && (
                <div className="job-section">
                  <strong>Responsibilities:</strong>
                  {jobData.jobDescription.includes('\n') || jobData.jobDescription.includes('•') ? (
                    <ul className="job-list">
                      {jobData.jobDescription
                        .split(/\n|•/)
                        .filter(line => line.trim())
                        .map((line, index) => (
                          <li key={index}>{line.trim().replace(/^[-•]\s*/, '')}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="job-description-text">{jobData.jobDescription}</p>
                  )}
                </div>
              )}

              {jobData.requirements && (
                <div className="job-section">
                  <strong>Required Skills:</strong>
                  <div className="skills-tags">
                    {jobData.requirements.split(',').map((skill, index) => (
                      <span key={index} className="skill-tag">{skill.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Eligibility Criteria */}
            <div className="job-card">
              <h2 className="card-title">Eligibility Criteria</h2>
              <ul className="eligibility-list">
                {jobData.cgpaCriteria && (
                  <li>CGPA: {jobData.cgpaCriteria} and above</li>
                )}
                {jobData.eligibilityCriteria ? (
                  jobData.eligibilityCriteria.split('\n').filter(line => line.trim()).map((line, index) => (
                    <li key={index}>{line.trim()}</li>
                  ))
                ) : (
                  <>
                    <li>CGPA: {jobData.cgpaCriteria || '7.5'} and above</li>
                    <li>Branches: All branches</li>
                    <li>No active backlogs</li>
                  </>
                )}
              </ul>
            </div>

            {/* Package Details */}
            <div className="job-card">
              <h2 className="card-title">Package Details</h2>
              <div className="package-item">
                <strong>Package (CTC):</strong> ₹{jobData.salaryOffered ? (jobData.salaryOffered * 100000).toLocaleString('en-IN') : '0'} per annum
              </div>
              {jobData.jobType === 'Internship' && (
                <div className="package-item">
                  <strong>Stipend:</strong> ₹{jobData.salaryOffered ? (jobData.salaryOffered * 10000).toLocaleString('en-IN') : '0'} per month
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="job-details-right">
            {/* Enroll Now / Application Status */}
            <div className="job-card">
              {!hasApplied ? (
                <>
                  <button className="enroll-btn" onClick={handleApply}>
                    Enroll Now
                  </button>
                  {timeRemaining && timeRemaining.days >= 0 && (
                    <div className="deadline-info">
                      <p>Application closes in:</p>
                      <p className="deadline-time">{timeRemaining.text}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="application-status-info">
                  <div className="status-badge-large">
                    {applicationStatus}
                  </div>
                  <p className="status-message">
                    You have already applied for this position.
                  </p>
                </div>
              )}
            </div>

            {/* Recruitment Timeline - Only show if applied */}
            {hasApplied && (
              <div className="job-card">
                <h2 className="card-title">Recruitment Timeline</h2>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className={`timeline-circle ${applicationStatus === 'Applied' || applicationStatus === 'On Hold' || applicationStatus === 'Approved' ? 'active' : ''}`}></div>
                    <div className="timeline-content">
                      <div className="timeline-label">Your Status</div>
                      <div className="timeline-status">{applicationStatus}</div>
                    </div>
                  </div>
                  
                  {jobData.interviewDate && (
                    <>
                      <div className="timeline-item">
                        <div className="timeline-circle completed"></div>
                        <div className="timeline-content">
                          <div className="timeline-label">Aptitude Test</div>
                          <div className="timeline-date">{formatDateTime(jobData.interviewDate)}</div>
                          <div className="timeline-status-text completed">Completed</div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className={`timeline-circle ${applicationStatus === 'On Hold' || applicationStatus === 'Approved' ? 'active' : 'pending'}`}></div>
                        <div className="timeline-content">
                          <div className="timeline-label">Technical Round</div>
                          <div className="timeline-date">{formatDateTime(jobData.interviewDate)}</div>
                          <div className={`timeline-status-text ${applicationStatus === 'On Hold' || applicationStatus === 'Approved' ? 'active' : 'pending'}`}>
                            {applicationStatus === 'On Hold' || applicationStatus === 'Approved' ? 'Current' : 'Upcoming'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="timeline-item">
                        <div className={`timeline-circle ${applicationStatus === 'Approved' ? 'completed' : 'pending'}`}></div>
                        <div className="timeline-content">
                          <div className="timeline-label">HR Round</div>
                          <div className="timeline-date">TBD</div>
                          <div className="timeline-status-text pending">Pending</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div className="job-card">
              <h2 className="card-title">Attachments</h2>
              <div className="attachments-list">
                {jobData.jobDescription && (
                  <div className="attachment-item">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4a2 2 0 0 1 2-2h4.586a2 2 0 0 1 1.414.586l3.414 3.414A2 2 0 0 1 16 7.414V14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" stroke="#495057" strokeWidth="1.5"/>
                    </svg>
                    <span>Job Description.pdf</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v10m0 0L4 8m4 4l4-4" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div className="attachment-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 4a2 2 0 0 1 2-2h4.586a2 2 0 0 1 1.414.586l3.414 3.414A2 2 0 0 1 16 7.414V14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" stroke="#495057" strokeWidth="1.5"/>
                  </svg>
                  <span>Company Brochure.pdf</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v10m0 0L4 8m4 4l4-4" stroke="#495057" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


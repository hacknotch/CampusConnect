import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './StudentDashboard.css';

export default function StudentDashboard() {
  const student = JSON.parse(localStorage.getItem("student"));
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [placementDrives, setPlacementDrives] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommended');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [jobsToShow, setJobsToShow] = useState(3);
  const [notifications, setNotifications] = useState([]);
  const [lastSeenJobs, setLastSeenJobs] = useState(new Set());
  const [lastSeenApplications, setLastSeenApplications] = useState(new Map());
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [studentData, setStudentData] = useState(student || {});
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch student data from Firestore
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!auth.currentUser) return;

      try {
        // Try to get student data from Firestore
        const studentsQuery = query(
          collection(db, 'students'),
          where('email', '==', auth.currentUser.email)
        );
        const querySnapshot = await getDocs(studentsQuery);
        
        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          const firestoreStudentData = {
            id: studentDoc.id,
            ...studentDoc.data()
          };
          setStudentData(firestoreStudentData);
          // Update localStorage
          localStorage.setItem('student', JSON.stringify(firestoreStudentData));
        } else {
          // Fallback to localStorage student data
          const localStudent = JSON.parse(localStorage.getItem('student')) || {};
          setStudentData(localStudent);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        // Fallback to localStorage
        const localStudent = JSON.parse(localStorage.getItem('student')) || {};
        setStudentData(localStudent);
      }
    };

    fetchStudentData();
  }, []);

  // Fetch placement drives and applications with real-time listeners
  useEffect(() => {
    let unsubscribeDrives = null;
    let unsubscribeApplications = null;

    // Set up real-time listener for placement drives
    const setupDrivesListener = () => {
      try {
        const drivesQuery = query(
          collection(db, 'placementDrives'),
          orderBy('createdAt', 'desc')
        );

        unsubscribeDrives = onSnapshot(
          drivesQuery,
          (snapshot) => {
            const drives = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            console.log('📊 Real-time update: Total drives found:', drives.length);

            // Filter only active drives (NO CGPA FILTER - show all active drives)
            const activeDrives = drives.filter(drive => {
              return drive.status === 'active';
            });

            // Check for new jobs (notifications)
            const currentJobIds = new Set(activeDrives.map(d => d.id));
            const newJobs = activeDrives.filter(drive => !lastSeenJobs.has(drive.id));
            
            if (newJobs.length > 0 && lastSeenJobs.size > 0) {
              // Only notify if we've seen jobs before (not initial load)
              newJobs.forEach(job => {
                const notification = {
                  id: `job-${job.id}-${Date.now()}`,
                  type: 'new_job',
                  title: 'New Job Available',
                  message: `${job.companyName} - ${job.roleOffered}`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  jobId: job.id
                };
                setNotifications(prev => [notification, ...prev]);
              });
            }
            
            // Update last seen jobs
            setLastSeenJobs(currentJobIds);

            console.log('✅ Active drives (all visible, no CGPA filter):', activeDrives.length);
            setPlacementDrives(activeDrives);
            setLoading(false);
          },
          (error) => {
            console.error('Error in drives listener:', error);
            // If orderBy fails due to missing index, use simple collection query
            if (error.code === 'failed-precondition') {
              console.log('⚠️ Firestore index required for orderBy. Using simple query...');
              const simpleQuery = collection(db, 'placementDrives');
              unsubscribeDrives = onSnapshot(simpleQuery, (snapshot) => {
                const drives = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                // Manual sort
                drives.sort((a, b) => {
                  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return bTime - aTime;
                });
                // Filter only active drives (NO CGPA FILTER)
                const activeDrives = drives.filter(drive => {
                  return drive.status === 'active';
                });
                setPlacementDrives(activeDrives);
                setLoading(false);
              });
            } else {
              setLoading(false);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up drives listener:', error);
        setLoading(false);
      }
    };
    
    // Set up real-time listener for applications
    const setupApplicationsListener = async () => {
      const unsubscribe = await fetchMyApplications();
      return unsubscribe;
    };
    
    // Initialize listeners
    setupDrivesListener();
    setupApplicationsListener().then(unsub => {
      unsubscribeApplications = unsub;
    });

      // Cleanup listeners on component unmount
    return () => {
          if (unsubscribeDrives) {
            unsubscribeDrives();
          }
          if (unsubscribeApplications) {
            unsubscribeApplications();
          }
        };
      }, []); // Empty dependency array - only run once on mount

      // Fetch saved jobs
      useEffect(() => {
        const fetchSavedJobs = async () => {
          if (!auth.currentUser) return;

          try {
            const savedJobsQuery = query(
              collection(db, 'savedJobs'),
              where('studentId', '==', auth.currentUser.uid)
            );

            const unsubscribe = onSnapshot(savedJobsQuery, (snapshot) => {
              const savedJobIds = new Set();
              snapshot.docs.forEach(doc => {
                savedJobIds.add(doc.data().driveId);
              });
              setSavedJobs(savedJobIds);
            });

            return () => unsubscribe();
    } catch (error) {
            console.error('Error fetching saved jobs:', error);
    }
  };

        fetchSavedJobs();
      }, []);

  // Removed fetchPlacementDrives - now using real-time listener in useEffect

  const fetchMyApplications = async () => {
    try {
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('studentId', '==', auth.currentUser?.uid)
      );
      
      // Use real-time listener for instant status updates
      const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
        const applications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('📊 Real-time update: Student applications:', applications.length);
        console.log('📋 Application statuses:', applications.map(app => ({
          company: app.companyName,
          status: app.status,
          updatedAt: app.updatedAt
        })));

        // Check for status changes (notifications for approved/rejected)
        if (lastSeenApplications.size > 0) {
          applications.forEach(app => {
            const prevApp = lastSeenApplications.get(app.id);
            
            // Only notify if status changed (not on initial load)
            if (prevApp && prevApp.status !== app.status) {
              // Status changed - create notification
              let notification = null;
              
              if (app.status === 'Approved') {
                notification = {
                  id: `approved-${app.id}-${Date.now()}`,
                  type: 'approved',
                  title: 'Application Approved! 🎉',
                  message: `Your application for ${app.companyName} - ${app.roleOffered} has been approved!`,
                  timestamp: app.updatedAt || new Date().toISOString(),
                  read: false,
                  applicationId: app.id
                };
              } else if (app.status === 'Rejected') {
                notification = {
                  id: `rejected-${app.id}-${Date.now()}`,
                  type: 'rejected',
                  title: 'Application Update',
                  message: `Your application for ${app.companyName} - ${app.roleOffered} has been rejected.`,
                  timestamp: app.updatedAt || new Date().toISOString(),
                  read: false,
                  applicationId: app.id
                };
              } else if (app.status === 'On Hold') {
                notification = {
                  id: `hold-${app.id}-${Date.now()}`,
                  type: 'on_hold',
                  title: 'Application Under Review',
                  message: `Your application for ${app.companyName} - ${app.roleOffered} is now under review.`,
                  timestamp: app.updatedAt || new Date().toISOString(),
                  read: false,
                  applicationId: app.id
                };
              }
              
              if (notification) {
                setNotifications(prev => [notification, ...prev]);
                console.log('🔔 New notification:', notification);
              }
            }
          });
        }
        
        // Update last seen applications (store as Map with id as key)
        const appsMap = new Map();
        applications.forEach(app => {
          appsMap.set(app.id, { id: app.id, status: app.status });
        });
        setLastSeenApplications(appsMap);
        setMyApplications(applications);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleApply = async (drive, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!auth.currentUser) {
      alert('Please login to apply');
      return;
    }

    // Check if already applied
    const hasApplied = myApplications.some(app => app.driveId === drive.id);
    if (hasApplied) {
      alert('⚠️ You have already applied to this placement drive!');
      return;
    }

    try {
      // Use current student data state (from Firestore or localStorage)
      const currentStudentData = studentData || student || {};
      
      // Prepare application data with student information
      const studentName = currentStudentData.name || 
                         (currentStudentData.firstName && currentStudentData.lastName 
                           ? `${currentStudentData.firstName} ${currentStudentData.lastName}` 
                           : '') ||
                         auth.currentUser.email?.split('@')[0] || 
                         'Student';
      
      const studentEmail = currentStudentData.email || auth.currentUser.email || '';
      const studentBranch = currentStudentData.branch || currentStudentData.department || 'Computer Science';
      const studentCGPA = currentStudentData.cgpa || currentStudentData.CGPA || '0.0';
      const studentSkills = Array.isArray(currentStudentData.skills) 
        ? currentStudentData.skills.join(', ') 
        : (currentStudentData.skills || 'N/A');

      const applicationData = {
        driveId: drive.id,
        studentId: auth.currentUser.uid,
        studentName: studentName,
        studentEmail: studentEmail,
        studentBranch: studentBranch,
        studentDepartment: currentStudentData.department || currentStudentData.branch || studentBranch,
        studentCGPA: studentCGPA,
        studentSkills: studentSkills,
        companyName: drive.companyName,
        roleOffered: drive.roleOffered,
        resumeUrl: '', // No resume upload for one-click apply
        resumeFileName: '',
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        applicationData: {
          firstName: currentStudentData.name?.split(' ')[0] || currentStudentData.firstName || '',
          lastName: currentStudentData.name?.split(' ').slice(1).join(' ') || currentStudentData.lastName || '',
          department: currentStudentData.department || currentStudentData.branch || studentBranch,
          cgpa: studentCGPA,
          skills: studentSkills,
        }
      };

      console.log('📤 Submitting application:', {
        company: drive.companyName,
        role: drive.roleOffered,
        student: studentName,
        email: studentEmail
      });

      // Add application to Firestore
      await addDoc(collection(db, 'applications'), applicationData);

      console.log('✅ Application submitted successfully!');
      alert('✅ Application submitted successfully!');
      
      // Application will automatically appear in TPO dashboard via real-time listener
    } catch (error) {
      console.error('❌ Error submitting application:', error);
      alert('❌ Error submitting application: ' + (error.message || 'Please try again.'));
    }
  };

  const handleSaveJob = async (driveId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!auth.currentUser) {
      alert('Please login to save jobs');
        return;
      }

    try {
      // Check if already saved
      const isSaved = savedJobs.has(driveId);
      
      if (isSaved) {
        // Remove from saved jobs
        const savedJobsQuery = query(
          collection(db, 'savedJobs'),
          where('studentId', '==', auth.currentUser.uid),
          where('driveId', '==', driveId)
        );
        
        const querySnapshot = await getDocs(savedJobsQuery);
        querySnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'savedJobs', docSnapshot.id));
        });
      } else {
        // Add to saved jobs
        await addDoc(collection(db, 'savedJobs'), {
          studentId: auth.currentUser.uid,
          driveId: driveId,
          savedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job. Please try again.');
    }
  };

  // Generate initials for default avatar
  const getInitials = (name) => {
    if (!name) return "ST";
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

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const fields = ['name', 'email', 'branch', 'cgpa', 'year', 'department', 'skills'];
    const completed = fields.filter(field => student?.[field] && student[field] !== '' && student[field] !== '0.0').length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

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
          <div className="notification-wrapper" ref={notificationRef}>
            <div className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </div>
            
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  {notifications.filter(n => !n.read).length > 0 && (
            <button
                      className="mark-all-read-btn"
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => 
                            n.id === notification.id ? { ...n, read: true } : n
                          ));
                        }}
                      >
                        <div className="notification-icon-small">
                          {notification.type === 'approved' && '🎉'}
                          {notification.type === 'rejected' && '❌'}
                          {notification.type === 'on_hold' && '⏸️'}
                          {notification.type === 'new_job' && '🆕'}
                        </div>
                        <div className="notification-content">
                          <h4 className="notification-title">{notification.title}</h4>
                          <p className="notification-message">{notification.message}</p>
                          <span className="notification-time">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {!notification.read && <div className="unread-indicator"></div>}
                </div>
                    ))
                  ) : (
                    <div className="no-notifications">
                      <p>No notifications yet</p>
                      </div>
                    )}
                    </div>
                  </div>
            )}
                </div>
                
          <div className="profile-section" ref={dropdownRef}>
                  <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="profile-button"
            >
              <div className="profile-avatar">
                {student?.profileImage ? (
                  <img src={student.profileImage} alt="Profile" />
                ) : (
                  <span>{student?.studentId?.slice(-1) || student?.name?.slice(-1) || '1'}</span>
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
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#495057"/>
                  </svg>
                  <span>View Profile</span>
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileDropdown(false); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="#495057"/>
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" fill="#495057"/>
                    </svg>
                    <span>Settings</span>
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
        <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <div className="nav-item active">
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
            <div className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>My Applications</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/student/saved-jobs')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Saved Jobs</span>
            </div>
            <div className="nav-item" onClick={() => navigate('/student/resume-checker')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v12H4V4zM4 8h12M8 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6h2v2H6V6zM12 6h2v2h-2V6zM6 10h2v2H6v-2zM12 10h2v2h-2v-2z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Resume Checker</span>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          {/* Welcome Section */}
          <div className="welcome-card">
            <div className="welcome-content">
              <h1 className="welcome-title">Welcome back, {student?.name?.split(' ')[0] || "Student"}!</h1>
              <p className="welcome-subtitle">Here's a summary of your recruitment journey today.</p>
            </div>
            <div className="profile-completion-section">
              <div className="completion-header">
                <h3 className="completion-title">Profile Completion</h3>
                <p className="completion-percentage">{profileCompletion}%</p>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${profileCompletion}%` }}></div>
          </div>
              <div className="completion-footer">
                <p className="completion-text">Complete your profile to get better recommendations.</p>
                <button className="update-profile-btn">Up... →</button>
          </div>
        </div>
      </div>

          {/* Explore Opportunities Section */}
          <div className="opportunities-section">
            <h2 className="section-title">Explore Opportunities</h2>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'recommended' ? 'active' : ''}`}
                onClick={() => setActiveTab('recommended')}
              >
                Recommended Jobs
              </button>
              <button 
                className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active Drives
              </button>
            <button 
                className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('saved')}
            >
                Saved Jobs
            </button>
        </div>
        
            {/* Job Cards */}
            <div className="job-cards-container">
        {loading ? (
                <div className="loading-text">Loading placement drives...</div>
        ) : placementDrives.length > 0 ? (
                <>
                  {placementDrives.slice(0, jobsToShow).map((drive) => {
              const hasApplied = myApplications.some(app => app.driveId === drive.id);
              return (
                      <div key={drive.id} className="job-card">
                        <div className="job-card-header">
                          <div className="company-logo">
                            {drive.companyName?.charAt(0) || 'C'}
                          </div>
                          <div className="job-info">
                            <h3 className="job-role">{drive.roleOffered}</h3>
                            <p className="company-name">{drive.companyName}</p>
                          </div>
                          <div className="job-header-actions">
                            <button
                              className={`bookmark-btn ${savedJobs.has(drive.id) ? 'saved' : ''}`}
                              onClick={(e) => handleSaveJob(drive.id, e)}
                              title={savedJobs.has(drive.id) ? 'Remove from saved' : 'Save job'}
                            >
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path 
                                  d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  fill={savedJobs.has(drive.id) ? 'currentColor' : 'none'}
                                />
                              </svg>
                            </button>
                            <span className="job-tag">{hasApplied ? 'Applied' : 'Recommended'}</span>
                          </div>
                        </div>
                        <div className="job-details">
                          <div className="job-detail-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6c757d"/>
                            </svg>
                            <span>{drive.location || 'Not specified'}</span>
                  </div>
                          <div className="job-detail-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 1v14M1 8h14" stroke="#6c757d" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>₹{drive.salaryOffered || 'N/A'} LPA</span>
                  </div>
                    </div>
                            <div className="job-actions">
                              <button 
                                className="view-details-btn"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/student/job/${drive.id}`, { state: { drive } });
                                }}
                              >
                                View Details
                              </button>
                  <button
                                className={`apply-btn ${hasApplied ? 'applied' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!hasApplied) {
                                    handleApply(drive, e);
                                  }
                                }}
                    disabled={hasApplied}
                  >
                                {hasApplied ? 'Applied' : 'Apply Now'}
                  </button>
                            </div>
                </div>
              );
            })}
                  
                  {/* See More / Show Less Button */}
                  {placementDrives.length > 3 && (
                    <div className="see-more-container">
                      {jobsToShow < placementDrives.length ? (
                        <button 
                          className="see-more-btn"
                          onClick={() => setJobsToShow(placementDrives.length)}
                        >
                          See More ({placementDrives.length - jobsToShow} more jobs)
                        </button>
                      ) : (
                        <button 
                          className="see-more-btn"
                          onClick={() => setJobsToShow(3)}
                        >
                          Show Less
                        </button>
                      )}
          </div>
        )}
                </>
              ) : (
                <div className="no-jobs">No placement drives available</div>
              )}
            </div>
      </div>

          {/* Application Status Section */}
          {myApplications.length > 0 && (
            <div className="application-status-section">
              <h2 className="section-title">My Application Status</h2>
              <div className="application-cards">
                {myApplications.map((application) => {
                  // Normalize status to handle variations
                  const rawStatus = application.status || 'Applied';
                  const currentStatus = rawStatus.trim();
                  
                  // Define the progression order (matching ManagerDashboard statuses)
                  const statusSteps = ['Applied', 'On Hold', 'Approved'];
                  const isRejected = currentStatus === 'Rejected';
                  
                  // Find current index - handle case-insensitive and space variations
                  const currentIndex = statusSteps.findIndex(step => 
                    step.toLowerCase() === currentStatus.toLowerCase() || 
                    step.replace(/\s+/g, '').toLowerCase() === currentStatus.replace(/\s+/g, '').toLowerCase()
                  );
                  
                  // If not found in steps, default to 0 (Applied)
                  const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
                  
                  return (
                    <div key={application.id} className="application-card">
                      <div className="application-header">
                        <div className="company-logo-small">
                          {application.companyName?.charAt(0) || 'C'}
                        </div>
                        <div className="application-info">
                          <h3 className="application-role">{application.roleOffered}</h3>
                          <p className="application-company">{application.companyName}</p>
                    </div>
                        <span className={`status-badge ${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          {currentStatus}
                        </span>
                    </div>
                      <div className="status-progress">
                        {statusSteps.map((status, index) => {
                          // Step is completed if it's before or at the current status (and not rejected)
                          const isCompleted = !isRejected && normalizedIndex >= index;
                          // Step is active if it matches the current status exactly
                          const isActive = !isRejected && normalizedIndex === index;
                          // Check if the NEXT step (index + 1) is completed - used to determine line color
                          const nextStepIndex = index + 1;
                          const nextStepIsCompleted = !isRejected && normalizedIndex >= nextStepIndex;
                          // Is last step
                          const isLastStep = index === statusSteps.length - 1;
                          
                          return (
                            <div 
                              key={status} 
                              className={`status-step ${isCompleted ? 'active' : ''}`}
                              data-next-completed={!isLastStep && nextStepIsCompleted ? 'true' : 'false'}
                            >
                              <div className={`status-circle ${isCompleted ? 'active' : ''}`}>
                                {isCompleted && !isActive ? '✓' : index + 1}
                  </div>
                              <span className="status-label">{status}</span>
                              {isActive && (
                                <span className="current-status-indicator">Current</span>
                  )}
                </div>
                          );
                        })}
                        {isRejected && (
                          <div className="status-step rejected-step">
                            <div className="status-circle rejected">
                              ✗
          </div>
                            <span className="status-label rejected-label">Rejected</span>
        </div>
      )}
          </div>
                      {application.updatedAt && (
                        <div className="application-updated">
                          Last updated: {new Date(application.updatedAt).toLocaleString()}
          </div>
        )}
      </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

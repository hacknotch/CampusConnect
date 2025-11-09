import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import './MyProfile.css';

export default function MyProfile() {
  const student = JSON.parse(localStorage.getItem("student"));
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = React.useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: student?.email || '',
    phoneNumber: student?.phoneNumber || '',
    skills: student?.skills || '',
    experience: student?.experience || '',
    certifications: student?.certifications || '',
    achievements: student?.achievements || '',
    branch: student?.branch || '',
    department: student?.department || '',
    cgpa: student?.cgpa || '',
    year: student?.year || '',
    studentId: student?.studentId || '',
  });

  useEffect(() => {
    // Load student data from Firestore
    const loadStudentData = async () => {
      if (!auth.currentUser) return;

      try {
        const studentDoc = await getDoc(doc(db, 'students', auth.currentUser.uid));
        if (studentDoc.exists()) {
          const data = studentDoc.data();
          const nameParts = (data.name || student?.name || '').split(' ');
          setFormData({
            firstName: data.firstName || nameParts[0] || '',
            lastName: data.lastName || nameParts.slice(1).join(' ') || '',
            fullName: data.name || student?.name || '',
            email: data.email || student?.email || auth.currentUser.email || '',
            phoneNumber: data.phoneNumber || student?.phoneNumber || '',
            skills: data.skills || student?.skills || '',
            experience: data.experience || student?.experience || '',
            certifications: data.certifications || student?.certifications || '',
            achievements: data.achievements || student?.achievements || '',
            branch: data.branch || student?.branch || '',
            department: data.department || student?.department || '',
            cgpa: data.cgpa || student?.cgpa || '',
            year: data.year || student?.year || '',
            studentId: data.studentId || student?.studentId || data.email?.split('@')[0] || auth.currentUser.email?.split('@')[0] || '',
          });
        } else {
          // If document doesn't exist, use localStorage data
          const nameParts = (student?.name || '').split(' ');
          setFormData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            fullName: student?.name || '',
            email: student?.email || auth.currentUser.email || '',
            phoneNumber: student?.phoneNumber || '',
            skills: student?.skills || '',
            experience: student?.experience || '',
            certifications: student?.certifications || '',
            achievements: student?.achievements || '',
            branch: student?.branch || '',
            department: student?.department || '',
            cgpa: student?.cgpa || '',
            year: student?.year || '',
            studentId: student?.studentId || auth.currentUser.email?.split('@')[0] || '',
          });
        }
      } catch (error) {
        console.error('Error loading student data:', error);
        // Fallback to localStorage data
        const nameParts = (student?.name || '').split(' ');
        setFormData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          fullName: student?.name || '',
          email: student?.email || auth.currentUser?.email || '',
          phoneNumber: student?.phoneNumber || '',
          skills: student?.skills || '',
          experience: student?.experience || '',
          certifications: student?.certifications || '',
          achievements: student?.achievements || '',
          branch: student?.branch || '',
          department: student?.department || '',
          cgpa: student?.cgpa || '',
          year: student?.year || '',
          studentId: student?.studentId || auth.currentUser?.email?.split('@')[0] || '',
        });
      }
    };

    loadStudentData();
  }, [student]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please login to save profile');
        return;
      }

      const studentRef = doc(db, 'students', user.uid);
      const fullName = formData.fullName || `${formData.firstName} ${formData.lastName}`.trim();
      
      const studentData = {
        name: fullName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || user.email,
        phoneNumber: formData.phoneNumber,
        skills: formData.skills,
        experience: formData.experience,
        certifications: formData.certifications,
        achievements: formData.achievements,
        branch: formData.branch,
        department: formData.department,
        cgpa: formData.cgpa,
        year: formData.year,
        studentId: formData.studentId,
        updatedAt: new Date().toISOString()
      };

      // Check if document exists
      const studentDoc = await getDoc(studentRef);
      if (studentDoc.exists()) {
        await updateDoc(studentRef, studentData);
      } else {
        // Create document if it doesn't exist
        await setDoc(studentRef, {
          ...studentData,
          createdAt: new Date().toISOString(),
          uid: user.uid
        });
      }

      // Update localStorage
      const updatedStudent = {
        ...student,
        ...formData,
        name: fullName
      };
      localStorage.setItem('student', JSON.stringify(updatedStudent));

      alert('✅ Profile updated successfully!');
      setIsEditing(false);
      // Reload to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload original data
    window.location.reload();
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
                  <span>View Profile</span>
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
            <div className="nav-item active">
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
            <div className="nav-item" onClick={() => navigate('/student/saved-jobs')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16l-5-3-5 3V5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Saved Jobs</span>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          <div className="profile-page-container">
            <div className="profile-page-header">
              <h1 className="profile-page-title">My Profile</h1>
              {!isEditing ? (
                <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.333 2a2.829 2.829 0 1 1 4 4L6 15.333H2v-4L9.333 4a2.829 2.829 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="profile-actions">
                  <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </button>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="profile-content">
              {/* Personal Information Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Personal Information</h2>
                <div className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={true}
                      className="disabled"
                    />
                    <span className="field-note">Email cannot be changed</span>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Student ID</label>
                      <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                        placeholder="Enter your student ID"
                      />
                    </div>
                    <div className="form-group">
                      <label>Year</label>
                      <input
                        type="text"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                        placeholder="e.g., 2024"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Academic Information</h2>
                <div className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Branch</label>
                      <input
                        type="text"
                        name="branch"
                        value={formData.branch}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'disabled' : ''}
                        placeholder="e.g., CSE"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>CGPA</label>
                    <input
                      type="number"
                      name="cgpa"
                      value={formData.cgpa}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      placeholder="e.g., 8.5"
                      min="0"
                      max="10"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Skills</h2>
                <div className="profile-form">
                  <div className="form-group">
                    <label>Skills</label>
                    <textarea
                      name="skills"
                      value={formData.skills}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      rows="4"
                      placeholder="Enter your skills separated by commas (e.g., JavaScript, Python, React, Node.js)"
                    />
                    <span className="field-note">Separate multiple skills with commas</span>
                  </div>
                </div>
              </div>

              {/* Experience Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Experience</h2>
                <div className="profile-form">
                  <div className="form-group">
                    <label>Experience</label>
                    <textarea
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      rows="5"
                      placeholder="Describe your work experience, internships, projects, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Certifications Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Certifications</h2>
                <div className="profile-form">
                  <div className="form-group">
                    <label>Certifications</label>
                    <textarea
                      name="certifications"
                      value={formData.certifications}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      rows="5"
                      placeholder="List your certifications (e.g., AWS Certified, Google Cloud Certified, etc.)"
                    />
                  </div>
                </div>
              </div>

              {/* Achievements Section */}
              <div className="profile-section-card">
                <h2 className="section-title">Achievements</h2>
                <div className="profile-form">
                  <div className="form-group">
                    <label>Achievements</label>
                    <textarea
                      name="achievements"
                      value={formData.achievements}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'disabled' : ''}
                      rows="5"
                      placeholder="List your achievements, awards, recognitions, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


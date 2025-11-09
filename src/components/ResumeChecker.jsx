import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { extractResumeText, calculateATSScore } from '../utils/atsScorer';
import { parseResumeData } from '../utils/resumeParser';
import { generateResumePDF } from '../utils/resumeGenerator';
import ResumeBuilderModal from './ResumeBuilderModal';
import './ResumeChecker.css';
import './StudentDashboard.css';

export default function ResumeChecker() {
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem("student")) || {};
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resumeFile, setResumeFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [error, setError] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [generatedResumeText, setGeneratedResumeText] = useState('');
  const [generatedAtsResult, setGeneratedAtsResult] = useState(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [showGeneratedResume, setShowGeneratedResume] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
        setError('Please upload a PDF or DOCX file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB.');
        return;
      }
      setResumeFile(file);
      setError('');
      setAtsResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('Please select a resume file first.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAtsResult(null);

    try {
      // Extract text from resume
      const text = await extractResumeText(resumeFile);
      setResumeText(text);

      // Calculate ATS score
      const result = calculateATSScore(text, resumeFile.name);
      setAtsResult(result);
    } catch (err) {
      console.error('Error analyzing resume:', err);
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResumeFile(null);
    setAtsResult(null);
    setResumeText('');
    setError('');
    setShowGeneratedResume(false);
    setGeneratedAtsResult(null);
    setGeneratedResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateResume = () => {
    if (!resumeText) {
      setError('No resume text available. Please analyze a resume first.');
      return;
    }

    // Parse resume data from text
    const parsedData = parseResumeData(resumeText);
    
    // Merge with student data from localStorage/Firestore
    const student = JSON.parse(localStorage.getItem("student")) || {};
    
    // Enhance parsed data with student profile data
    if (!parsedData.personalInfo.name && student.name) {
      parsedData.personalInfo.name = student.name;
    }
    if (!parsedData.personalInfo.email && student.email) {
      parsedData.personalInfo.email = student.email;
    }
    if (!parsedData.personalInfo.phone && student.phoneNumber) {
      parsedData.personalInfo.phone = student.phoneNumber;
    }
    
    // Enhance skills
    if (student.skills) {
      const studentSkills = Array.isArray(student.skills) ? student.skills : student.skills.split(',').map(s => s.trim());
      const allSkills = [...new Set([...parsedData.skills.filter(s => s), ...studentSkills])];
      parsedData.skills = allSkills.length > 0 ? allSkills : [''];
    }
    
    // Set resume data and show builder
    setResumeData(parsedData);
    setShowResumeBuilder(true);
  };

  const handleResumeGenerated = async (generatedText, fileName) => {
    setGeneratedResumeText(generatedText);
    setGeneratedFileName(fileName);
    
    // Analyze the generated resume
    try {
      const newAtsResult = calculateATSScore(generatedText, fileName);
      setGeneratedAtsResult(newAtsResult);
      setShowGeneratedResume(true);
      setShowResumeBuilder(false);
      
      // Scroll to generated resume section after a short delay
      setTimeout(() => {
        const element = document.getElementById('generated-resume-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } catch (error) {
      console.error('Error analyzing generated resume:', error);
      setError('Failed to analyze generated resume.');
    }
  };

  const handleDownloadGeneratedResume = () => {
    if (!resumeData) {
      setError('No resume data available to download.');
      return;
    }
    
    // Regenerate and download the PDF
    generateResumePDF(resumeData, generatedFileName);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 70) return '#17a2b8'; // Blue
    if (score >= 60) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return '✓';
      case 'needs-improvement':
        return '⚠';
      case 'poor':
        return '✗';
      default:
        return '•';
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
        <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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
            <div className="nav-item active" onClick={() => navigate('/student/resume-checker')}>
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
          <div className="resume-checker-container">
            <h1 className="page-title">Resume Checker</h1>
            <p className="page-subtitle">Upload your resume to analyze ATS compatibility and get detailed feedback</p>
            
            {/* Upload Section */}
            {!atsResult && (
              <div className="checker-card">
                <div className="upload-section">
                  <div className="upload-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2>Upload Your Resume</h2>
                  <p className="upload-description">Upload your resume in PDF or DOCX format to analyze ATS compatibility</p>
                  
                  <div className="file-upload-area">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc"
                      className="file-input"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="file-upload-label">
                      {resumeFile ? (
                        <div className="file-selected">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>{resumeFile.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleReset(); }}
                            className="remove-file-btn"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Click to upload or drag and drop</span>
                          <span className="file-hint">PDF or DOCX (Max 10MB)</span>
                        </>
                      )}
                    </label>
                  </div>

                  {error && (
                    <div className="error-message">{error}</div>
                  )}

                  <button
                    className="analyze-btn"
                    onClick={handleAnalyze}
                    disabled={!resumeFile || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="32">
                            <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                          </circle>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Resume'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Results Section */}
            {atsResult && (
              <div className="results-container">
                {/* Overall Score Card */}
                <div className="score-card" style={{ borderColor: getScoreColor(atsResult.overallScore) }}>
                  <div className="score-header">
                    <h2>ATS Compatibility Score</h2>
                    <div className="score-circle" style={{ borderColor: getScoreColor(atsResult.overallScore) }}>
                      <span className="score-number" style={{ color: getScoreColor(atsResult.overallScore) }}>
                        {atsResult.overallScore}
                      </span>
                      <span className="score-label">/100</span>
                    </div>
                  </div>
                  <div className="score-status" style={{ color: getScoreColor(atsResult.overallScore) }}>
                    {getStatusIcon(atsResult.overallStatus)} {atsResult.overallStatus.toUpperCase()}
                  </div>
                  <p className="score-description">
                    {atsResult.overallScore >= 80 
                      ? "Your resume is highly compatible with ATS systems!"
                      : atsResult.overallScore >= 70
                      ? "Your resume is mostly ATS-friendly but could use some improvements."
                      : atsResult.overallScore >= 60
                      ? "Your resume needs significant improvements for better ATS compatibility."
                      : "Your resume has major ATS compatibility issues that need to be addressed."}
                  </p>
                </div>

                {/* Breakdown Section */}
                <div className="breakdown-section">
                  <h3>Detailed Breakdown</h3>
                  <div className="breakdown-grid">
                    {Object.entries(atsResult.breakdown).map(([key, value]) => (
                      <div key={key} className="breakdown-item">
                        <div className="breakdown-header">
                          <span className="breakdown-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="breakdown-score">
                            {value.score}/{value.max}
                          </span>
                        </div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-progress" 
                            style={{ 
                              width: `${(value.score / value.max) * 100}%`,
                              backgroundColor: getScoreColor((value.score / value.max) * 100)
                            }}
                          ></div>
                        </div>
                        <div className="breakdown-status">
                          {getStatusIcon(value.status)} {value.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issues Section */}
                {atsResult.issues.length > 0 && (
                  <div className="issues-section">
                    <h3>Issues Found</h3>
                    <ul className="issues-list">
                      {atsResult.issues.map((issue, index) => (
                        <li key={index} className="issue-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#dc3545" strokeWidth="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions Section */}
                {atsResult.suggestions.length > 0 && (
                  <div className="suggestions-section">
                    <h3>Suggestions for Improvement</h3>
                    <ul className="suggestions-list">
                      {atsResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="suggestion-item">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#17a2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stats Section */}
                <div className="stats-section">
                  <h3>Resume Statistics</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Word Count</span>
                      <span className="stat-value">{atsResult.stats.wordCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Character Count</span>
                      <span className="stat-value">{atsResult.stats.characterCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Sections Found</span>
                      <span className="stat-value">{atsResult.stats.sectionsFound}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Action Verbs</span>
                      <span className="stat-value">{atsResult.stats.actionVerbsFound}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button className="reset-btn" onClick={handleReset}>
                    Analyze Another Resume
                  </button>
                  <button 
                    className="generate-btn"
                    onClick={handleGenerateResume}
                  >
                    Generate ATS-Friendly Resume
                  </button>
                </div>
              </div>
            )}

            {/* Generated Resume Section */}
            {showGeneratedResume && generatedAtsResult && (
              <div id="generated-resume-section" className="results-container" style={{ marginTop: '32px', paddingTop: '32px', borderTop: '2px solid #e9ecef' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#212529', marginBottom: '8px' }}>
                    ✨ Generated ATS-Friendly Resume
                  </h2>
                  <p style={{ color: '#6c757d', fontSize: '1rem' }}>
                    Your resume has been optimized and regenerated with improved ATS compatibility
                  </p>
                </div>

                {/* Overall Score Card for Generated Resume */}
                <div className="score-card" style={{ borderColor: getScoreColor(generatedAtsResult.overallScore) }}>
                  <div className="score-header">
                    <h2>New ATS Compatibility Score</h2>
                    <div className="score-circle" style={{ borderColor: getScoreColor(generatedAtsResult.overallScore) }}>
                      <span className="score-number" style={{ color: getScoreColor(generatedAtsResult.overallScore) }}>
                        {generatedAtsResult.overallScore}
                      </span>
                      <span className="score-label">/100</span>
                    </div>
                  </div>
                  <div className="score-status" style={{ color: getScoreColor(generatedAtsResult.overallScore) }}>
                    {getStatusIcon(generatedAtsResult.overallStatus)} {generatedAtsResult.overallStatus.toUpperCase()}
                  </div>
                  <p className="score-description">
                    {generatedAtsResult.overallScore >= 80 
                      ? "Excellent! Your generated resume is highly compatible with ATS systems!"
                      : generatedAtsResult.overallScore >= 70
                      ? "Good! Your generated resume is mostly ATS-friendly."
                      : generatedAtsResult.overallScore >= 60
                      ? "Your generated resume has improved ATS compatibility."
                      : "Your generated resume still needs some improvements for better ATS compatibility."}
                  </p>
                  {atsResult && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#495057' }}>
                        <strong>Previous Score:</strong> {atsResult.overallScore}/100 → <strong>New Score:</strong> {generatedAtsResult.overallScore}/100
                        {generatedAtsResult.overallScore > atsResult.overallScore && (
                          <span style={{ color: '#28a745', marginLeft: '8px' }}>
                            (Improved by {generatedAtsResult.overallScore - atsResult.overallScore} points!)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Breakdown Section for Generated Resume */}
                <div className="breakdown-section">
                  <h3>Generated Resume Breakdown</h3>
                  <div className="breakdown-grid">
                    {Object.entries(generatedAtsResult.breakdown).map(([key, value]) => (
                      <div key={key} className="breakdown-item">
                        <div className="breakdown-header">
                          <span className="breakdown-name">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="breakdown-score">
                            {value.score}/{value.max}
                          </span>
                        </div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-progress" 
                            style={{ 
                              width: `${(value.score / value.max) * 100}%`,
                              backgroundColor: getScoreColor((value.score / value.max) * 100)
                            }}
                          ></div>
                        </div>
                        <div className="breakdown-status">
                          {getStatusIcon(value.status)} {value.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons for Generated Resume */}
                <div className="action-buttons">
                  <button className="reset-btn" onClick={handleReset}>
                    Analyze Another Resume
                  </button>
                  <button 
                    className="generate-btn"
                    onClick={handleDownloadGeneratedResume}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Download Resume PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resume Builder Modal */}
      {showResumeBuilder && resumeData && (
        <ResumeBuilderModal
          resumeData={resumeData}
          setResumeData={setResumeData}
          onClose={() => setShowResumeBuilder(false)}
          student={student}
          onResumeGenerated={handleResumeGenerated}
        />
      )}
    </div>
  );
}


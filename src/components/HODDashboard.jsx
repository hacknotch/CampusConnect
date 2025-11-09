import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import './HODDashboard.css';

export default function HODDashboard() {
  const hod = JSON.parse(localStorage.getItem("hod")) || {};
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showAllSignups, setShowAllSignups] = useState(false);

  // Normalize department for matching
  const normalizeDepartment = (dept) => {
    if (!dept) return '';
    const deptLower = dept.toLowerCase().trim();
    if (deptLower.includes('cse') || 
        deptLower.includes('computer science') ||
        deptLower.includes('computer') ||
        deptLower === 'cs') {
      return 'cse';
    }
    return deptLower;
  };

  useEffect(() => {
    let unsubscribeRequests = null;
    let unsubscribeStudents = null;
    let unsubscribeApplications = null;

    const setupListeners = () => {
    try {
      const hodDepartment = hod.department || 'Computer Science';
        const hodDeptNormalized = normalizeDepartment(hodDepartment);

        // Fetch pending requests
        const requestsQuery = query(
        collection(db, 'hodRequests'),
        where('status', '==', 'pending')
      );

        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          const allRequests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const filteredRequests = allRequests.filter(request => {
            const requestDept = normalizeDepartment(request.department || request.branch);
            return requestDept === hodDeptNormalized;
          });

          setPendingRequests(filteredRequests);
        });

        // Fetch all students from the department
        const studentsQuery = query(collection(db, 'students'));
        unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
          const allStudentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const departmentStudents = allStudentsData.filter(student => {
            const studentDept = normalizeDepartment(student.department || student.branch);
            return studentDept === hodDeptNormalized;
          });

          setAllStudents(departmentStudents);
        });

        // Fetch applications
        const applicationsQuery = query(collection(db, 'applications'));
        unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
          const applicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
          console.log('📊 Real-time update: Applications:', applicationsData.length);
          console.log('📊 Application statuses:', applicationsData.map(app => ({
            studentId: app.studentId,
            company: app.companyName,
            status: app.status
          })));
          setApplications(applicationsData);
          setLoading(false);
        }, (error) => {
          console.error('Error in applications listener:', error);
          setLoading(false);
        });

    } catch (error) {
        console.error('Error setting up listeners:', error);
      setLoading(false);
    }
  };

    setupListeners();

    return () => {
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeApplications) unsubscribeApplications();
    };
  }, [hod.department]);

  // Filter applications by department students
  // Students document ID should match the studentId in applications (both use auth.currentUser.uid)
  const departmentStudentIds = new Set(allStudents.map(student => student.id));
  
  // Also match by email if studentId doesn't match (fallback)
  const departmentStudentEmails = new Set(allStudents.map(student => student.email).filter(Boolean));
  
  // Get applications for students in this department
  const departmentApplications = applications.filter(app => {
    // Primary match: studentId matches student document ID
    if (departmentStudentIds.has(app.studentId)) {
      return true;
    }
    // Fallback match: studentEmail matches
    if (app.studentEmail && departmentStudentEmails.has(app.studentEmail)) {
      return true;
    }
    return false;
  });
  
  console.log('📊 Data Debug:', {
    totalStudents: allStudents.length,
    totalApplications: applications.length,
    departmentStudentIds: Array.from(departmentStudentIds).slice(0, 5),
    departmentApplications: departmentApplications.length,
    sampleApplications: departmentApplications.slice(0, 3).map(app => ({
      studentId: app.studentId,
      studentEmail: app.studentEmail,
      company: app.companyName,
      status: app.status
    }))
  });

  // Calculate metrics based on application status
  const approvedApplications = departmentApplications.filter(app => 
    app.status === 'Approved'
  );
  
  const rejectedApplications = departmentApplications.filter(app => 
    app.status === 'Rejected'
  );
  
  // Get unique placed students (a student might have multiple approved applications)
  const placedStudentIds = new Set(approvedApplications.map(app => app.studentId));
  const studentsPlacedCount = placedStudentIds.size;
  
  // Get rejected student count (unique students)
  const rejectedStudentIds = new Set(rejectedApplications.map(app => app.studentId));
  
  // Calculate placement rate
  const placementRate = allStudents.length > 0 
    ? Math.round((studentsPlacedCount / allStudents.length) * 100)
    : 0;
  
  const metrics = {
    pendingApprovals: pendingRequests.length,
    totalStudents: allStudents.length,
    studentsPlaced: studentsPlacedCount,
    placementRate: placementRate
  };

  // Get company-wise placements (count unique students per company from approved applications)
  const companyPlacements = approvedApplications.reduce((acc, app) => {
    const company = app.companyName || 'Unknown';
    if (!acc[company]) {
      acc[company] = new Set();
    }
    acc[company].add(app.studentId); // Count unique students per company
    return acc;
  }, {});

  // Convert Sets to counts and sort
  const companyPlacementsCounts = Object.entries(companyPlacements).reduce((acc, [company, studentSet]) => {
    acc[company] = studentSet.size;
    return acc;
  }, {});

  const companyPlacementsArray = Object.entries(companyPlacementsCounts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxPlacements = companyPlacementsArray.length > 0 
    ? Math.max(...companyPlacementsArray.map(c => c.count))
    : 1;

  // Get placement status for chart
  const placedCount = metrics.studentsPlaced;
  const unplacedCount = Math.max(0, metrics.totalStudents - placedCount);
  
  // Calculate donut chart values
  const totalForChart = placedCount + unplacedCount;
  const placedPercentage = totalForChart > 0 ? (placedCount / totalForChart) * 100 : 0;
  const circumference = 2 * Math.PI * 50; // radius = 50

  console.log('📊 HOD Dashboard Final Metrics:', {
    pendingApprovals: metrics.pendingApprovals,
    totalStudents: metrics.totalStudents,
    studentsPlaced: metrics.studentsPlaced,
    placementRate: metrics.placementRate,
    companyPlacements: companyPlacementsArray,
    maxPlacements: maxPlacements,
    donutChart: {
      placed: placedCount,
      unplaced: unplacedCount,
      percentage: placedPercentage,
      circumference: circumference
    }
  });

  // Filter students for verification table
  const filteredStudents = allStudents.filter(student => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (student.name || '').toLowerCase().includes(search) ||
      (student.studentId || '').toLowerCase().includes(search) ||
      (student.email || '').toLowerCase().includes(search)
    );
  });

  const handleApprove = async (request) => {
    try {
      await updateDoc(doc(db, 'hodRequests', request.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: hod.name || 'HOD'
      });

      await updateDoc(doc(db, 'students', request.studentId), {
        approved: true,
        approvedAt: new Date().toISOString()
      });
      
      alert(`✅ Student ${request.studentName} approved successfully!`);
    } catch (error) {
      console.error('Error approving student:', error);
      alert('Error approving student. Please try again.');
    }
  };

  const handleReject = async (request) => {
    try {
      await updateDoc(doc(db, 'hodRequests', request.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: hod.name || 'HOD'
      });
      
      alert(`❌ Student ${request.studentName} request rejected.`);
    } catch (error) {
      console.error('Error rejecting student:', error);
      alert('Error rejecting student. Please try again.');
    }
  };

  const handleVerifyStudent = async (studentId) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        verified: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: hod.name || 'HOD'
      });
      alert('✅ Student verified successfully!');
    } catch (error) {
      console.error('Error verifying student:', error);
      alert('Error verifying student. Please try again.');
    }
  };

  const scrollToStudent = (studentId) => {
    const studentRow = document.getElementById(`student-row-${studentId}`);
    if (studentRow) {
      studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      studentRow.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        studentRow.style.backgroundColor = '';
      }, 2000);
    }
  };

  const handleExportReport = async () => {
    try {
      // Show loading state
      alert('⏳ Generating Excel report... Please wait.');

      // Fetch placement drives for company criteria
      const placementDrivesQuery = query(collection(db, 'placementDrives'));
      const placementDrivesSnapshot = await getDocs(placementDrivesQuery);
      const allPlacementDrives = placementDrivesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter placement drives to only active ones (or all if needed)
      const placementDrives = allPlacementDrives;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Student Profiles (export ALL students, not just filtered)
      const studentData = allStudents.map((student) => {
        const studentApplications = departmentApplications.filter(app => app.studentId === student.id);
        const hasApprovedApp = studentApplications.some(app => app.status === 'Approved');
        const hasRejectedApp = studentApplications.some(app => app.status === 'Rejected');
        
        let displayStatus = 'Pending';
        if (hasApprovedApp) {
          displayStatus = 'Placed';
        } else if (hasRejectedApp && !hasApprovedApp) {
          displayStatus = 'Rejected';
        } else if (student.verified || student.approved) {
          displayStatus = 'Verified';
        }

        return {
          'Student Name': student.name || 'N/A',
          'Student ID': student.studentId || student.email?.split('@')[0] || 'N/A',
          'Email': student.email || 'N/A',
          'Branch': student.branch || 'N/A',
          'Department': student.department || 'N/A',
          'CGPA': student.cgpa || 'N/A',
          'Year': student.year || 'N/A',
          'Skills': Array.isArray(student.skills) ? student.skills.join(', ') : (student.skills || 'N/A'),
          'Status': displayStatus,
          'Verified': student.verified || student.approved ? 'Yes' : 'No',
          'Approved Applications': studentApplications.filter(app => app.status === 'Approved').length,
          'Rejected Applications': studentApplications.filter(app => app.status === 'Rejected').length,
          'Total Applications': studentApplications.length
        };
      });

      const studentWorksheet = XLSX.utils.json_to_sheet(studentData);
      XLSX.utils.book_append_sheet(workbook, studentWorksheet, 'Student Profiles');

      // Sheet 2: Company List with Criteria
      const companyData = placementDrives.map((drive) => {
        // Get placement count for this company
        const companyApplications = departmentApplications.filter(app => 
          app.companyName === drive.companyName && app.status === 'Approved'
        );
        const placementCount = new Set(companyApplications.map(app => app.studentId)).size;

        return {
          'Company Name': drive.companyName || 'N/A',
          'Role Offered': drive.roleOffered || 'N/A',
          'Location': drive.location || 'N/A',
          'Salary (LPA)': drive.salaryOffered || 'N/A',
          'Minimum CGPA': drive.minCGPA || 'N/A',
          'Required Skills': Array.isArray(drive.requiredSkills) 
            ? drive.requiredSkills.join(', ') 
            : (drive.requiredSkills || 'N/A'),
          'Eligibility Criteria': drive.eligibilityCriteria || 'N/A',
          'Job Description': drive.jobDescription || 'N/A',
          'Status': drive.status || 'N/A',
          'Students Placed': placementCount,
          'Application Deadline': drive.applicationDeadline 
            ? new Date(drive.applicationDeadline).toLocaleDateString() 
            : 'N/A',
          'Created Date': drive.createdAt 
            ? new Date(drive.createdAt).toLocaleDateString() 
            : 'N/A'
        };
      });

      const companyWorksheet = XLSX.utils.json_to_sheet(companyData);
      XLSX.utils.book_append_sheet(workbook, companyWorksheet, 'Company Placements');

      // Sheet 3: Summary Statistics
      const summaryData = [
        { 'Metric': 'Total Students', 'Value': metrics.totalStudents },
        { 'Metric': 'Students Placed', 'Value': metrics.studentsPlaced },
        { 'Metric': 'Pending Approvals', 'Value': metrics.pendingApprovals },
        { 'Metric': 'Placement Rate (%)', 'Value': `${metrics.placementRate}%` },
        { 'Metric': 'Total Companies', 'Value': placementDrives.length },
        { 'Metric': 'Active Placements', 'Value': placementDrives.filter(d => d.status === 'active').length },
        { 'Metric': 'Department', 'Value': hod.department || 'Computer Science' },
        { 'Metric': 'Academic Year', 'Value': '2023-24' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Sheet 4: Company-wise Placements
      const companyPlacementData = companyPlacementsArray.map((item) => ({
        'Company': item.company,
        'Students Placed': item.count
      }));

      const companyPlacementWorksheet = XLSX.utils.json_to_sheet(companyPlacementData);
      XLSX.utils.book_append_sheet(workbook, companyPlacementWorksheet, 'Company-wise Stats');

      // Sheet 5: Student Applications
      const applicationData = departmentApplications.map((application) => {
        // Find student details
        const student = allStudents.find(s => s.id === application.studentId);
        
        return {
          'Student Name': application.studentName || student?.name || 'N/A',
          'Email': application.studentEmail || student?.email || 'N/A',
          'Branch': application.studentBranch || application.studentDepartment || student?.branch || student?.department || 'N/A',
          'CGPA': application.studentCGPA || student?.cgpa || 'N/A',
          'Company': application.companyName || 'N/A',
          'Role': application.roleOffered || 'N/A',
          'Applied Date': application.appliedAt 
            ? new Date(application.appliedAt).toLocaleDateString() 
            : (application.createdAt 
                ? new Date(application.createdAt).toLocaleDateString() 
                : 'N/A'),
          'Status': application.status || 'Applied',
          'Updated At': application.updatedAt 
            ? new Date(application.updatedAt).toLocaleDateString() 
            : 'N/A',
          'Updated By': application.updatedBy || 'N/A'
        };
      });

      // Sort applications by applied date (newest first)
      applicationData.sort((a, b) => {
        const dateA = a['Applied Date'] !== 'N/A' ? new Date(a['Applied Date']) : new Date(0);
        const dateB = b['Applied Date'] !== 'N/A' ? new Date(b['Applied Date']) : new Date(0);
        return dateB - dateA;
      });

      const applicationWorksheet = XLSX.utils.json_to_sheet(applicationData);
      XLSX.utils.book_append_sheet(workbook, applicationWorksheet, 'Student Applications');

      // Generate filename with timestamp
      const fileName = `HOD_Dashboard_Report_${hod.department || 'Department'}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      alert('✅ Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('❌ Error exporting report. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("hod");
      localStorage.removeItem("selectedRole");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'H';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };
  
  return (
    <div className="hod-dashboard">
      {/* Left Sidebar */}
      <div className="hod-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">CampusConnect</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveNav('reports')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3v14h14M7 7h6M7 11h4M7 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Reports</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="hod-profile">
            <div className="profile-avatar">
              {hod.profileImage ? (
                <img src={hod.profileImage} alt="Profile" />
              ) : (
                <span>{getInitials(hod.name)}</span>
              )}
            </div>
            <div className="profile-info">
              <div className="profile-name">{hod.name || 'Dr. Department Head'}</div>
              <div className="profile-role">HOD - {hod.department || 'Computer Science'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          Logout
        </button>
      </div>
        </div>
        
      {/* Main Content */}
      <div className="hod-main">
        {/* Header */}
        <div className="hod-header">
          <h1 className="page-title">Department Dashboard</h1>
          <div className="header-actions">
            <div className="academic-year">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v12H4V4zM4 8h12M8 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Academic Year 2023-24</span>
        </div>
            <button className="export-btn" onClick={handleExportReport}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v10m0 0L4 8m4 4l4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Report
            </button>
        </div>
      </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Pending Approvals</div>
            <div className="metric-value">{metrics.pendingApprovals}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Students</div>
            <div className="metric-value">{metrics.totalStudents}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Students Placed</div>
            <div className="metric-value">{metrics.studentsPlaced}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Placement Rate</div>
            <div className="metric-value placement-rate">{metrics.placementRate}%</div>
        </div>
      </div>

        {/* Middle Section */}
        <div className="dashboard-middle">
          {/* Action Required */}
          <div className="action-card">
            <div className="card-header">
              <h3 className="card-title">Action Required: Student Signups</h3>
            </div>
            <div className="student-signups-list">
              {(showAllSignups ? pendingRequests : pendingRequests.slice(0, 2)).map((request) => (
                <div key={request.id} className="signup-item">
                  <div className="student-avatar-small">
                    {request.studentName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
                  <div 
                    className="student-info-small"
                    onClick={() => scrollToStudent(request.studentId)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view student profile"
                  >
                    <div className="student-name-small">{request.studentName}</div>
                    <div className="student-id-small">ID: {request.studentId || request.studentEmail?.split('@')[0] || 'N/A'}</div>
            </div>
                  <div className="signup-actions">
                    <button 
                      className="reject-btn-small"
                      onClick={() => handleReject(request)}
                      title="Reject"
                    >
                      ✕
                    </button>
                    <button 
                      className="approve-btn-small"
                      onClick={() => handleApprove(request)}
                      title="Approve"
                    >
                      ✓
                    </button>
            </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="no-signups">No pending signups</div>
              )}
              {pendingRequests.length > 2 && !showAllSignups && (
                <button 
                  className="view-all-link"
                  onClick={() => setShowAllSignups(true)}
                >
                  View All
                </button>
              )}
              {showAllSignups && pendingRequests.length > 2 && (
                <button 
                  className="view-all-link"
                  onClick={() => setShowAllSignups(false)}
                >
                  Show Less
                </button>
              )}
          </div>
        </div>

          {/* Company-wise Placements */}
          <div className="chart-card">
            <div className="card-header">
              <h3 className="card-title">Company-wise Placements</h3>
              </div>
            <div className="bar-chart">
              {companyPlacementsArray.length > 0 ? (
                companyPlacementsArray.map((item, index) => (
                  <div key={index} className="bar-chart-item">
                    <div className="bar-label">{item.company}</div>
                    <div className="bar-container">
                      <div 
                        className="bar" 
                        style={{ width: `${(item.count / maxPlacements) * 100}%` }}
                      ></div>
              </div>
                    <div className="bar-value">{item.count}</div>
            </div>
                ))
              ) : (
                <div className="no-data">No placement data available</div>
              )}
              </div>
            </div>

          {/* Overall Placement Status */}
          <div className="chart-card">
            <div className="card-header">
              <h3 className="card-title">Overall Placement Status</h3>
            </div>
            <div className="donut-chart-container">
              <svg className="donut-chart" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e9ecef"
                  strokeWidth="20"
                />
                {placedCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#0d6efd"
                    strokeWidth="20"
                    strokeDasharray={`${(placedPercentage / 100) * circumference} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                  />
                )}
                <text x="60" y="60" textAnchor="middle" className="donut-text" dy=".3em">
                  {metrics.totalStudents > 0 ? metrics.placementRate : 0}%
                </text>
              </svg>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-dot placed"></span>
                  <span>Placed</span>
              </div>
                <div className="legend-item">
                  <span className="legend-dot unplaced"></span>
                  <span>Unplaced</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Student Profiles Table */}
        <div className="students-table-card">
          <div className="table-header">
            <h3 className="card-title">Student Profiles for Verification</h3>
            <div className="search-container">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM13 13l-2.35-2.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name or ID..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
                      </div>
                    </div>
          <div className="table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>STUDENT NAME</th>
                  <th>STUDENT ID</th>
                  <th>CGPA</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="loading-cell">Loading students...</td>
                  </tr>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const isVerified = student.verified || student.approved;
                    const isPending = !isVerified && pendingRequests.some(req => req.studentId === student.id);
                    
                    // Check application status for this student
                    const studentApplications = departmentApplications.filter(app => app.studentId === student.id);
                    const hasApprovedApp = studentApplications.some(app => app.status === 'Approved');
                    const hasRejectedApp = studentApplications.some(app => app.status === 'Rejected');
                    
                    // Determine display status
                    let displayStatus = 'Pending';
                    let statusClass = 'pending';
                    if (hasApprovedApp) {
                      displayStatus = 'Placed';
                      statusClass = 'placed';
                    } else if (hasRejectedApp && !hasApprovedApp) {
                      displayStatus = 'Rejected';
                      statusClass = 'rejected';
                    } else if (isVerified) {
                      displayStatus = 'Verified';
                      statusClass = 'verified';
                    }
                    
                    return (
                      <tr 
                        key={student.id} 
                        id={`student-row-${student.id}`}
                        className="student-row"
                      >
                        <td>
                          <div 
                            className="student-name-cell"
                            onClick={() => scrollToStudent(student.id)}
                            style={{ cursor: 'pointer' }}
                            title="Click to highlight"
                          >
                            <div className="student-avatar-table">
                              {student.name?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                            {student.name || 'N/A'}
                      </div>
                        </td>
                        <td>{student.studentId || student.email?.split('@')[0] || 'N/A'}</td>
                        <td>{student.cgpa || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {displayStatus}
                        </span>
                        </td>
                        <td>
                    <button
                            className="view-verify-btn"
                            onClick={() => {
                              scrollToStudent(student.id);
                              handleVerifyStudent(student.id);
                            }}
                            disabled={isVerified || hasApprovedApp}
                          >
                            {hasApprovedApp ? 'Placed' : isVerified ? 'Verified' : 'View/Verify'}
                    </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data-cell">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

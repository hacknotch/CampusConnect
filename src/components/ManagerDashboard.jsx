import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { collection, query, orderBy, updateDoc, doc, onSnapshot, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "../config/emailjs";
import { TEST_MODE, mockEmailSend } from "../config/testMode";
import * as XLSX from 'xlsx';
import './ManagerDashboard.css';

export default function ManagerDashboard() {
  const manager = JSON.parse(localStorage.getItem("manager")) || {};
  const navigate = useNavigate();
  const [placementDrives, setPlacementDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDrives = null;
    let unsubscribeApplications = null;
    let unsubscribeStudents = null;

    // Set up real-time listener for placement drives
    const setupDrivesListener = () => {
      try {
        const drivesQuery = query(
          collection(db, 'placementDrives'),
          orderBy('createdAt', 'desc')
        );

        unsubscribeDrives = onSnapshot(drivesQuery, (snapshot) => {
          const drivesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('📊 Real-time update: Placement drives:', drivesList.length);
          setPlacementDrives(drivesList);
        }, (error) => {
          console.error('Error in drives listener:', error);
          // If orderBy fails, use simple collection query
          if (error.code === 'failed-precondition') {
            const simpleQuery = collection(db, 'placementDrives');
            unsubscribeDrives = onSnapshot(simpleQuery, (snapshot) => {
              const drivesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              drivesList.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
              });
              setPlacementDrives(drivesList);
            });
          }
        });
      } catch (error) {
        console.error('Error setting up drives listener:', error);
      }
    };

    // Set up real-time listener for applications
    const setupApplicationsListener = async () => {
      try {
        const applicationsQuery = query(
          collection(db, 'applications'),
          orderBy('appliedAt', 'desc')
        );
        
        unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
          const applicationsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setApplications(applicationsList);
        });
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };

    // Fetch all students
    const fetchStudents = async () => {
      try {
        const studentsQuery = query(collection(db, 'students'));
        unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
          const studentsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setAllStudents(studentsList);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
      }
    };

    setupDrivesListener();
    setupApplicationsListener();
    fetchStudents();

    return () => {
      if (unsubscribeDrives) unsubscribeDrives();
      if (unsubscribeApplications) unsubscribeApplications();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, []);

  // Calculate metrics
  const metrics = {
    totalStudents: allStudents.length,
    activeJobs: placementDrives.filter(drive => drive.status === 'active').length,
    totalApplications: applications.length
  };

  // Get application count per drive
  const getApplicationCount = (driveId) => {
    return applications.filter(app => app.driveId === driveId).length;
  };

  // Get drive status for display
  const getDriveStatus = (drive) => {
    if (drive.status === 'closed') return { text: 'Closed', class: 'closed' };
    if (drive.status === 'active') {
      // Check if deadline has passed
      if (drive.applicationDeadline) {
        const deadline = new Date(drive.applicationDeadline);
        const now = new Date();
        if (deadline < now) {
          return { text: 'Closed', class: 'closed' };
        }
      }
      // Check if interviews are happening
      if (drive.interviewDate) {
        const interviewDate = new Date(drive.interviewDate);
        const now = new Date();
        if (interviewDate <= now && interviewDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
          return { text: 'Interviewing', class: 'interviewing' };
        }
      }
      return { text: 'Open', class: 'open' };
    }
    return { text: drive.status || 'Open', class: 'open' };
  };

  // Handle application status updates
  const handleStatusChange = async (appId, newStatus, studentEmail, companyName, studentName) => {
    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: manager.name || 'Placement Manager'
      });

      const emailParams = {
        to_email: studentEmail,
        to_name: studentName,
        company_name: companyName,
        status: newStatus,
        message: `Your application for ${companyName} has been ${newStatus}. Please check the placement portal for more details.`,
        from_name: 'Placement Cell'
      };

      console.log('📧 Sending email with params:', emailParams);

      const isEmailJSConfigured = !(EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' || 
                                   EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
                                   EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY');

      if (TEST_MODE.enabled || !isEmailJSConfigured) {
        try {
          await mockEmailSend(emailParams);
          alert(`✅ Status updated to "${newStatus}"!\n\n📧 ${TEST_MODE.enabled ? 'Test email sent (check console)' : 'Email notifications not configured - using test mode'}`);
        } catch (error) {
          alert(`✅ Status updated to "${newStatus}"!\n\n⚠️ Mock email failed (this is just for testing)`);
        }
      } else {
        try {
          const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            emailParams,
            EMAILJS_CONFIG.PUBLIC_KEY
          );

          console.log('✅ EmailJS Response:', response);
          alert(`✅ Status updated to "${newStatus}"!\n\n📧 Email sent to: ${studentEmail}`);
        } catch (emailError) {
          console.error('❌ Email sending failed:', emailError);
          alert(`✅ Status updated to "${newStatus}"!\n\n⚠️ Email notification failed. Please check EmailJS configuration.`);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Error updating status. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("manager");
      localStorage.removeItem("selectedRole");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'PM';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Handle export report (same structure as HOD report)
  const handleExportReport = async () => {
    try {
      // Show loading state
      alert('⏳ Generating Excel report... Please wait.');

      // Fetch placement drives for company criteria (explicitly fetch to ensure we have all data)
      const placementDrivesQuery = query(collection(db, 'placementDrives'));
      const placementDrivesSnapshot = await getDocs(placementDrivesQuery);
      const allPlacementDrives = placementDrivesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Export all placement drives
      const placementDrives = allPlacementDrives;

      // Explicitly fetch applications to ensure we have all data
      const applicationsQuery = query(collection(db, 'applications'));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const allApplications = applicationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📊 Export: Total applications fetched:', allApplications.length);

      // Explicitly fetch students to ensure we have all data
      const studentsQuery = query(collection(db, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📊 Export: Total students fetched:', allStudentsData.length);

      // Calculate metrics using explicitly fetched data
      const approvedApplications = allApplications.filter(app => app.status === 'Approved');
      const rejectedApplications = allApplications.filter(app => app.status === 'Rejected');
      const placedStudentIds = new Set(approvedApplications.map(app => app.studentId));
      const studentsPlacedCount = placedStudentIds.size;
      const placementRate = allStudentsData.length > 0 
        ? Math.round((studentsPlacedCount / allStudentsData.length) * 100)
        : 0;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Student Profiles (export ALL students)
      const studentData = allStudentsData.map((student) => {
        // Match applications by studentId or email
        const studentApplications = allApplications.filter(app => {
          if (app.studentId === student.id) return true;
          if (app.studentEmail && student.email && app.studentEmail === student.email) return true;
          return false;
        });
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
        const companyApplications = allApplications.filter(app => 
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

      // Sheet 3: Summary Statistics (matching HOD format)
      const summaryData = [
        { 'Metric': 'Total Students', 'Value': allStudentsData.length },
        { 'Metric': 'Students Placed', 'Value': studentsPlacedCount },
        { 'Metric': 'Pending Approvals', 'Value': 0 }, // TPO doesn't have pending approvals, but keeping structure same
        { 'Metric': 'Placement Rate (%)', 'Value': `${placementRate}%` },
        { 'Metric': 'Total Companies', 'Value': placementDrives.length },
        { 'Metric': 'Active Placements', 'Value': placementDrives.filter(d => d.status === 'active').length },
        { 'Metric': 'Total Applications', 'Value': allApplications.length },
        { 'Metric': 'Department', 'Value': 'All Departments' }, // TPO sees all departments
        { 'Metric': 'Academic Year', 'Value': '2023-24' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Sheet 4: Company-wise Placements
      const companyPlacements = approvedApplications.reduce((acc, app) => {
        const company = app.companyName || 'Unknown';
        if (!acc[company]) {
          acc[company] = new Set();
        }
        // Use studentId or email as unique identifier
        const studentIdentifier = app.studentId || app.studentEmail || 'unknown';
        acc[company].add(studentIdentifier);
        return acc;
      }, {});

      const companyPlacementsArray = Object.entries(companyPlacements)
        .map(([company, studentSet]) => ({ company, count: studentSet.size }))
        .sort((a, b) => b.count - a.count);

      const companyPlacementData = companyPlacementsArray.map((item) => ({
        'Company': item.company,
        'Students Placed': item.count
      }));

      const companyPlacementWorksheet = XLSX.utils.json_to_sheet(companyPlacementData);
      XLSX.utils.book_append_sheet(workbook, companyPlacementWorksheet, 'Company-wise Stats');

      // Sheet 5: Student Applications (using explicitly fetched data)
      const applicationData = allApplications.map((application) => {
        // Find student by ID first, then by email as fallback
        let student = allStudentsData.find(s => s.id === application.studentId);
        if (!student && application.studentEmail) {
          student = allStudentsData.find(s => s.email === application.studentEmail);
        }
        
        // Extract data from application first, then fallback to student data
        const studentName = application.studentName || 
                           (application.applicationData?.firstName && application.applicationData?.lastName 
                             ? `${application.applicationData.firstName} ${application.applicationData.lastName}` 
                             : null) ||
                           student?.name || 'N/A';
        
        const studentEmail = application.studentEmail || student?.email || 'N/A';
        const studentBranch = application.studentBranch || 
                             application.studentDepartment || 
                             application.applicationData?.department ||
                             student?.branch || 
                             student?.department || 'N/A';
        const studentCGPA = application.studentCGPA || 
                           application.applicationData?.cgpa ||
                           student?.cgpa || 'N/A';
        const studentSkills = application.studentSkills || 
                             application.applicationData?.skills ||
                             (Array.isArray(student?.skills) ? student.skills.join(', ') : student?.skills) || 'N/A';
        
        return {
          'Student Name': studentName,
          'Email': studentEmail,
          'Branch': studentBranch,
          'Department': application.studentDepartment || studentBranch,
          'CGPA': studentCGPA,
          'Skills': studentSkills,
          'Company': application.companyName || 'N/A',
          'Role': application.roleOffered || 'N/A',
          'Location': placementDrives.find(d => d.companyName === application.companyName)?.location || 'N/A',
          'Salary (LPA)': placementDrives.find(d => d.companyName === application.companyName)?.salaryOffered || 'N/A',
          'Applied Date': application.appliedAt 
            ? new Date(application.appliedAt).toLocaleDateString() 
            : (application.createdAt 
                ? new Date(application.createdAt).toLocaleDateString() 
                : 'N/A'),
          'Status': application.status || 'Applied',
          'Resume File': application.resumeFileName || 'N/A',
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

      // Generate filename with timestamp (renamed for TPO)
      const fileName = `TPO_Dashboard_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write and download
      XLSX.writeFile(workbook, fileName);
      
      alert('✅ Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('❌ Error exporting report. Please try again.');
    }
  };

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="manager-header">
        <h1 className="welcome-text">Welcome, {manager?.email?.split('@')[0] || manager?.name || 'Placement Manager'}</h1>
        <div className="header-actions">
          <button className="export-btn" onClick={handleExportReport}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v10m0 0L4 8m4 4l4-4M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Report
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-section">
        <div className="metric-card">
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{metrics.totalStudents}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Jobs</div>
          <div className="metric-value">{metrics.activeJobs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Applications</div>
          <div className="metric-value">{metrics.totalApplications}</div>
        </div>
        <div className="profile-card">
          <div className="profile-avatar-large">
            {manager.profileImage ? (
              <img src={manager.profileImage} alt="Profile" />
            ) : (
              <span>{getInitials(manager.name)}</span>
            )}
          </div>
          <div className="profile-details">
            <div className="profile-name-large">{manager.name || 'Placement Manager'}</div>
            <div className="profile-role-large">Placement Manager</div>
            <div className="profile-email">{manager.email || 'manager@university.edu'}</div>
            <div className="profile-id">Employee ID: {manager.employeeId || 'TPO-001'}</div>
            <div className="profile-phone">{manager.phone || '+91 98765 43210'}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button 
            className="action-btn"
            onClick={() => navigate('/manager/add-drive')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Add Drive</span>
          </button>
          <button 
            className="action-btn"
            onClick={() => {
              // Scroll to applications section
              document.querySelector('.applications-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>View Apps</span>
          </button>
          <button className="action-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18M7 16l4-8 4 8M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Reports</span>
          </button>
          <button className="action-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a1 1 0 0 0-1 1v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Companies</span>
          </button>
        </div>
      </div>

      {/* Placement Drives Table */}
      <div className="drives-section">
        <div className="section-header">
          <h2 className="section-title">Placement Drives</h2>
          <div className="total-drives">Total Drives: {placementDrives.length}</div>
        </div>
        
        {loading ? (
          <div className="loading-state">Loading placement drives...</div>
        ) : placementDrives.length > 0 ? (
          <div className="table-container">
            <table className="drives-table">
              <thead>
                <tr>
                  <th>COMPANY</th>
                  <th>ROLE</th>
                  <th>SALARY</th>
                  <th>CGPA</th>
                  <th>LOCATION</th>
                  <th>DEADLINE</th>
                  <th>STATUS</th>
                  <th>APPLICATIONS</th>
                </tr>
              </thead>
              <tbody>
                {placementDrives.map((drive) => {
                  const statusInfo = getDriveStatus(drive);
                  const appCount = getApplicationCount(drive.id);
                  
                  return (
                    <tr key={drive.id}>
                      <td className="company-cell">{drive.companyName}</td>
                      <td>{drive.roleOffered}</td>
                      <td className="salary-cell">₹{drive.salaryOffered || 'N/A'} LPA</td>
                      <td className="cgpa-cell">{drive.cgpaCriteria ? `${drive.cgpaCriteria}+` : 'N/A'}</td>
                      <td>{drive.location || 'Not specified'}</td>
                      <td>{formatDate(drive.applicationDeadline)}</td>
                      <td>
                        <span className={`status-tag ${statusInfo.class}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="applications-cell">{appCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No placement drives added yet</p>
            <button 
              className="add-first-drive-btn"
              onClick={() => navigate('/manager/add-drive')}
            >
              Add Your First Placement Drive
            </button>
          </div>
        )}
      </div>

      {/* Student Applications Section */}
      <div className="applications-section">
        <div className="section-header">
          <h2 className="section-title">Student Applications</h2>
          {!TEST_MODE.enabled && !(EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' || 
            EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
            EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') && (
            <div className="email-status">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" fill="#28a745"/>
                <path d="M7 11l4-4-1-1-3 3-1.5-1.5-1 1L7 11z" fill="#28a745"/>
              </svg>
              <span>Email notifications enabled</span>
            </div>
          )}
        </div>
        
        {applications.length > 0 ? (
          <div className="table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>CGPA</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="application-row">
                    <td className="student-name-cell">{application.studentName}</td>
                    <td>{application.studentEmail}</td>
                    <td>{application.studentBranch || application.studentDepartment}</td>
                    <td className="cgpa-cell">{application.studentCGPA || 'N/A'}</td>
                    <td className="company-cell">{application.companyName}</td>
                    <td>{application.roleOffered}</td>
                    <td>{application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-tag status-${application.status?.toLowerCase().replace(' ', '-')}`}>
                        {application.status || 'Applied'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleStatusChange(
                            application.id, 
                            'Approved', 
                            application.studentEmail, 
                            application.companyName,
                            application.studentName
                          )}
                          disabled={application.status === 'Approved'}
                          className={`status-btn approve-btn ${application.status === 'Approved' ? 'disabled' : ''}`}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(
                            application.id, 
                            'Rejected', 
                            application.studentEmail, 
                            application.companyName,
                            application.studentName
                          )}
                          disabled={application.status === 'Rejected'}
                          className={`status-btn reject-btn ${application.status === 'Rejected' ? 'disabled' : ''}`}
                        >
                          ❌ Reject
                        </button>
                        <button
                          onClick={() => handleStatusChange(
                            application.id, 
                            'On Hold', 
                            application.studentEmail, 
                            application.companyName,
                            application.studentName
                          )}
                          disabled={application.status === 'On Hold'}
                          className={`status-btn hold-btn ${application.status === 'On Hold' ? 'disabled' : ''}`}
                        >
                          ⏸️ Hold
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No applications received yet</p>
            <p className="empty-subtext">Students will appear here when they apply to placement drives</p>
          </div>
        )}
      </div>

      {/* Email Configuration Warning */}
      {TEST_MODE.enabled && (
        <div className="info-banner test-mode">
          <div className="banner-content">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" fill="#0d6efd"/>
            </svg>
            <div>
              <strong>Test Mode Enabled</strong>
              <p>Status updates work normally. Email notifications are simulated (check browser console).</p>
            </div>
          </div>
        </div>
      )}

      {!TEST_MODE.enabled && (EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' || 
        EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
        EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY') && (
        <div className="info-banner warning">
          <div className="banner-content">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" fill="#856404"/>
            </svg>
            <div>
              <strong>Email Notifications Not Configured</strong>
              <p>Status updates work, but email notifications are disabled. See EMAILJS_SETUP.md for setup instructions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

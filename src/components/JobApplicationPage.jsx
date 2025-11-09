import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db, storage } from "../firebase/config";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./JobApplicationPage.css";

export default function JobApplicationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const drive = location.state?.drive;

  const student = JSON.parse(localStorage.getItem("student"));

  const [formData, setFormData] = useState({
    firstName: student?.name?.split(' ')[0] || '',
    lastName: student?.lastName || student?.name?.split(' ').slice(1).join(' ') || '',
    department: student?.department || student?.branch || '',
    cgpa: student?.cgpa || '',
    skills: student?.skills || '',
    email: student?.email || '',
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    const checkApplication = async () => {
      if (!drive || !auth.currentUser) return;

      try {
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('driveId', '==', drive.id),
          where('studentId', '==', auth.currentUser.uid)
        );

        const querySnapshot = await getDocs(applicationsQuery);
        if (!querySnapshot.empty) {
          setAlreadyApplied(true);
          setError('⚠️ You have already applied to this drive! Please go back to the dashboard.');
        }
      } catch (err) {
        console.error('Error checking application:', err);
      }
    };

    checkApplication();
  }, [drive]);

  useEffect(() => {
    if (!drive) {
      navigate('/student/dashboard');
    }
  }, [drive, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setResumeFile(file);
      setResumeFileName(file.name);
      setError('');
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.firstName.trim()) {
      errors.push('First Name is required');
    }

    if (!formData.lastName.trim()) {
      errors.push('Last Name is required');
    }

    if (!formData.department.trim()) {
      errors.push('Department is required');
    }

    if (!formData.cgpa.trim()) {
      errors.push('CGPA is required');
    } else {
      const cgpaValue = parseFloat(formData.cgpa);
      if (isNaN(cgpaValue) || cgpaValue < 0 || cgpaValue > 10) {
        errors.push('CGPA must be a number between 0 and 10');
      }
    }

    if (!formData.skills.trim()) {
      errors.push('Skills are required');
    }

    if (!resumeFile) {
      errors.push('Resume upload is required');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (alreadyApplied) {
      setError('⚠️ You have already applied to this drive! Please go back to the dashboard.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please login to apply');
        setLoading(false);
        return;
      }

      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError('Please fill in all required fields:\n• ' + validationErrors.join('\n• '));
        setLoading(false);
        return;
      }

      setUploading(true);

      const resumeRef = ref(storage, `resumes/${user.uid}/${drive.id}_${Date.now()}_${resumeFile.name}`);
      await uploadBytes(resumeRef, resumeFile);
      const resumeUrl = await getDownloadURL(resumeRef);

      setUploading(false);

      await addDoc(collection(db, 'applications'), {
        driveId: drive.id,
        studentId: user.uid,
        studentName: `${formData.firstName} ${formData.lastName}`,
        studentEmail: formData.email,
        studentBranch: formData.department,
        studentDepartment: formData.department,
        studentCGPA: formData.cgpa,
        studentSkills: formData.skills,
        companyName: drive.companyName,
        roleOffered: drive.roleOffered,
        resumeUrl: resumeUrl,
        resumeFileName: resumeFileName,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        applicationData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          department: formData.department,
          cgpa: formData.cgpa,
          skills: formData.skills,
        }
      });

      alert('✅ Application submitted successfully!');
      navigate('/student/dashboard');
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Error submitting application. Please try again.');
      setUploading(false);
      setLoading(false);
    }
  };

  if (!drive) {
    return null;
  }

  return (
    <div className="job-application-page">
      <div className="application-container">
        <div className="application-header">
          <h1>Applying for {drive.companyName}</h1>
          <p className="role-text">Role: {drive.roleOffered}</p>
        </div>

        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-section">
            <h2>Personal Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled
                className="disabled-input"
              />
              <span className="field-note">Email cannot be changed</span>
            </div>
          </div>

          <div className="form-section">
            <h2>Academic Information</h2>

            <div className="form-group">
              <label htmlFor="department">Department *</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                placeholder="Enter your department (e.g., CSE, ECE, ME)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cgpa">CGPA *</label>
              <input
                type="number"
                id="cgpa"
                name="cgpa"
                value={formData.cgpa}
                onChange={handleInputChange}
                required
                min="0"
                max="10"
                step="0.01"
                placeholder="Enter your CGPA (e.g., 8.5)"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Skills</h2>

            <div className="form-group">
              <label htmlFor="skills">Skills *</label>
              <textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder="Enter your skills separated by commas (e.g., JavaScript, Python, React, Node.js)"
              />
              <span className="field-note">Separate multiple skills with commas</span>
            </div>
          </div>

          <div className="form-section">
            <h2>Resume</h2>

            <div className="form-group">
              <label htmlFor="resume">Upload Resume *</label>
              <div className="file-upload-container">
                <input
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="resume" className="file-label">
                  {resumeFileName ? (
                    <span className="file-name">📄 {resumeFileName}</span>
                  ) : (
                    <span className="file-placeholder">📎 Choose File (PDF, DOC, DOCX - Max 5MB)</span>
                  )}
                </label>
              </div>
              <span className="field-note">Accepted formats: PDF, DOC, DOCX. Maximum file size: 5MB</span>
            </div>
          </div>

          {error && (
            <div className={`error-message ${error.includes('⚠️') ? 'warning-message' : ''}`}>
              {error.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="btn-cancel"
              disabled={loading || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || uploading || alreadyApplied}
            >
              {uploading ? 'Uploading Resume...' : loading ? 'Submitting...' : alreadyApplied ? 'Already Applied' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


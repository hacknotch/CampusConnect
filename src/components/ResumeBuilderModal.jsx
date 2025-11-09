import React, { useState, useEffect } from 'react';
import { generateResumePDF } from '../utils/resumeGenerator';
import './ResumeBuilderModal.css';

export default function ResumeBuilderModal({ resumeData, setResumeData, onClose, student, onResumeGenerated }) {
  const [localData, setLocalData] = useState(resumeData);
  const [activeSection, setActiveSection] = useState('personal');

  useEffect(() => {
    setLocalData(resumeData);
  }, [resumeData]);

  const handleFieldChange = (section, field, value, index = null) => {
    setLocalData(prev => {
      const newData = { ...prev };
      if (index !== null) {
        if (Array.isArray(newData[section])) {
          newData[section] = [...newData[section]];
          newData[section][index] = { ...newData[section][index], [field]: value };
        }
      } else if (section === 'personalInfo') {
        newData.personalInfo = { ...newData.personalInfo, [field]: value };
      } else {
        newData[section] = value;
      }
      return newData;
    });
  };

  const addArrayItem = (section, template) => {
    setLocalData(prev => ({
      ...prev,
      [section]: [...prev[section], { ...template }]
    }));
  };

  const removeArrayItem = (section, index) => {
    setLocalData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = () => {
    // Validate required fields
    if (!localData.personalInfo.name || !localData.personalInfo.email) {
      alert('Please fill in at least Name and Email in Personal Information section.');
      return;
    }

    setResumeData(localData);
    const fileName = `${localData.personalInfo.name || 'resume'}_ATS_Resume.pdf`.replace(/[^a-z0-9]/gi, '_');
    
    // Generate PDF and get resume text
    const generatedText = generateResumePDF(localData, fileName);
    
    // Call callback with generated text and filename
    if (onResumeGenerated) {
      onResumeGenerated(generatedText, fileName);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resume Builder - Review & Edit Information</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="builder-sidebar">
            <button 
              className={activeSection === 'personal' ? 'active' : ''}
              onClick={() => setActiveSection('personal')}
            >
              Personal Info
            </button>
            <button 
              className={activeSection === 'summary' ? 'active' : ''}
              onClick={() => setActiveSection('summary')}
            >
              Summary
            </button>
            <button 
              className={activeSection === 'education' ? 'active' : ''}
              onClick={() => setActiveSection('education')}
            >
              Education
            </button>
            <button 
              className={activeSection === 'experience' ? 'active' : ''}
              onClick={() => setActiveSection('experience')}
            >
              Experience
            </button>
            <button 
              className={activeSection === 'skills' ? 'active' : ''}
              onClick={() => setActiveSection('skills')}
            >
              Skills
            </button>
            <button 
              className={activeSection === 'projects' ? 'active' : ''}
              onClick={() => setActiveSection('projects')}
            >
              Projects
            </button>
            <button 
              className={activeSection === 'certifications' ? 'active' : ''}
              onClick={() => setActiveSection('certifications')}
            >
              Certifications
            </button>
            <button 
              className={activeSection === 'achievements' ? 'active' : ''}
              onClick={() => setActiveSection('achievements')}
            >
              Achievements
            </button>
          </div>

          <div className="builder-main">
            {activeSection === 'personal' && (
              <div className="builder-section">
                <h3>Personal Information</h3>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={localData.personalInfo?.name || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={localData.personalInfo?.email || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'email', e.target.value)}
                    placeholder="john.doe@email.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={localData.personalInfo?.phone || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    value={localData.personalInfo?.linkedIn || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'linkedIn', e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={localData.personalInfo?.website || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'website', e.target.value)}
                    placeholder="https://johndoe.com"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={localData.personalInfo?.address || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'address', e.target.value)}
                    placeholder="City, State, Country"
                  />
                </div>
              </div>
            )}

            {activeSection === 'summary' && (
              <div className="builder-section">
                <h3>Professional Summary</h3>
                <div className="form-group">
                  <label>Summary</label>
                  <textarea
                    value={localData.summary || ''}
                    onChange={(e) => handleFieldChange('summary', '', e.target.value)}
                    placeholder="Write a brief professional summary (2-3 sentences)"
                    rows={5}
                  />
                </div>
              </div>
            )}

            {activeSection === 'education' && (
              <div className="builder-section">
                <h3>Education</h3>
                {(localData.education || []).map((edu, index) => (
                  <div key={index} className="array-item">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Degree *</label>
                        <input
                          type="text"
                          value={edu.degree || ''}
                          onChange={(e) => handleFieldChange('education', 'degree', e.target.value, index)}
                          placeholder="Bachelor of Technology in Computer Science"
                        />
                      </div>
                      <div className="form-group">
                        <label>Institution *</label>
                        <input
                          type="text"
                          value={edu.institution || ''}
                          onChange={(e) => handleFieldChange('education', 'institution', e.target.value, index)}
                          placeholder="University Name"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          value={edu.location || ''}
                          onChange={(e) => handleFieldChange('education', 'location', e.target.value, index)}
                          placeholder="City, State"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="text"
                          value={edu.date || ''}
                          onChange={(e) => handleFieldChange('education', 'date', e.target.value, index)}
                          placeholder="MM/YYYY - MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>GPA</label>
                      <input
                        type="text"
                        value={edu.gpa || ''}
                        onChange={(e) => handleFieldChange('education', 'gpa', e.target.value, index)}
                        placeholder="3.8/4.0"
                      />
                    </div>
                    {(localData.education || []).length > 1 && (
                      <button className="remove-btn" onClick={() => removeArrayItem('education', index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-btn" onClick={() => addArrayItem('education', { degree: '', institution: '', location: '', date: '', gpa: '' })}>
                  + Add Education
                </button>
              </div>
            )}

            {activeSection === 'experience' && (
              <div className="builder-section">
                <h3>Professional Experience</h3>
                {(localData.experience || []).map((exp, index) => (
                  <div key={index} className="array-item">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Job Title *</label>
                        <input
                          type="text"
                          value={exp.title || ''}
                          onChange={(e) => handleFieldChange('experience', 'title', e.target.value, index)}
                          placeholder="Software Developer"
                        />
                      </div>
                      <div className="form-group">
                        <label>Company *</label>
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => handleFieldChange('experience', 'company', e.target.value, index)}
                          placeholder="Company Name"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          value={exp.location || ''}
                          onChange={(e) => handleFieldChange('experience', 'location', e.target.value, index)}
                          placeholder="City, State"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="text"
                          value={exp.date || ''}
                          onChange={(e) => handleFieldChange('experience', 'date', e.target.value, index)}
                          placeholder="MM/YYYY - MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description (one per line)</label>
                      <textarea
                        value={Array.isArray(exp.description) ? exp.description.join('\n') : (exp.description || '')}
                        onChange={(e) => handleFieldChange('experience', 'description', e.target.value.split('\n').filter(line => line.trim()), index)}
                        placeholder="• Developed and maintained web applications&#10;• Collaborated with team members"
                        rows={4}
                      />
                    </div>
                    {(localData.experience || []).length > 1 && (
                      <button className="remove-btn" onClick={() => removeArrayItem('experience', index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-btn" onClick={() => addArrayItem('experience', { title: '', company: '', location: '', date: '', description: [''] })}>
                  + Add Experience
                </button>
              </div>
            )}

            {activeSection === 'skills' && (
              <div className="builder-section">
                <h3>Skills</h3>
                <div className="form-group">
                  <label>Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(localData.skills) ? localData.skills.join(', ') : (localData.skills || '')}
                    onChange={(e) => handleFieldChange('skills', '', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                    placeholder="JavaScript, React, Node.js, Python, SQL"
                  />
                </div>
              </div>
            )}

            {activeSection === 'projects' && (
              <div className="builder-section">
                <h3>Projects</h3>
                {(localData.projects || []).map((project, index) => (
                  <div key={index} className="array-item">
                    <div className="form-group">
                      <label>Project Name *</label>
                      <input
                        type="text"
                        value={project.name || ''}
                        onChange={(e) => handleFieldChange('projects', 'name', e.target.value, index)}
                        placeholder="E-Commerce Website"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Technologies</label>
                        <input
                          type="text"
                          value={project.technologies || ''}
                          onChange={(e) => handleFieldChange('projects', 'technologies', e.target.value, index)}
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="text"
                          value={project.date || ''}
                          onChange={(e) => handleFieldChange('projects', 'date', e.target.value, index)}
                          placeholder="MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={project.description || ''}
                        onChange={(e) => handleFieldChange('projects', 'description', e.target.value, index)}
                        placeholder="Brief description of the project"
                        rows={3}
                      />
                    </div>
                    {(localData.projects || []).length > 1 && (
                      <button className="remove-btn" onClick={() => removeArrayItem('projects', index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-btn" onClick={() => addArrayItem('projects', { name: '', description: '', technologies: '', date: '' })}>
                  + Add Project
                </button>
              </div>
            )}

            {activeSection === 'certifications' && (
              <div className="builder-section">
                <h3>Certifications</h3>
                {(localData.certifications || []).map((cert, index) => (
                  <div key={index} className="array-item">
                    <div className="form-group">
                      <label>Certification Name *</label>
                      <input
                        type="text"
                        value={cert.name || ''}
                        onChange={(e) => handleFieldChange('certifications', 'name', e.target.value, index)}
                        placeholder="AWS Certified Developer"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Issuing Organization</label>
                        <input
                          type="text"
                          value={cert.issuer || ''}
                          onChange={(e) => handleFieldChange('certifications', 'issuer', e.target.value, index)}
                          placeholder="Amazon Web Services"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="text"
                          value={cert.date || ''}
                          onChange={(e) => handleFieldChange('certifications', 'date', e.target.value, index)}
                          placeholder="MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Credential ID</label>
                      <input
                        type="text"
                        value={cert.credentialId || ''}
                        onChange={(e) => handleFieldChange('certifications', 'credentialId', e.target.value, index)}
                        placeholder="Credential ID or License Number"
                      />
                    </div>
                    {(localData.certifications || []).length > 1 && (
                      <button className="remove-btn" onClick={() => removeArrayItem('certifications', index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-btn" onClick={() => addArrayItem('certifications', { name: '', issuer: '', date: '', credentialId: '' })}>
                  + Add Certification
                </button>
              </div>
            )}

            {activeSection === 'achievements' && (
              <div className="builder-section">
                <h3>Achievements</h3>
                {(localData.achievements || []).map((achievement, index) => (
                  <div key={index} className="array-item">
                    <div className="form-group">
                      <label>Achievement Description</label>
                      <input
                        type="text"
                        value={achievement.description || ''}
                        onChange={(e) => handleFieldChange('achievements', 'description', e.target.value, index)}
                        placeholder="Won first prize in Hackathon 2023"
                      />
                    </div>
                    {(localData.achievements || []).length > 1 && (
                      <button className="remove-btn" onClick={() => removeArrayItem('achievements', index)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-btn" onClick={() => addArrayItem('achievements', { description: '' })}>
                  + Add Achievement
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="generate-resume-btn" onClick={handleGenerate}>
            Generate Resume PDF
          </button>
        </div>
      </div>
    </div>
  );
}


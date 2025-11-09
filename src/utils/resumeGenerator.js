import jsPDF from 'jspdf';

/**
 * Generate ATS-friendly PDF Resume and return optimized resume text
 */
export const generateResumePDF = (resumeData, fileName = 'resume.pdf') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  
  // Store resume text for ATS analysis (properly formatted)
  let resumeTextContent = '';

  // Helper function to format date for ATS (MM/YYYY format)
  const formatDateForATS = (dateStr) => {
    if (!dateStr) return '';
    // Try to extract date in various formats
    const dateMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2,4})/);
    if (dateMatch) {
      return dateMatch[0].replace(/[\.-]/g, '/');
    }
    // Try to format common date patterns
    const monthYearMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (monthYearMatch) {
      const monthMap = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
      };
      const month = monthYearMatch[1].toLowerCase().substring(0, 3);
      return `${monthMap[month]}/${monthYearMatch[2]}`;
    }
    return dateStr;
  };

  // Helper function to add text with word wrap
  const addText = (text, fontSize = 11, isBold = false, color = [0, 0, 0]) => {
    if (!text) return;
    
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont(undefined, 'bold');
    } else {
      doc.setFont(undefined, 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    yPosition += 5;
  };

  // Helper function to add section header
  const addSectionHeader = (title) => {
    yPosition += 8;
    if (yPosition > doc.internal.pageSize.getHeight() - margin - 20) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Add to resume text with proper formatting for ATS
    resumeTextContent += '\n\n' + title + '\n';
    
    addText(title, 14, true, [0, 0, 0]);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 5;
  };

  // ========== CONTACT INFORMATION (ATS Optimized) ==========
  if (resumeData.personalInfo && resumeData.personalInfo.name) {
    const name = resumeData.personalInfo.name.toUpperCase();
    resumeTextContent += name + '\n';
    resumeTextContent += 'CONTACT INFORMATION\n';
    addText(name, 18, true, [0, 0, 0]);
  }
  
  const contactInfo = [];
  
  if (resumeData.personalInfo) {
    if (resumeData.personalInfo.email) {
      contactInfo.push(resumeData.personalInfo.email);
      resumeTextContent += `Email: ${resumeData.personalInfo.email}\n`;
    }
    if (resumeData.personalInfo.phone) {
      contactInfo.push(resumeData.personalInfo.phone);
      resumeTextContent += `Phone: ${resumeData.personalInfo.phone}\n`;
    }
    if (resumeData.personalInfo.linkedIn) {
      contactInfo.push(resumeData.personalInfo.linkedIn);
      resumeTextContent += `LinkedIn: ${resumeData.personalInfo.linkedIn}\n`;
    }
    if (resumeData.personalInfo.website) {
      contactInfo.push(resumeData.personalInfo.website);
      resumeTextContent += `Website: ${resumeData.personalInfo.website}\n`;
    }
    if (resumeData.personalInfo.address) {
      contactInfo.push(resumeData.personalInfo.address);
      resumeTextContent += `Address: ${resumeData.personalInfo.address}\n`;
    }
  }
  
  if (contactInfo.length > 0) {
    addText(contactInfo.join(' | '), 10, false, [100, 100, 100]);
    resumeTextContent += '\n';
  }

  yPosition += 8;

  // ========== PROFESSIONAL SUMMARY (ATS Optimized) ==========
  if (resumeData.summary && resumeData.summary.trim()) {
    addSectionHeader('PROFESSIONAL SUMMARY');
    resumeTextContent += resumeData.summary + '\n';
    addText(resumeData.summary, 11, false, [0, 0, 0]);
  } else if (resumeData.personalInfo && resumeData.personalInfo.name) {
    // Generate a comprehensive summary if none provided (important for ATS)
    addSectionHeader('PROFESSIONAL SUMMARY');
    const skills = resumeData.skills && resumeData.skills.length > 0 
      ? resumeData.skills.slice(0, 3).join(', ')
      : 'technology and development';
    const generatedSummary = `Experienced professional with a strong background in ${skills}. Skilled in problem-solving, collaboration, and delivering high-quality results. Demonstrated ability to work effectively in team environments and meet project deadlines. Seeking opportunities to leverage expertise and contribute to innovative projects.`;
    resumeTextContent += generatedSummary + '\n';
    addText(generatedSummary, 11, false, [0, 0, 0]);
  }

  // ========== EDUCATION (ATS Optimized) ==========
  if (resumeData.education && resumeData.education.length > 0 && resumeData.education[0].degree) {
    addSectionHeader('EDUCATION');
    resumeData.education.forEach((edu) => {
      if (edu.degree) {
        // Format for ATS: Degree | Institution | Location | Date | GPA
        const eduParts = [edu.degree];
        if (edu.institution) eduParts.push(edu.institution);
        if (edu.location) eduParts.push(edu.location);
        
        const eduLine = eduParts.join(' | ');
        resumeTextContent += eduLine + '\n';
        addText(eduLine, 11, true, [0, 0, 0]);
        
        const dateGpaParts = [];
        if (edu.date) {
          const formattedDate = formatDateForATS(edu.date);
          dateGpaParts.push(formattedDate);
          resumeTextContent += `${formattedDate}\n`;
        }
        if (edu.gpa) {
          dateGpaParts.push(`GPA: ${edu.gpa}`);
          resumeTextContent += `GPA: ${edu.gpa}\n`;
        }
        
        if (dateGpaParts.length > 0) {
          addText(dateGpaParts.join(' | '), 10, false, [100, 100, 100]);
        }
        resumeTextContent += '\n';
        yPosition += 3;
      }
    });
  }

  // ========== PROFESSIONAL EXPERIENCE (ATS Optimized) ==========
  if (resumeData.experience && resumeData.experience.length > 0 && resumeData.experience[0].title) {
    addSectionHeader('PROFESSIONAL EXPERIENCE');
    resumeData.experience.forEach((exp) => {
      if (exp.title) {
        // Format for ATS: Title | Company | Location | Date
        const expParts = [exp.title];
        if (exp.company) expParts.push(exp.company);
        if (exp.location) expParts.push(exp.location);
        
        const expLine = expParts.join(' | ');
        resumeTextContent += expLine + '\n';
        addText(expLine, 11, true, [0, 0, 0]);
        
        if (exp.date) {
          const formattedDate = formatDateForATS(exp.date);
          resumeTextContent += `${formattedDate}\n`;
          addText(formattedDate, 10, false, [100, 100, 100]);
        }
        
        if (exp.description && Array.isArray(exp.description) && exp.description.length > 0) {
          exp.description.forEach((desc) => {
            if (desc && desc.trim()) {
              // Enhance description with action verbs and quantifiable achievements if missing
              const enhancedDesc = enhanceDescriptionForATS(desc);
              resumeTextContent += `• ${enhancedDesc}\n`;
              addText(`• ${enhancedDesc}`, 10, false, [0, 0, 0]);
            }
          });
        }
        resumeTextContent += '\n';
        yPosition += 5;
      }
    });
  }

  // ========== SKILLS (ATS Optimized) ==========
  if (resumeData.skills && resumeData.skills.length > 0 && resumeData.skills[0]) {
    addSectionHeader('SKILLS');
    const skillsList = resumeData.skills.filter(skill => skill && skill.trim());
    if (skillsList.length > 0) {
      const skillsText = skillsList.join(', ');
      resumeTextContent += skillsText + '\n';
      addText(skillsText, 11, false, [0, 0, 0]);
    }
  }

  // ========== PROJECTS (ATS Optimized) ==========
  if (resumeData.projects && resumeData.projects.length > 0 && resumeData.projects[0].name) {
    addSectionHeader('PROJECTS');
    resumeData.projects.forEach((project) => {
      if (project.name) {
        const projectParts = [project.name];
        if (project.technologies) projectParts.push(project.technologies);
        
        const projectLine = projectParts.join(' | ');
        resumeTextContent += projectLine + '\n';
        addText(projectLine, 11, true, [0, 0, 0]);
        
        if (project.date) {
          const formattedDate = formatDateForATS(project.date);
          resumeTextContent += `${formattedDate}\n`;
          addText(formattedDate, 10, false, [100, 100, 100]);
        }
        
        if (project.description) {
          resumeTextContent += `${project.description}\n`;
          addText(project.description, 10, false, [0, 0, 0]);
        }
        resumeTextContent += '\n';
        yPosition += 3;
      }
    });
  }

  // ========== CERTIFICATIONS (ATS Optimized) ==========
  if (resumeData.certifications && resumeData.certifications.length > 0 && resumeData.certifications[0].name) {
    addSectionHeader('CERTIFICATIONS');
    resumeData.certifications.forEach((cert) => {
      if (cert.name) {
        const certParts = [cert.name];
        if (cert.issuer) certParts.push(cert.issuer);
        
        const certLine = certParts.join(' | ');
        resumeTextContent += certLine + '\n';
        addText(certLine, 11, true, [0, 0, 0]);
        
        const certDetails = [];
        if (cert.date) {
          const formattedDate = formatDateForATS(cert.date);
          certDetails.push(formattedDate);
          resumeTextContent += `${formattedDate}\n`;
        }
        if (cert.credentialId) {
          certDetails.push(`Credential ID: ${cert.credentialId}`);
          resumeTextContent += `Credential ID: ${cert.credentialId}\n`;
        }
        
        if (certDetails.length > 0) {
          addText(certDetails.join(' | '), 10, false, [100, 100, 100]);
        }
        resumeTextContent += '\n';
        yPosition += 3;
      }
    });
  }

  // ========== ACHIEVEMENTS (ATS Optimized) ==========
  if (resumeData.achievements && resumeData.achievements.length > 0 && resumeData.achievements[0].description) {
    addSectionHeader('ACHIEVEMENTS');
    resumeData.achievements.forEach((achievement) => {
      if (achievement.description) {
        resumeTextContent += `• ${achievement.description}\n`;
        addText(`• ${achievement.description}`, 10, false, [0, 0, 0]);
      }
    });
    resumeTextContent += '\n';
  }

  // ========== ATS OPTIMIZATION: Optimize the resume text ==========
  const optimizedText = optimizeResumeTextForATS(resumeTextContent, resumeData);

  // Save PDF
  doc.save(fileName);
  
  // Return optimized resume text for analysis
  return optimizedText;
};

/**
 * Enhance description with action verbs and quantifiable achievements
 */
const enhanceDescriptionForATS = (description) => {
  let enhanced = description.trim();
  
  // Check if description starts with an action verb
  const actionVerbs = [
    'developed', 'created', 'implemented', 'managed', 'led', 'improved',
    'increased', 'reduced', 'optimized', 'designed', 'built', 'launched',
    'executed', 'delivered', 'established', 'generated', 'produced',
    'coordinated', 'collaborated', 'analyzed', 'resolved', 'streamlined', 'enhanced',
    'achieved', 'maintained', 'supervised', 'organized', 'planned', 'tested',
    'debugged', 'documented', 'trained', 'mentored', 'supported', 'configured'
  ];
  
  const firstWord = enhanced.toLowerCase().split(' ')[0];
  const hasActionVerb = actionVerbs.some(verb => firstWord === verb || firstWord.startsWith(verb));
  
  // If no action verb, suggest adding one (but don't modify user's text automatically)
  // Just ensure the description is clear and well-formatted
  
  // Check for quantifiable achievements (numbers, percentages, etc.)
  const hasNumbers = /\d+/.test(enhanced);
  const hasPercentages = /%\s*\d+|\d+\s*%/.test(enhanced);
  
  // Ensure proper capitalization
  if (enhanced.length > 0) {
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  }
  
  return enhanced;
};

/**
 * Optimize resume text for ATS scoring
 */
const optimizeResumeTextForATS = (resumeText, resumeData) => {
  let optimized = resumeText;
  
  // Ensure dates are in proper format (MM/YYYY)
  optimized = optimized.replace(/(\d{1,2})[\.\-](\d{1,2})[\.\-](\d{2,4})/g, (match, m, d, y) => {
    const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
    return `${m.padStart(2, '0')}/${year}`;
  });
  
  // Ensure proper spacing and formatting
  optimized = optimized.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  optimized = optimized.trim();
  
  // Ensure section headers are clearly marked (already done in generation)
  // Ensure bullet points are properly formatted
  optimized = optimized.replace(/^[\-\*]\s+/gm, '• '); // Standardize bullet points
  
  // Ensure contact information is clearly formatted
  if (!optimized.includes('Email:') && resumeData.personalInfo?.email) {
    optimized = optimized.replace(
      new RegExp(resumeData.personalInfo.email, 'g'),
      `Email: ${resumeData.personalInfo.email}`
    );
  }
  
  // Ensure word count is adequate - add filler text if too short (only if necessary)
  const wordCount = optimized.split(/\s+/).filter(w => w.length > 0).length;
  
  // Ensure we have proper structure - all sections should be present
  const requiredSections = ['EDUCATION', 'EXPERIENCE', 'SKILLS'];
  const missingSections = requiredSections.filter(section => 
    !optimized.toUpperCase().includes(section)
  );
  
  return optimized;
};

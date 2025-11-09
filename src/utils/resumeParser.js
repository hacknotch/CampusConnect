/**
 * Resume Data Parser
 * Extracts structured information from resume text
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+?\d{1,3}[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g;
const LINKEDIN_PATTERN = /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi;
const URL_PATTERN = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/gi;
const DATE_PATTERN = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi;

/**
 * Extract structured data from resume text
 */
export const parseResumeData = (resumeText) => {
  if (!resumeText || resumeText.trim().length === 0) {
    return getEmptyResumeData();
  }

  const text = resumeText;
  const lowerText = text.toLowerCase();

  // Extract contact information
  const emailMatch = text.match(EMAIL_PATTERN);
  const phoneMatch = text.match(PHONE_PATTERN);
  const linkedInMatch = text.match(LINKEDIN_PATTERN);
  const urlMatches = text.match(URL_PATTERN) || [];

  // Extract name (usually first line or before email)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let name = '';
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Check if first line looks like a name (not too long, has letters)
    if (firstLine.length < 50 && /^[A-Za-z\s\.]+$/.test(firstLine.replace(/[^A-Za-z\s\.]/g, ''))) {
      name = firstLine;
    }
  }

  // Extract education
  const educationSection = extractSection(text, ['education', 'academic background', 'educational background']);
  const education = parseEducation(educationSection);

  // Extract experience
  const experienceSection = extractSection(text, ['experience', 'work experience', 'employment', 'professional experience', 'career']);
  const experience = parseExperience(experienceSection);

  // Extract skills
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'core competencies', 'competencies']);
  const skills = parseSkills(skillsSection, text);

  // Extract projects
  const projectsSection = extractSection(text, ['projects', 'project experience', 'project']);
  const projects = parseProjects(projectsSection);

  // Extract certifications
  const certificationsSection = extractSection(text, ['certifications', 'certificates', 'certificate']);
  const certifications = parseCertifications(certificationsSection);

  // Extract achievements/awards
  const achievementsSection = extractSection(text, ['achievements', 'accomplishments', 'awards', 'honors']);
  const achievements = parseAchievements(achievementsSection);

  // Extract objective/summary
  const summarySection = extractSection(text, ['objective', 'summary', 'professional summary', 'profile', 'about']);
  const summary = summarySection ? summarySection.split('\n').slice(0, 3).join(' ').trim() : '';

  return {
    personalInfo: {
      name: name || '',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      linkedIn: linkedInMatch ? linkedInMatch[0] : '',
      website: urlMatches.filter(url => !url.includes('linkedin'))[0] || '',
      address: extractAddress(text) || ''
    },
    summary: summary,
    education: education,
    experience: experience,
    skills: skills,
    projects: projects,
    certifications: certifications,
    achievements: achievements
  };
};

/**
 * Extract a section from resume text
 */
const extractSection = (text, keywords) => {
  const lines = text.split('\n');
  let sectionStart = -1;
  let sectionEnd = -1;

  // Find section start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (keywords.some(keyword => line.includes(keyword) && line.length < 50)) {
      sectionStart = i + 1;
      break;
    }
  }

  if (sectionStart === -1) return '';

  // Find section end (next section header or end of text)
  const nextSections = ['education', 'experience', 'skills', 'projects', 'certifications', 'achievements', 'awards', 'objective', 'summary'];
  for (let i = sectionStart; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (nextSections.some(section => line.includes(section) && line.length < 50 && i !== sectionStart - 1)) {
      sectionEnd = i;
      break;
    }
  }

  if (sectionEnd === -1) sectionEnd = lines.length;

  return lines.slice(sectionStart, sectionEnd).join('\n');
};

/**
 * Parse education section
 */
const parseEducation = (educationText) => {
  if (!educationText) return [{ degree: '', institution: '', location: '', date: '', gpa: '' }];

  const entries = [];
  const lines = educationText.split('\n').filter(line => line.trim().length > 0);
  
  let currentEntry = {};
  for (const line of lines) {
    // Check if line contains degree information
    if (/\b(bachelor|master|phd|doctorate|diploma|degree|b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc)\b/i.test(line)) {
      if (currentEntry.degree) {
        entries.push({ ...currentEntry });
      }
      currentEntry = {
        degree: line.trim(),
        institution: '',
        location: '',
        date: '',
        gpa: ''
      };
    } else if (currentEntry.degree) {
      // Extract institution, location, date, GPA
      if (!currentEntry.institution && line.length > 5) {
        currentEntry.institution = line.trim();
      } else if (DATE_PATTERN.test(line)) {
        const dateMatch = line.match(DATE_PATTERN);
        if (dateMatch) {
          currentEntry.date = dateMatch[0];
        }
      } else if (/\b(gpa|cgpa|grade)\s*:?\s*[\d\.]+/i.test(line)) {
        const gpaMatch = line.match(/[\d\.]+/);
        if (gpaMatch) {
          currentEntry.gpa = gpaMatch[0];
        }
      }
    }
  }
  
  if (currentEntry.degree) {
    entries.push(currentEntry);
  }

  return entries.length > 0 ? entries : [{ degree: '', institution: '', location: '', date: '', gpa: '' }];
};

/**
 * Parse experience section
 */
const parseExperience = (experienceText) => {
  if (!experienceText) return [{ title: '', company: '', location: '', date: '', description: [''] }];

  const entries = [];
  const lines = experienceText.split('\n').filter(line => line.trim().length > 0);
  
  let currentEntry = {};
  for (const line of lines) {
    // Check if line looks like a job title
    if (/\b(developer|engineer|intern|manager|analyst|designer|consultant|specialist|assistant|lead|senior|junior)\b/i.test(line) && line.length < 100) {
      if (currentEntry.title) {
        entries.push({ ...currentEntry });
      }
      currentEntry = {
        title: line.trim(),
        company: '',
        location: '',
        date: '',
        description: []
      };
    } else if (currentEntry.title) {
      if (!currentEntry.company && line.length > 3 && line.length < 100) {
        currentEntry.company = line.trim();
      } else if (DATE_PATTERN.test(line)) {
        const dateMatch = line.match(DATE_PATTERN);
        if (dateMatch) {
          currentEntry.date = dateMatch[0];
        }
      } else if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
        currentEntry.description.push(line.replace(/^[•\-\d\.\s]+/, '').trim());
      }
    }
  }
  
  if (currentEntry.title) {
    entries.push(currentEntry);
  }

  return entries.length > 0 ? entries : [{ title: '', company: '', location: '', date: '', description: [''] }];
};

/**
 * Parse skills section
 */
const parseSkills = (skillsText, fullText) => {
  if (skillsText) {
    // Extract skills from skills section
    const skills = skillsText
      .split(/[,•\n\-]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0 && skill.length < 50);
    return skills.length > 0 ? skills : [''];
  }
  
  // Try to extract common skills from full text
  const commonSkills = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'mongodb', 'express'];
  const foundSkills = commonSkills.filter(skill => fullText.toLowerCase().includes(skill));
  return foundSkills.length > 0 ? foundSkills : [''];
};

/**
 * Parse projects section
 */
const parseProjects = (projectsText) => {
  if (!projectsText) return [{ name: '', description: '', technologies: '', date: '' }];

  const entries = [];
  const lines = projectsText.split('\n').filter(line => line.trim().length > 0);
  
  let currentEntry = {};
  for (const line of lines) {
    if (line.length > 5 && line.length < 100 && !line.trim().startsWith('•') && !line.trim().startsWith('-')) {
      if (currentEntry.name) {
        entries.push({ ...currentEntry });
      }
      currentEntry = {
        name: line.trim(),
        description: '',
        technologies: '',
        date: ''
      };
    } else if (currentEntry.name) {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        currentEntry.description += line.replace(/^[•\-\s]+/, '').trim() + ' ';
      } else if (DATE_PATTERN.test(line)) {
        const dateMatch = line.match(DATE_PATTERN);
        if (dateMatch) {
          currentEntry.date = dateMatch[0];
        }
      }
    }
  }
  
  if (currentEntry.name) {
    entries.push(currentEntry);
  }

  return entries.length > 0 ? entries : [{ name: '', description: '', technologies: '', date: '' }];
};

/**
 * Parse certifications section
 */
const parseCertifications = (certificationsText) => {
  if (!certificationsText) return [{ name: '', issuer: '', date: '', credentialId: '' }];

  const entries = [];
  const lines = certificationsText.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    if (line.trim().length > 5) {
      entries.push({
        name: line.trim(),
        issuer: '',
        date: '',
        credentialId: ''
      });
    }
  }

  return entries.length > 0 ? entries : [{ name: '', issuer: '', date: '', credentialId: '' }];
};

/**
 * Parse achievements section
 */
const parseAchievements = (achievementsText) => {
  if (!achievementsText) return [{ description: '' }];

  const achievements = achievementsText
    .split(/[•\n\-]/)
    .map(achievement => achievement.trim())
    .filter(achievement => achievement.length > 0)
    .map(achievement => ({ description: achievement }));

  return achievements.length > 0 ? achievements : [{ description: '' }];
};

/**
 * Extract address from text
 */
const extractAddress = (text) => {
  // Simple address extraction (looks for common address patterns)
  const addressPattern = /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|city|state|zip|country)/gi;
  const match = text.match(addressPattern);
  return match ? match[0] : '';
};

/**
 * Get empty resume data structure
 */
export const getEmptyResumeData = () => {
  return {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      linkedIn: '',
      website: '',
      address: ''
    },
    summary: '',
    education: [{ degree: '', institution: '', location: '', date: '', gpa: '' }],
    experience: [{ title: '', company: '', location: '', date: '', description: [''] }],
    skills: [''],
    projects: [{ name: '', description: '', technologies: '', date: '' }],
    certifications: [{ name: '', issuer: '', date: '', credentialId: '' }],
    achievements: [{ description: '' }]
  };
};


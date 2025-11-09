/**
 * ATS (Applicant Tracking System) Compatibility Scorer
 * Analyzes resumes for ATS compatibility based on multiple factors
 */

// Common ATS-friendly section headers
const STANDARD_SECTIONS = [
  'contact', 'contact information', 'personal information',
  'education', 'educational background', 'academic background',
  'experience', 'work experience', 'employment', 'professional experience',
  'skills', 'technical skills', 'core competencies',
  'projects', 'project experience',
  'certifications', 'certificates',
  'achievements', 'accomplishments', 'awards',
  'objective', 'summary', 'professional summary', 'profile'
];

// Common ATS-unfriendly elements
const UNFRIENDLY_ELEMENTS = [
  'table', 'chart', 'graph', 'image', 'photo', 'picture',
  'header', 'footer', 'text box', 'textbox', 'column',
  'multi-column', 'graphic', 'design element'
];

// Standard date formats that ATS can parse
const DATE_PATTERNS = [
  /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g, // MM/DD/YYYY, DD-MM-YY, etc.
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi, // Month DD, YYYY
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi
];

// Action verbs that improve ATS scores
const ACTION_VERBS = [
  'achieved', 'developed', 'created', 'implemented', 'managed', 'led',
  'improved', 'increased', 'reduced', 'optimized', 'designed', 'built',
  'launched', 'executed', 'delivered', 'established', 'generated', 'produced',
  'coordinated', 'collaborated', 'analyzed', 'resolved', 'streamlined', 'enhanced'
];

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone pattern
const PHONE_PATTERN = /(\+?\d{1,3}[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g;

// URL/LinkedIn pattern
const URL_PATTERN = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/gi;
const LINKEDIN_PATTERN = /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi;

/**
 * Extract text content from resume
 */
export const extractResumeText = async (file) => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return await extractFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await extractFromDOCX(file);
  } else {
    throw new Error('Unsupported file format. Please upload PDF or DOCX.');
  }
};

/**
 * Extract text from PDF using pdfjs-dist (browser-compatible)
 */
const extractFromPDF = async (file) => {
  let pdfjsLib;
  
  try {
    // Dynamic import of pdfjs-dist
    pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source - use jsdelivr CDN
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      const version = pdfjsLib.version || '5.4.394';
      // Try jsdelivr CDN first (most reliable)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.js`;
    }
  } catch (importError) {
    console.error('Failed to import pdfjs-dist:', importError);
    throw new Error('PDF parsing library failed to load. Please refresh the page and try again.');
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document with error handling for worker issues
    let loadingTask;
    try {
      loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0 // Suppress warnings
      });
    } catch (workerError) {
      // If worker fails, try without worker (main thread)
      console.warn('Worker failed, falling back to main thread:', workerError);
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }
      loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0
      });
    }
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map(item => item.str || '')
          .filter(text => text && text.trim().length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n';
        }
      } catch (pageError) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (!fullText.trim()) {
      throw new Error('No text could be extracted from the PDF. The file might be image-based or corrupted.');
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error parsing PDF:', error);
    
    // Provide more helpful error messages
    if (error.message && error.message.includes('worker')) {
      throw new Error('PDF parsing service unavailable. Please try again or use a DOCX file instead.');
    }
    
    throw new Error(`Failed to parse PDF file: ${error.message}. Please ensure it is a valid PDF file and try again.`);
  }
};

/**
 * Extract text from DOCX
 */
const extractFromDOCX = async (file) => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file. Please ensure it is a valid document.');
  }
};

/**
 * Calculate ATS Compatibility Score
 */
export const calculateATSScore = (resumeText, fileName) => {
  if (!resumeText || resumeText.trim().length === 0) {
    return {
      overallScore: 0,
      breakdown: {},
      issues: ['Resume text is empty'],
      suggestions: []
    };
  }

  const text = resumeText.toLowerCase();
  const originalText = resumeText;
  const textLength = resumeText.length;
  const wordCount = resumeText.split(/\s+/).filter(w => w.length > 0).length;

  let score = 0;
  let maxScore = 0;
  const breakdown = {};
  const issues = [];
  const suggestions = [];

  // 1. File Format (10 points)
  maxScore += 10;
  if (fileName.toLowerCase().endsWith('.pdf') || fileName.toLowerCase().endsWith('.docx')) {
    score += 10;
    breakdown.fileFormat = { score: 10, max: 10, status: 'good' };
  } else {
    breakdown.fileFormat = { score: 0, max: 10, status: 'poor' };
    issues.push('File format not ideal. Use PDF or DOCX.');
  }

  // 2. Contact Information (15 points)
  maxScore += 15;
  let contactScore = 0;
  const hasEmail = EMAIL_PATTERN.test(originalText);
  const hasPhone = PHONE_PATTERN.test(originalText);
  const hasLinkedIn = LINKEDIN_PATTERN.test(originalText);
  
  if (hasEmail) contactScore += 5;
  if (hasPhone) contactScore += 5;
  if (hasLinkedIn) contactScore += 5;
  
  score += contactScore;
  breakdown.contactInfo = { score: contactScore, max: 15, status: contactScore >= 10 ? 'good' : 'needs-improvement' };
  if (!hasEmail) { issues.push('Missing email address'); suggestions.push('Add your email address in the contact section'); }
  if (!hasPhone) { issues.push('Missing phone number'); suggestions.push('Add your phone number'); }
  if (!hasLinkedIn) { suggestions.push('Consider adding your LinkedIn profile URL'); }

  // 3. Section Headers (15 points)
  maxScore += 15;
  let sectionScore = 0;
  const foundSections = STANDARD_SECTIONS.filter(section => 
    text.includes(section.toLowerCase())
  );
  const uniqueSections = [...new Set(foundSections.map(s => {
    if (s.includes('experience')) return 'experience';
    if (s.includes('education')) return 'education';
    if (s.includes('skill')) return 'skills';
    if (s.includes('contact')) return 'contact';
    return s;
  }))];
  
  sectionScore = Math.min(15, uniqueSections.length * 3);
  score += sectionScore;
  breakdown.sectionHeaders = { 
    score: sectionScore, 
    max: 15, 
    status: sectionScore >= 12 ? 'good' : sectionScore >= 9 ? 'needs-improvement' : 'poor',
    foundSections: uniqueSections
  };
  if (!text.includes('education')) { issues.push('Missing Education section'); suggestions.push('Add an Education section with your academic background'); }
  if (!text.includes('experience') && !text.includes('employment')) { issues.push('Missing Work Experience section'); suggestions.push('Add a Work Experience section'); }
  if (!text.includes('skill')) { issues.push('Missing Skills section'); suggestions.push('Add a Skills section listing your technical and soft skills'); }

  // 4. Resume Length (10 points)
  maxScore += 10;
  let lengthScore = 0;
  if (wordCount >= 400 && wordCount <= 800) {
    lengthScore = 10; // Ideal length
  } else if (wordCount >= 300 && wordCount <= 1000) {
    lengthScore = 7; // Acceptable
  } else if (wordCount >= 200 && wordCount <= 1200) {
    lengthScore = 5; // Borderline
  } else {
    lengthScore = 3; // Too short or too long
  }
  score += lengthScore;
  breakdown.resumeLength = { 
    score: lengthScore, 
    max: 10, 
    status: lengthScore >= 7 ? 'good' : 'needs-improvement',
    wordCount: wordCount
  };
  if (wordCount < 300) { issues.push('Resume is too short'); suggestions.push('Expand your resume with more details about your experience and achievements'); }
  if (wordCount > 1000) { issues.push('Resume is too long'); suggestions.push('Consider condensing your resume to 1-2 pages for better ATS compatibility'); }

  // 5. Date Formats (10 points)
  maxScore += 10;
  let dateScore = 0;
  const hasDates = DATE_PATTERNS.some(pattern => pattern.test(originalText));
  if (hasDates) {
    dateScore = 10;
    breakdown.dateFormats = { score: 10, max: 10, status: 'good' };
  } else {
    breakdown.dateFormats = { score: 0, max: 10, status: 'poor' };
    issues.push('No dates found in standard formats');
    suggestions.push('Add dates to your education and work experience (e.g., MM/YYYY or Month YYYY)');
  }

  // 6. Action Verbs (10 points)
  maxScore += 10;
  const foundActionVerbs = ACTION_VERBS.filter(verb => text.includes(verb));
  const actionVerbScore = Math.min(10, foundActionVerbs.length * 2);
  score += actionVerbScore;
  breakdown.actionVerbs = { 
    score: actionVerbScore, 
    max: 10, 
    status: actionVerbScore >= 6 ? 'good' : 'needs-improvement',
    foundVerbs: foundActionVerbs.length
  };
  if (foundActionVerbs.length < 3) {
    suggestions.push('Use more action verbs to describe your achievements (e.g., developed, created, implemented)');
  }

  // 7. Quantifiable Achievements (10 points)
  maxScore += 10;
  const hasNumbers = /\d+/.test(originalText);
  const hasPercentages = /%\s*\d+|\d+\s*%/.test(originalText);
  const hasQuantifiers = /\d+\s*(percent|%|years?|months?|times?|people|users?|projects?|clients?|increase|decrease|improve)/gi.test(originalText);
  let quantifierScore = 0;
  if (hasQuantifiers) quantifierScore = 10;
  else if (hasPercentages || (hasNumbers && wordCount > 200)) quantifierScore = 6;
  else if (hasNumbers) quantifierScore = 3;
  score += quantifierScore;
  breakdown.quantifiableAchievements = { 
    score: quantifierScore, 
    max: 10, 
    status: quantifierScore >= 6 ? 'good' : 'needs-improvement'
  };
  if (quantifierScore < 6) {
    suggestions.push('Add quantifiable achievements with numbers, percentages, or metrics (e.g., "Increased sales by 25%")');
  }

  // 8. Keyword Density (10 points)
  maxScore += 10;
  // Check for common resume keywords
  const commonKeywords = ['experience', 'skills', 'education', 'project', 'certification', 'achievement', 'responsibility', 'leadership', 'team', 'communication'];
  const keywordMatches = commonKeywords.filter(keyword => text.includes(keyword));
  const keywordScore = Math.min(10, (keywordMatches.length / commonKeywords.length) * 10);
  score += keywordScore;
  breakdown.keywordDensity = { 
    score: keywordScore, 
    max: 10, 
    status: keywordScore >= 7 ? 'good' : 'needs-improvement'
  };

  // 9. Unfriendly Elements Check (10 points)
  maxScore += 10;
  const hasUnfriendlyElements = UNFRIENDLY_ELEMENTS.some(element => text.includes(element));
  let unfriendlyScore = 10;
  if (hasUnfriendlyElements) {
    unfriendlyScore = 5;
    issues.push('Resume may contain ATS-unfriendly elements (tables, images, etc.)');
    suggestions.push('Avoid using tables, images, graphics, or complex formatting that ATS systems cannot parse');
  }
  score += unfriendlyScore;
  breakdown.unfriendlyElements = { 
    score: unfriendlyScore, 
    max: 10, 
    status: unfriendlyScore >= 8 ? 'good' : 'poor'
  };

  // 10. Structure and Readability (10 points)
  maxScore += 10;
  const hasMultipleParagraphs = (originalText.match(/\n\s*\n/g) || []).length > 3;
  const hasBulletPoints = /[•\-\*]\s+|[1-9]\.\s+/.test(originalText);
  const hasClearSections = (originalText.match(/^[A-Z][A-Z\s]+\n/gm) || []).length > 2;
  let structureScore = 0;
  if (hasClearSections && hasBulletPoints) structureScore = 10;
  else if (hasClearSections || hasBulletPoints) structureScore = 7;
  else if (hasMultipleParagraphs) structureScore = 5;
  else structureScore = 3;
  score += structureScore;
  breakdown.structure = { 
    score: structureScore, 
    max: 10, 
    status: structureScore >= 7 ? 'good' : 'needs-improvement'
  };
  if (!hasBulletPoints) {
    suggestions.push('Use bullet points to organize your experience and achievements');
  }
  if (!hasClearSections) {
    suggestions.push('Use clear section headers (e.g., EDUCATION, EXPERIENCE, SKILLS)');
  }

  // Calculate overall score percentage
  const overallScore = Math.round((score / maxScore) * 100);

  // Determine overall status
  let overallStatus = 'poor';
  if (overallScore >= 80) overallStatus = 'excellent';
  else if (overallScore >= 70) overallStatus = 'good';
  else if (overallScore >= 60) overallStatus = 'needs-improvement';
  else overallStatus = 'poor';

  return {
    overallScore,
    overallStatus,
    breakdown,
    issues,
    suggestions,
    stats: {
      wordCount,
      characterCount: textLength,
      sectionsFound: uniqueSections.length,
      actionVerbsFound: foundActionVerbs.length
    }
  };
};


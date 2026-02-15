import PyPDF2
import docx
import logging
import re
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class ResumeParser:
    def __init__(self):
        self.skills_keywords = [
            'python', 'java', 'javascript', 'typescript', 'react', 'django', 'flask',
            'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git',
            'machine learning', 'ai', 'artificial intelligence', 'deep learning',
            'nlp', 'natural language processing', 'computer vision',
            'data science', 'data analysis', 'statistics', 'pandas', 'numpy',
            'tensorflow', 'pytorch', 'scikit-learn', 'keras',
            'rest api', 'graphql', 'microservices', 'devops', 'ci/cd',
            'agile', 'scrum', 'jira', 'confluence', 'slack',
            'html', 'css', 'sass', 'tailwind', 'bootstrap', 'next.js', 'vue.js',
            'node.js', 'express', 'spring boot', 'angular', 'django rest framework',
            'linux', 'unix', 'bash', 'shell scripting', 'powershell',
            'git', 'github', 'gitlab', 'bitbucket', 'version control',
            'testing', 'unit testing', 'integration testing', 'jest', 'pytest',
            'cypress', 'selenium', 'junit', 'mocha', 'chai'
        ]
        
        self.experience_patterns = [
            r'(\d+)\+?\s*years?\s*(of\s+)?experience',
            r'experience\s*(?:in|with|as)\s*([^.]+)',
            r'worked\s*(?:at|with|for)\s*([^.]+)',
            r'employed\s*(?:at|by)\s*([^.]+)'
        ]
        
        self.education_patterns = [
            r'(bachelor|master|phd|doctorate|b\.s\.|m\.s\.|m\.sc\.|b\.tech|m\.tech)\s*(?:degree\s*)?(?:in\s+)?([^.]+)',
            r'(university|college|institute)\s*(?:of\s+)?([^.]+)',
            r'(?:degree|certificate|diploma)\s*(?:in\s+)?([^.]+)'
        ]

    def parse_resume(self, file_path: str) -> Dict[str, any]:
        """Parse resume file and extract relevant information"""
        logger.info(f"Parsing resume: {file_path}")
        
        try:
            # Extract text from file
            text = self._extract_text(file_path)
            
            if not text:
                logger.error("Failed to extract text from resume")
                return {}
            
            # Extract information
            skills = self._extract_skills(text)
            experience = self._extract_experience(text)
            education = self._extract_education(text)
            
            result = {
                'skills': skills,
                'experience': experience,
                'education': education,
                'full_text': text[:1000]  # Store first 1000 chars for context
            }
            
            logger.info(f"Successfully parsed resume. Skills: {skills}, Experience: {len(experience)}, Education: {len(education)}")
            return result
            
        except Exception as e:
            logger.error(f"Error parsing resume: {e}")
            return {}

    def _extract_text(self, file_path: str) -> Optional[str]:
        """Extract text from PDF or DOCX file"""
        try:
            if file_path.lower().endswith('.pdf'):
                return self._extract_pdf_text(file_path)
            elif file_path.lower().endswith('.docx'):
                return self._extract_docx_text(file_path)
            else:
                logger.error(f"Unsupported file format: {file_path}")
                return None
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return None

    def _extract_pdf_text(self, file_path: str) -> Optional[str]:
        """Extract text from PDF file"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return None

    def _extract_docx_text(self, file_path: str) -> Optional[str]:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return None

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text"""
        text_lower = text.lower()
        found_skills = []
        
        for skill in self.skills_keywords:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        logger.info(f"Found skills: {found_skills}")
        return found_skills

    def _extract_experience(self, text: str) -> List[Dict[str, str]]:
        """Extract work experience from resume text"""
        experiences = []
        
        for pattern in self.experience_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) > 0:
                    experiences.append({
                        'description': match.group(0),
                        'detail': match.group(1) if len(match.groups()) > 0 else ''
                    })
        
        logger.info(f"Found {len(experiences)} experience entries")
        return experiences

    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        """Extract education information from resume text"""
        education_entries = []
        
        for pattern in self.education_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.groups()) > 0:
                    education_entries.append({
                        'description': match.group(0),
                        'detail': match.group(1) if len(match.groups()) > 0 else ''
                    })
        
        logger.info(f"Found {len(education_entries)} education entries")
        return education_entries

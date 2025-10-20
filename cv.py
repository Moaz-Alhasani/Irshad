import pdfplumber
import re
import json
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

resume_parser_model_path = r"D:\LaMini-Flan"
ner_model_path = r"D:\RoBERTa-NER"



print("Loading LaMini-Flan model...")
parser_tokenizer = AutoTokenizer.from_pretrained(resume_parser_model_path)
parser_model = AutoModelForSeq2SeqLM.from_pretrained(resume_parser_model_path)

print("Loading RoBERTa-NER model...")
ner_pipeline = pipeline("ner", model=ner_model_path, aggregation_strategy="simple")



def extract_text_from_pdf(path):
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or '' for page in pdf.pages)
    return text.strip()


def extract_email(text):
    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    return match.group(0) if match else None


def extract_phone(text):
    match = re.search(r"(\+?\d{1,3})?[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}", text)
    return match.group(0) if match else None


def analyze_with_lamini(text):
    prompt = f"""
You are a professional resume parser.

Extract the following details from the resume:
- Full Name
- Phone Number
- Email
- Skills
- Languages (spoken or written human languages, not programming languages)
- Work Experience
- Education
- Certifications

Return the result in JSON format.
Resume: {text}
"""
    inputs = parser_tokenizer(prompt, return_tensors="pt", max_length=2048, truncation=True)
    outputs = parser_model.generate(**inputs, max_new_tokens=512)
    result = parser_tokenizer.decode(outputs[0], skip_special_tokens=True)

    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:

        parsed = {"Skills": [], "Education": [], "Certifications": [], "Languages": ["Arabic"]}
        skills = re.findall(r"Skills: (.+?)(?: -|$)", result)
        if skills:
            parsed["Skills"] = [s.strip() for s in skills[0].split(",") if s.strip()]
        education = re.findall(r"Education: (.+?)(?: -|$)", result)
        if education:
            parsed["Education"] = [education[0].strip()]
        certs = re.findall(r"Certifications: (.+?)(?: -|$)", result)
        if certs and certs[0].strip():
            parsed["Certifications"] = [c.strip() for c in certs[0].split(",") if c.strip()]
        langs = re.findall(r"Languages: (.+?)(?: -|$)", result)
        if langs:
            parsed["Languages"] = [l.strip() for l in langs[0].split(",") if l.strip()]

    return parsed


def extract_entities(text):
    ner_results = ner_pipeline(text[:1000])
    entities = {}
    for entity in ner_results:
        label = entity['entity_group']
        if label not in entities:
            entities[label] = []
        if entity['word'] not in entities[label]:
            entities[label].append(entity['word'])
    return entities


def convert_to_date(date_str):
    try:
        return datetime.strptime(date_str.strip(), "%b %Y")
    except:
        try:
            return datetime.strptime(date_str.strip(), "%Y")
        except:
            return datetime.strptime("Jan " + date_str.strip(), "%b %Y")


def estimate_experience_years(text):
    years = []
    matches = re.findall(
        r'(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s?\d{4})\s*[-–]\s*'
        r'(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\.?\s?\d{4}|Present)',
        text, re.IGNORECASE
    )
    for start, end in matches:
        try:
            start_date = convert_to_date(start)
            end_date = convert_to_date(end) if "present" not in end.lower() else datetime.now()
            diff_years = (end_date - start_date).days / 365
            if diff_years > 0:
                years.append(diff_years)
        except:
            continue

    if years:
        return round(sum(years), 1)
    else:
        return 1  


def analyze_resume(file_path: str):
    print("📄 Extracting text...")
    resume_text = extract_text_from_pdf(file_path)

    print("🧠 Parsing with LaMini-Flan-T5...")
    parsed_json = analyze_with_lamini(resume_text)

    print("🔍 Extracting named entities...")
    ner_entities = extract_entities(resume_text)

    print("🔎 Extracting email and phone...")
    email = extract_email(resume_text)
    phone = extract_phone(resume_text)

    print("📊 Estimating years of experience...")
    exp_years = estimate_experience_years(resume_text + "\n" + json.dumps(parsed_json))

    print("✅ Analysis complete.")
    return {
        "parser_output": parsed_json,
        "ner_entities": ner_entities,
        "email": email,
        "phone": phone,
        "experience_years": exp_years,
    }

#     from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain
# from langchain.llms import HuggingFacePipeline
# from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
# import pdfplumber
# import re
# import json
# from datetime import datetime
# from typing import Dict, Any, Optional
# import logging

# # === Setup logging ===
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class ResumeAnalyzer:
#     def __init__(self, resume_parser_model_path: str, ner_model_path: str):
#         """Initialize the resume analyzer and load models once"""
#         self.resume_parser_model_path = resume_parser_model_path
#         self.ner_model_path = ner_model_path
#         self.llm = None
#         self.ner_pipeline = None
#         self.resume_chain = None
#         self._initialize_models()
    
#     def _initialize_models(self):
#         """Initialize models safely with error handling"""
#         try:
#             logger.info("Loading LaMini-Flan model...")
#             tokenizer = AutoTokenizer.from_pretrained(self.resume_parser_model_path)
#             model = AutoModelForSeq2SeqLM.from_pretrained(self.resume_parser_model_path)
#             llm_pipeline = pipeline(
#                 "text2text-generation", 
#                 model=model, 
#                 tokenizer=tokenizer, 
#                 max_length=1024,
#                 temperature=0.1  # for more consistent output
#             )
#             self.llm = HuggingFacePipeline(pipeline=llm_pipeline)
            
#             logger.info("Loading RoBERTa-NER model...")
#             self.ner_pipeline = pipeline(
#                 "ner", 
#                 model=self.ner_model_path, 
#                 aggregation_strategy="simple"
#             )
            
#             self._setup_prompt_chain()
            
#         except Exception as e:
#             logger.error(f"Error loading models: {e}")
#             raise
    
#     def _setup_prompt_chain(self):
#         """Setup the prompt chain with improved template"""
#         improved_prompt_template = """
#         You are a professional resume parser. Extract the following information from the resume in JSON format:

#         Required fields:
#         - "Full Name" (full name text)
#         - "Phone Number"
#         - "Email"
#         - "Skills" (list of skills)
#         - "Languages" (list of languages)
#         - "Work Experience" (list of experiences)
#         - "Education" (list of education entries)
#         - "Certifications" (list of certificates)

#         Resume:
#         {text}

#         Notes:
#         - Output must be valid JSON
#         - Use arrays for multiple entries
#         - If a field is missing, return an empty list []
#         - Ensure JSON is parseable

#         Output:
#         """
        
#         resume_prompt = PromptTemplate(
#             input_variables=["text"], 
#             template=improved_prompt_template
#         )
#         self.resume_chain = LLMChain(llm=self.llm, prompt=resume_prompt)

#     def extract_text_from_pdf(self, path: str) -> str:
#         """Extract text from PDF with better error handling"""
#         try:
#             with pdfplumber.open(path) as pdf:
#                 text_parts = []
#                 for i, page in enumerate(pdf.pages):
#                     page_text = page.extract_text() or ''
#                     cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
#                     if cleaned_text:
#                         text_parts.append(cleaned_text)
                
#                 full_text = " ".join(text_parts)
#                 if not full_text:
#                     logger.warning(f"No text extracted from PDF: {path}")
                
#                 return full_text
                
#         except Exception as e:
#             logger.error(f"Error extracting text from PDF: {e}")
#             return ""

#     def extract_contact_info(self, text: str) -> Dict[str, Optional[str]]:
#         """Extract contact information"""
#         # Email
#         email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
#         email_match = re.search(email_pattern, text)
#         email = email_match.group(0) if email_match else None
        
#         # Phone number patterns
#         phone_patterns = [
#             r'(\+?\d{1,3})?[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}',  # international
#             r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # local
#             r'\(\d{3}\)\s*\d{3}[-.]?\d{4}'  # parentheses
#         ]
        
#         phone = None
#         for pattern in phone_patterns:
#             phone_match = re.search(pattern, text)
#             if phone_match:
#                 phone = re.sub(r'[\s\-\.]', '', phone_match.group(0))
#                 break
        
#         return {"email": email, "phone": phone}

#     def extract_entities(self, text: str) -> Dict[str, list]:
#         """Extract named entities"""
#         sample_text = text[:1500]
        
#         try:
#             ner_results = self.ner_pipeline(sample_text)
#             entities = {}
            
#             for entity in ner_results:
#                 label = entity['entity_group']
#                 word = entity['word'].strip()
                
#                 if label not in entities:
#                     entities[label] = []
                
#                 if word and word not in entities[label]:
#                     entities[label].append(word)
            
#             return entities
            
#         except Exception as e:
#             logger.error(f"Error in NER extraction: {e}")
#             return {}

#     def estimate_experience_years(self, text: str) -> float:
#         """Estimate years of experience"""
#         date_pattern = r'(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{4}|\b\d{4})\s*[-–—]\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{4}|\b\d{4}|Present|Now|Current)'
#         matches = re.findall(date_pattern, text, re.IGNORECASE)
        
#         total_years = 0.0
#         valid_periods = []
        
#         for start_str, end_str in matches:
#             try:
#                 start_date = self._parse_date(start_str)
#                 end_date = self._parse_date(end_str) if not re.search(r'(present|now|current)', end_str, re.IGNORECASE) else datetime.now()
                
#                 if start_date and end_date:
#                     years_diff = (end_date - start_date).days / 365.25
#                     if 0 < years_diff < 50:
#                         valid_periods.append(years_diff)
                        
#             except Exception:
#                 continue
        
#         if valid_periods:
#             total_years = max(valid_periods) if len(valid_periods) > 1 else sum(valid_periods)
        
#         return round(total_years, 1) if total_years > 0 else 1.0

#     def _parse_date(self, date_str: str) -> Optional[datetime]:
#         """Parse dates in various formats"""
#         date_formats = [
#             "%b %Y", "%B %Y", "%m/%Y", "%Y-%m", "%Y",
#             "%b.%Y", "%B.%Y", "%b %d %Y", "%B %d %Y"
#         ]
        
#         cleaned_date = re.sub(r'[^\w\s/]', '', date_str.strip())
        
#         for fmt in date_formats:
#             try:
#                 return datetime.strptime(cleaned_date, fmt)
#             except ValueError:
#                 continue
        
#         return None

#     def safe_json_parse(self, text: str) -> Dict[str, Any]:
#         """Safely parse JSON with fallback"""
#         try:
#             json_match = re.search(r'\{.*\}', text, re.DOTALL)
#             if json_match:
#                 return json.loads(json_match.group())
#         except json.JSONDecodeError:
#             pass
        
#         return {
#             "Full Name": "",
#             "Phone Number": "",
#             "Email": "",
#             "Skills": [],
#             "Languages": [],
#             "Work Experience": [],
#             "Education": [],
#             "Certifications": []
#         }

#     def analyze_resume(self, file_path: str) -> Dict[str, Any]:
#         """Main resume analysis function"""
#         logger.info("📄 Extracting text from PDF...")
#         resume_text = self.extract_text_from_pdf(file_path)
        # Languages (spoken or written human languages, not programming languages)
#         if not resume_text:
#             logger.error("No text extracted from resume")
#             return self._get_empty_result()
        
#         logger.info("🔍 Running parallel extractions...")
#         contact_info = self.extract_contact_info(resume_text)
#         ner_entities = self.extract_entities(resume_text)
        
#         logger.info("🧠 Parsing with LLM...")
#         try:
#             parsed_result = self.resume_chain.run(resume_text)
#             parsed_json = self.safe_json_parse(parsed_result)
#         except Exception as e:
#             logger.error(f"Error in LLM parsing: {e}")
#             parsed_json = self._get_default_parsed_output()
        
#         logger.info("📊 Estimating experience years...")
#         exp_years = self.estimate_experience_years(resume_text)
        
#         logger.info("✅ Analysis complete!")
        
#         return {
#             "parser_output": parsed_json,
#             "ner_entities": ner_entities,
#             "email": contact_info["email"],
#             "phone": contact_info["phone"],
#             "experience_years": exp_years,
#         }
    
#     def _get_empty_result(self) -> Dict[str, Any]:
#         """Return empty result with consistent structure"""
#         return {
#             "parser_output": self._get_default_parsed_output(),
#             "ner_entities": {},
#             "email": None,
#             "phone": None,
#             "experience_years": 0.0,
#         }
    
#     def _get_default_parsed_output(self) -> Dict[str, Any]:
#         """Default output structure"""
#         return {
#             "Full Name": "",
#             "Phone Number": "",
#             "Email": "",
#             "Skills": [],
#             "Languages": ["Arabic"],
#             "Work Experience": [],
#             "Education": [],
#             "Certifications": []
#         }

# # === Easy interface function ===
# def analyze_resume_with_langchain(file_path: str) -> Dict[str, Any]:
#     analyzer = ResumeAnalyzer(
#         resume_parser_model_path=r"D:\LaMini-Flan",
#         ner_model_path=r"D:\RoBERTa-NER"
#     )
#     return analyzer.analyze_resume(file_path)

# # === Usage example ===
# if __name__ == "__main__":
#     result = analyze_resume_with_langchain("path/to/your/resume.pdf")
#     print(json.dumps(result, indent=2, ensure_ascii=False))

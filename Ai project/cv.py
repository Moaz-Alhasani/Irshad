import os
import re
import json
import pdfplumber
from dotenv import load_dotenv
from datetime import datetime
import google.generativeai as genai 
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")
genai.configure(api_key=api_key)



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
    return round(sum(years), 1) if years else 1


def analyze_with_gemini(text):
    prompt = f"""
You are a professional resume parser.
Extract only these fields and return valid JSON (no explanation, no markdown):

{{
  "summary": "",
  "skills": [],
  "education": {{
      "degree": "",
      "university": "",
      "major": ""
  }},
  "certifications": [],
  "languages": [],
  "location": "",
  "experience_years": ""
}}

Resume Text:
{text}

Rules:
- In "summary", provide a concise professional overview (1-3 sentences) of the candidate.
- In "skills", extract **programming languages, frameworks, libraries, AI/ML/NLP tools, LLMs, and generative AI technologies**.
- Include skills like Python, Node.js, React, Django, TensorFlow, PyTorch, NLP, RAG, LLMs, HuggingFace, OpenAI, LangChain, etc.
- Do NOT include soft skills or conceptual skills like "OOP", "API Design", "Teamwork", "Security", "Documentation", etc.
- Return strictly valid JSON only.
"""

    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    raw_output = response.text.strip()


    match = re.search(r"\{[\s\S]*\}", raw_output)
    if match:
        raw_output = match.group(0)

    try:
        return json.loads(raw_output)
    except Exception:
        print("Gemini output invalid JSON:\n", raw_output)
        return {}

def analyze_resume_with_gemini(file_path):
    print("Extracting text from PDF...")
    resume_text = extract_text_from_pdf(file_path)
    print(f" Extracted text length: {len(resume_text)}")

    print("Parsing with Gemini...")
    parsed_json = analyze_with_gemini(resume_text) or {}
    print(f"Gemini parsed data: {parsed_json}")

    print("Extracting email and phone...")
    email = extract_email(resume_text)
    phone = extract_phone(resume_text)
    print(f"Email: {email}, Phone: {phone}")

    print("Estimating experience...")
    exp_years = estimate_experience_years(resume_text)
    print(f"⏱Estimated experience: {exp_years} years")

    print("Done.")

    return {
        "parser_output": {
            "summary": parsed_json.get("summary", ""), 
            "skills": parsed_json.get("skills", []),
            "education": {
                "degree": parsed_json.get("education", {}).get("degree", ""),
                "major": parsed_json.get("education", {}).get("major", ""),
                "university": parsed_json.get("education", {}).get("university", ""),
            },
            "certifications": parsed_json.get("certifications", []),
            "languages": parsed_json.get("languages", ["Arabic"]),
            "location": parsed_json.get("location", ""),
            "experience_years": parsed_json.get("experience_years", exp_years),
        },
        "email": email,
        "phone": phone,
        "estimated_experience_years": exp_years
    }

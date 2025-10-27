import pdfplumber
import re
import json
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

# مسارات النماذج
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


def clean_languages(languages):
    """
    إزالة العناصر الوصفية غير الصحيحة من قائمة اللغات
    وإضافة "Arabic" دائمًا في البداية.
    """
    # إزالة العناصر الوصفية
    cleaned = [lang for lang in languages if lang.lower() not in
               ["spoken or written human languages", "not programming languages"]]
    
    # إذا القائمة فارغة بعد التنظيف، ضع Arabic فقط
    if not cleaned:
        cleaned = ["Arabic"]
    # تأكد من وجود Arabic في البداية
    elif "Arabic" not in cleaned:
        cleaned.insert(0, "Arabic")
    
    return cleaned


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

    parsed = {"Skills": [], "Education": [], "Certifications": [], "Languages": []}

    try:
        parsed = json.loads(result)
        parsed["Languages"] = clean_languages(parsed.get("Languages", []))
    except json.JSONDecodeError:
        # fallback parsing
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
        parsed["Languages"] = clean_languages(parsed.get("Languages", []))

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


# مثال على الاستخدام
# result = analyze_resume(r"D:\Resumes\example.pdf")
# print(json.dumps(result, indent=4, ensure_ascii=False))

from flask import Flask, request, jsonify
from cv import analyze_resume_with_gemini
from embeddings import compute_embedding
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import CrossEncoder, SentenceTransformer,util
from embeddings import compute_embedding
import numpy as np
import joblib
import math
import os
import json
import torch
app = Flask(__name__)



BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
MODEL_DIR = os.path.join(BASE_DIR, "modelSalary")

model = joblib.load(os.path.join(MODEL_DIR, 'salary_predictor.pkl'))
le_edu = joblib.load(os.path.join(MODEL_DIR, 'le_edu.pkl'))
le_job = joblib.load(os.path.join(MODEL_DIR, 'le_job.pkl'))
scaler_X = joblib.load(os.path.join(MODEL_DIR, 'scaler_X.pkl'))
scaler_y = joblib.load(os.path.join(MODEL_DIR, 'scaler_y.pkl'))
cross_encoder = CrossEncoder(r"D:\cross_encoder_MiniLM_L12")
e5_model = SentenceTransformer(r"D:\intfloat-multilingual-e5-small")

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        file_path = data.get("file_path")
        print(f"📁 Received file path: {file_path}")

        if not file_path:
            return jsonify({"error": "file_path is required"}), 400

        result = analyze_resume_with_gemini(file_path)
        print(f"🔍 Analysis result: {result}")
        
        parser_output = result.get("parser_output", {})
        education = parser_output.get("education", {})

        response = {
            "parser_output": {
                "skills": parser_output.get("skills", []),
                "education": {
                    "degree": education.get("degree", ""),
                    "university": education.get("university", ""),
                    "major": education.get("major", "")
                },
                "certifications": parser_output.get("certifications", []),
                "languages": parser_output.get("languages", ["Arabic"]),
                "location": parser_output.get("location", ""),
                "experience_years": parser_output.get("experience_years", 0),
            },
            "email": result.get("email"),
            "phone": result.get("phone"),
            "estimated_experience_years": result.get("estimated_experience_years", 1)
        }
        
        print("📤 Final response:", json.dumps(response, indent=2))
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error in analyze route: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

def build_job_text(job):
    parts = []
    for edu in job.get("requiredEducation", []):
        try:
            edu_parsed = json.loads(edu)
            if isinstance(edu_parsed, list):
                parts.extend(edu_parsed)
            else:
                parts.append(str(edu_parsed))
        except:
            parts.append(str(edu))
    parts.extend(job.get("requiredSkills", []))
    if job.get("requiredExperience", 0) > 0:
        parts.append(f"experience {job['requiredExperience']} years")
    if job.get("title"):
        parts.append(job["title"])
    if job.get("description"):
        parts.append(job["description"])
    return " ".join(parts).lower()

@app.route("/get-similarity", methods=["POST"])
def get_similarity():
    data = request.get_json()
    resume_text = data.get("resume_text", "")
    jobs = data.get("jobs", [])

    if not resume_text or not jobs:
        return jsonify([])

    job_texts = [build_job_text(job) for job in jobs]
    job_ids = [job["id"] for job in jobs]

    # حساب embeddings باستخدام SentenceTransformer
    resume_emb = compute_embedding([resume_text])
    job_embs = [compute_embedding([jt]) for jt in job_texts]

    # حساب تشابه E5 (Cosine similarity)
    e5_scores = [np.dot(resume_emb, jb) / (np.linalg.norm(resume_emb)*np.linalg.norm(jb) + 1e-10) for jb in job_embs]

    top_n = min(10, len(jobs))
    top_indices = np.argsort(e5_scores)[::-1][:top_n]

    pairs, filtered_ids = [], []
    for idx in top_indices:
        pairs.append([resume_text, job_texts[idx]])
        filtered_ids.append(job_ids[idx])

    # إعادة الترتيب باستخدام CrossEncoder
    raw_scores = cross_encoder.predict(pairs)
    sigmoid_scores = [1 / (1 + math.exp(-s)) for s in raw_scores]

    results = [{"jobId": jid, "score": float(score)} for jid, score in zip(filtered_ids, sigmoid_scores)]
    results.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(results)



def group_education(education):
    education = str(education).lower().strip()

    high_school_keywords = ['high school', 'secondary school', 'diploma']
    bachelor_keywords = ['bachelor', "bachelor's", 'undergraduate', 'bsc', 'b.eng', 'bachelor degree']
    master_keywords = ['master', "master's", 'msc', 'postgraduate', 'm.eng', 'graduate degree']
    phd_keywords = ['phd', 'doctorate', 'doctoral', 'ph.d']

    if any(keyword in education for keyword in phd_keywords):
        return 'PhD'
    elif any(keyword in education for keyword in master_keywords):
        return 'Masters'
    elif any(keyword in education for keyword in bachelor_keywords):
        return 'Bachelors'
    elif any(keyword in education for keyword in high_school_keywords):
        return 'High School'
    else:
        return 'Other'


def categorize_job_title(job_title, skills=None):
    job_title = str(job_title).lower()
    skills = [s.lower() for s in skills] if skills else []

    ai_keywords = ['ai', 'artificial intelligence', 'nlp', 'machine learning', 'ml', 
                   'deep learning', 'data scientist', 'computer vision']
    programming_keywords = [
        'software', 'developer', 'backend', 'frontend', 'fullstack', 'node', 'python',
        'java', 'c#', 'php', 'nestjs', 'typescript', 'javascript', 'react', 'vue', 'angular',
        'django', 'flask', 'ruby', 'rails'
    ]

    # عدّ الكلمات في المسمى والمهارات
    ai_count = sum(1 for k in ai_keywords if k in job_title or any(k in s for s in skills))
    programming_count = sum(1 for k in programming_keywords if k in job_title or any(k in s for s in skills))

    # منطق ذكي لتحديد التصنيف بناءً على كثافة المهارات والمسمى
    if ai_count >= 2 and ai_count >= programming_count:
        return 'AI Engineer/NLP/CV'
    elif programming_count >= 3:
        return 'Software/Developer'
    elif any(keyword in job_title for keyword in ['manager', 'director', 'vp']):
        return 'Manager/Director/VP'
    elif any(keyword in job_title for keyword in ['sales', 'representative']):
        return 'Sales'
    elif any(keyword in job_title for keyword in ['marketing', 'social media']):
        return 'Marketing/Social Media'
    elif any(keyword in job_title for keyword in ['product', 'designer']):
        return 'Product/Designer'
    elif any(keyword in job_title for keyword in ['hr', 'human resources']):
        return 'HR/Human Resources'
    elif any(keyword in job_title for keyword in ['financial', 'accountant']):
        return 'Financial/Accountant'
    elif 'project manager' in job_title:
        return 'Project Manager'
    elif any(keyword in job_title for keyword in ['it', 'support']):
        return 'IT/Technical Support'
    elif any(keyword in job_title for keyword in ['operations', 'supply chain']):
        return 'Operations/Supply Chain'
    elif any(keyword in job_title for keyword in ['customer service', 'receptionist']):
        return 'Customer Service/Receptionist'
    else:
        return 'Other'



def predict_salary(age, education_level, job_title, experience, skills=None):
    age = float(age)
    experience = float(experience)

    processed_job_title = categorize_job_title(job_title, skills)
    grouped_education = group_education(education_level)

    try:
        job_encoded = le_job.transform([processed_job_title])[0]
    except ValueError:
        job_encoded = le_job.transform(['Other'])[0]

    try:
        edu_encoded = le_edu.transform([grouped_education])[0]
    except ValueError:
        edu_encoded = le_edu.transform(['Other'])[0]

    X_input = np.array([[age, experience]])
    X_scaled = scaler_X.transform(X_input)
    X_final = np.array([[X_scaled[0][0], edu_encoded, job_encoded, X_scaled[0][1]]])

    salary_scaled = model.predict(X_final)
    salary_pred = scaler_y.inverse_transform(np.array(salary_scaled).reshape(-1, 1))[0][0]

    return salary_pred



@app.route("/predict-salary", methods=["POST"])
def predict_salary_endpoint():
    data = request.get_json()

    try:
        age = data.get("age")
        experience = data.get("experience_years")
        education = data.get("education")
        job_title = data.get("job_title")
        skills = data.get("skills", [])  # المهارات الجديدة

        if None in [age, experience, education, job_title]:
            return jsonify({"error": "Missing required fields"}), 400

        salary = predict_salary(age, education, job_title, experience, skills)

        rounded_salary = int(round(salary / 100) * 100)
        monthly_salary = int(round(rounded_salary / 12 / 100) * 100)

        return jsonify({
            "estimated_salary": rounded_salary,
            "monthly_salary": monthly_salary
        }), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

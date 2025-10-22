from flask import Flask, request, jsonify
from cv import analyze_resume
from embeddings import compute_embedding
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import CrossEncoder
import numpy as np
import joblib
import math
import os
app = Flask(__name__)



BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
MODEL_DIR = os.path.join(BASE_DIR, "modelSalary")

model = joblib.load(os.path.join(MODEL_DIR, 'salary_predictor.pkl'))
le_edu = joblib.load(os.path.join(MODEL_DIR, 'le_edu.pkl'))
le_job = joblib.load(os.path.join(MODEL_DIR, 'le_job.pkl'))
scaler_X = joblib.load(os.path.join(MODEL_DIR, 'scaler_X.pkl'))
scaler_y = joblib.load(os.path.join(MODEL_DIR, 'scaler_y.pkl'))
cross_encoder = CrossEncoder(r"D:\cross_encoder_MiniLM_L12")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    file_path = data.get("file_path")
    if not file_path:
        return jsonify({"error": "file_path is required"}), 400

    result = analyze_resume(file_path)
    print("🔹 Full extracted result:")
    print(result)
    response = {
        "parser_output": result.get("parser_output", {}),
        "ner_entities": result.get("ner_entities", {}),
        "email": result.get("email"),
        "phone": result.get("phone"),
        "estimated_experience_years": result.get("experience_years", 1),
    }

    return jsonify(response)


@app.route("/get-similarity", methods=["POST"])
def get_similarity():
    data = request.get_json()
    resume_text = data.get("resume_text", "")
    jobs = data.get("jobs", [])

    if not resume_text or not jobs:
        return jsonify([])

    pairs = []
    job_ids = []

    for job in jobs:
        job_id = job.get("id")
        job_text_parts = []

        if "required" in job:
            job_text_parts.append(" ".join(job["required"]))
        if "experience_years" in job and job["experience_years"]:
            job_text_parts.append(f"Experience: {job['experience_years']} years")

        job_text = " ".join(job_text_parts)
        if not job_text.strip():
            continue

        pairs.append([resume_text, job_text])
        job_ids.append(job_id)

    if not pairs:
        return jsonify([])

    raw_scores = cross_encoder.predict(pairs)

    # تحويل القيم إلى 0-1 باستخدام sigmoid
    scores = [1 / (1 + math.exp(-s)) for s in raw_scores]

    results = [{"jobId": job_id, "score": float(score)} for job_id, score in zip(job_ids, scores)]
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


def categorize_job_title(job_title):
    job_title = str(job_title).lower()
    if any(keyword in job_title for keyword in ['ai engineer', 'nlp', 'computer vision']):
        return 'AI Engineer/NLP/CV'
    elif any(keyword in job_title for keyword in ['data scientist', 'data engineer', 'machine learning engineer', 'ml engineer', 'ml', 'data']):
        return 'Data/ML Engineer'
    elif any(keyword in job_title for keyword in [
        'software', 'developer', 'backend', 'front end', 'frontend', 'full stack', 
        'fullstack', 'node', 'node.js', 'php', 'nestjs', 'java', 'c#', 'python', 
        'ruby', 'rails', 'django', 'flask', 'angular', 'react', 'vue', 'typescript', 'javascript'
    ]):
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


def predict_salary(age, education_level, job_title, experience):
    processed_job_title = categorize_job_title(job_title)
    grouped_education = group_education(education_level)

    try:
        job_encoded = le_job.transform([processed_job_title])[0]
    except ValueError:
        job_encoded = le_job.transform(['Other'])[0]

    try:
        edu_encoded = le_edu.transform([grouped_education])[0]
    except ValueError:
        edu_encoded = le_edu.transform([le_edu.classes_[0]])[0]

    X_input = np.array([[age, experience]])
    X_scaled = scaler_X.transform(X_input)
    X_final = np.array([[X_scaled[0][0], edu_encoded, job_encoded, X_scaled[0][1]]])

    salary_scaled = model.predict(X_final)
    salary_pred = scaler_y.inverse_transform(salary_scaled.reshape(-1, 1))[0][0]

    return salary_pred


@app.route("/predict-salary", methods=["POST"])
def predict_salary_endpoint():
    data = request.get_json()

    try:
        age = data.get("age", 0)
        experience = data.get("experience_years", 0)
        education = data.get("education", "")
        job_title = data.get("job_title", "")
        
        salary = predict_salary(age, education, job_title, experience)
        rounded_salary = int(round(salary / 100) * 100)
        monthly_salary = int(round(rounded_salary / 12 / 100) * 100)
        return jsonify({
            "estimated_salary": rounded_salary,
            "monthly_salary": monthly_salary
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

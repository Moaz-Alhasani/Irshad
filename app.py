from flask import Flask, request, jsonify
from cv import analyze_resume
from embeddings import compute_embedding
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import joblib
import math
import os
app = Flask(__name__)



BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
MODEL_DIR = os.path.join(BASE_DIR, "model")           

tfidf_skills = joblib.load(os.path.join(MODEL_DIR, "tfidf_skills.pkl"))
tfidf_edu = joblib.load(os.path.join(MODEL_DIR, "tfidf_edu.pkl"))
role_encoder = joblib.load(os.path.join(MODEL_DIR, "role_encoder.pkl"))
work_encoder = joblib.load(os.path.join(MODEL_DIR, "work_encoder.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
model = joblib.load(os.path.join(MODEL_DIR, "xgboost_model.pkl"))

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    file_path = data.get("file_path")
    if not file_path:
        return jsonify({"error": "file_path is required"}), 400

    result = analyze_resume(file_path)
    print("🔹 Full extracted result:")
    print(result)

    skills_embedding = result.get("skills_embedding", [])
    skills_embedding = [float(x) for x in skills_embedding]

    response = {
        "parser_output": result.get("parser_output", {}),
        "ner_entities": result.get("ner_entities", {}),
        "email": result.get("email"),
        "phone": result.get("phone"),
        "estimated_experience_years": result.get("experience_years", 1),
        "skills_embedding": skills_embedding
    }

    return jsonify(response)


@app.route("/get-embedding", methods=["POST"])
def get_embedding():
    data = request.get_json()
    texts = data.get('texts', [])

    if not texts:
        return jsonify({'embedding': []}), 400

    avg_embedding = compute_embedding(texts)

    return jsonify({'embedding': avg_embedding})


def fix_embedding_length(a, b):
    len_a, len_b = len(a), len(b)
    if len_a == len_b:
        return np.array(a, dtype=float), np.array(b, dtype=float)
    max_len = max(len_a, len_b)
    a = list(a) + [0.0] * (max_len - len_a)
    b = list(b) + [0.0] * (max_len - len_b)
    return np.array(a, dtype=float), np.array(b, dtype=float)


@app.route("/get-similarity", methods=["POST"])
def get_similarity():
    data = request.get_json()
    resume_embedding = data.get("resume_embedding", [])
    jobs = data.get("jobs", [])

    print("📥 Received resume embedding:", resume_embedding[:10], "... len =", len(resume_embedding))
    print("📥 Received jobs count:", len(jobs))
    for job in jobs:
        print(f"   Job {job.get('id')} embedding len = {len(job.get('embedding', []))}")

    if not resume_embedding or not jobs:
        return jsonify([])

    results = []
    for job in jobs:
        job_id = job.get("id")
        job_embedding = job.get("embedding", [])
        if not job_embedding:
            print(f"Skipping job {job_id}, empty embedding")
            continue
        try:
            fixed_resume, fixed_job = fix_embedding_length(resume_embedding, job_embedding)
            score = float(cosine_similarity(fixed_resume.reshape(1, -1), fixed_job.reshape(1, -1))[0][0])
            results.append({"jobId": job_id, "score": score})
        except Exception as e:
            print(f"Error with job {job_id}: {e}")
            continue

    print("Similarity results:", results)
    return jsonify(results)


@app.route("/predict-salary", methods=["POST"])
def predict_salary():
    data = request.get_json()
    try:
        exp_years = data.get("experience_years", 1)
        skills_str = data.get("skills", "")
        education_str = data.get("education", "")
        role = data.get("role", "AI")
        work_type = data.get("work_type", "Remote")

  
        skills_vec = tfidf_skills.transform([skills_str]).toarray()
        edu_vec = tfidf_edu.transform([education_str.lower()]).toarray()
        role_vec = role_encoder.transform([[role]])
        work_vec = work_encoder.transform([[work_type]])
        exp_vec = np.array([[exp_years]])

  
        final_vec = np.concatenate(
            [exp_vec, skills_vec, edu_vec, role_vec, work_vec], axis=1
        )
        final_vec = scaler.transform(final_vec)

 
        salary_pred = model.predict(final_vec)[0]
        salary_rounded = int(math.ceil(salary_pred / 100) * 100)

        monthly_salary = salary_rounded / 12
        monthly_salary_rounded = int(math.ceil(monthly_salary / 100) * 100)

        return jsonify({
            "estimated_salary": monthly_salary_rounded,
            "monthly_salary": monthly_salary_rounded
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

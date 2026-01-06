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
import pandas as pd
app = Flask(__name__)



BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
MODEL_DIR = os.path.join(BASE_DIR, "modelSalary")

model = joblib.load(os.path.join(MODEL_DIR, 'salary_predictor.pkl'))
edu_importance = joblib.load(os.path.join(MODEL_DIR,'edu_importance.pkl'))
job_importance = joblib.load(os.path.join(MODEL_DIR,'job_importance.pkl'))
scaler_X = joblib.load(os.path.join(MODEL_DIR, 'scaler_X.pkl'))
scaler_y = joblib.load(os.path.join(MODEL_DIR, 'scaler_y.pkl'))
# embedder = SentenceTransformer(r'D:\all-mpnet-base-v2')
embedder = SentenceTransformer(r'F:\model\all-mpnet-base-v2')



@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        file_path = data.get("file_path")
        print(f"Received file path: {file_path}")

        if not file_path:
            return jsonify({"error": "file_path is required"}), 400

        result = analyze_resume_with_gemini(file_path)
        print(f"🔍 Analysis result: {result}")
        
        parser_output = result.get("parser_output", {})
        education = parser_output.get("education", {})

        response = {
            "parser_output": {
                "summary": parser_output.get("summary", ""),
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
        
        print("Final response:", json.dumps(response, indent=2))
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in analyze route: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    

# modelembe = SentenceTransformer(r'D:\multi-qa-mpnet-base-dot-v1')
modelembe = SentenceTransformer(r'F:\model\multi-qa-mpnet-base-dot-v1')


@app.route("/get-similarity", methods=["POST"])
def get_similarity():
    data = request.get_json() or {}
    resume_text = (data.get("resume_text") or "").strip()
    resume_skills = set([s.lower() for s in data.get("resume_skills") or []])
    resume_education = set([e.lower() for e in data.get("resume_education") or []])
    resume_experience = 0.0
    if data.get("resume_experience"):
        try:
            resume_experience = float(data.get("resume_experience")[0].split()[-2])
        except:
            resume_experience = 0.0

    jobs = data.get("jobs") or []
    if not resume_text or not jobs:
        return jsonify([])

    job_scores = []

    resume_skill_list = list(resume_skills)
    if resume_skill_list:
        resume_skill_embs = modelembe.encode(resume_skill_list, convert_to_tensor=True)
    else:
        resume_skill_embs = None

    for job in jobs:
        job_skills = set([s.lower() for s in job.get("requiredSkills") or []])
        job_edu = set([e.lower() for e in job.get("requiredEducation") or []])
        job_exp = float(job.get("requiredExperience") or 0)

        skill_score = 0.0
        job_skill_list = list(job_skills)
        if resume_skill_embs is not None and job_skill_list:
            job_skill_embs = modelembe.encode(job_skill_list, convert_to_tensor=True)
            cos_sim_matrix = util.cos_sim(resume_skill_embs, job_skill_embs)  
            skill_score = cos_sim_matrix.max(dim=0).values.mean().item()
        

        edu_score = 0.0
        for edu in resume_education:
            for job_edu_req in job_edu:
                if edu in job_edu_req or job_edu_req in edu:
                    edu_score = 1.0
                    break
            if edu_score == 1.0:
                break

        exp_score = min(resume_experience / max(job_exp, 1), 1.0)
        base_score = 0.5 * skill_score + 0.3 * edu_score + 0.2 * exp_score

        job_scores.append({
            "job": job,
            "base_score": base_score
        })

    job_scores = sorted(job_scores, key=lambda x: x["base_score"], reverse=True)
    top_jobs = job_scores[:50]
    job_texts = [
        f"{j['job']['title']} {j['job']['description']} {' '.join(j['job']['requiredSkills'])}"
        for j in top_jobs
    ]
    job_ids = [j['job']['id'] for j in top_jobs]

    resume_emb = modelembe.encode(resume_text, convert_to_tensor=True)
    job_embs = modelembe.encode(job_texts, convert_to_tensor=True)

    text_scores = util.cos_sim(resume_emb, job_embs).cpu().numpy().flatten()

    results = []
    for jid, base_s, text_s in zip(job_ids, [j['base_score'] for j in top_jobs], text_scores):
        final_score = 0.5 * base_s + 0.5 * text_s
        results.append({
            "jobId": jid,
            "final_score": float(final_score)
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)
    return jsonify(results[:10])





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
    elif any(keyword in job_title for keyword in [
        'data scientist', 'data engineer', 'machine learning engineer', 'ml engineer', 'ml', 'data']):
        return 'Data/ML Engineer'
    elif any(keyword in job_title for keyword in [
        'software', 'developer', 'backend', 'frontend', 'full stack', 
        'fullstack', 'node', 'node.js', 'php', 'nestjs', 'java', 'c#', 'python', 
        'ruby', 'rails', 'django', 'flask', 'angular', 'react', 'vue', 'typescript', 'javascript']):
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


def match_skills(candidate_skills, job_skills, threshold=0.7):
    if not candidate_skills or not job_skills:
        return []
    candidate_emb = embedder.encode(candidate_skills, convert_to_tensor=True)
    job_emb = embedder.encode(job_skills, convert_to_tensor=True)
    cosine_scores = util.cos_sim(candidate_emb, job_emb)
    matched_skills = []
    for i, c in enumerate(candidate_skills):
        for j, jskill in enumerate(job_skills):
            if cosine_scores[i][j] > threshold:
                matched_skills.append(jskill)
    return list(set(matched_skills))

def predict_salary(candidate_skills, job_skills, education, years_experience, job_title):
    matched_skills = match_skills(candidate_skills, job_skills)
    if candidate_skills and job_skills:
        candidate_emb = embedder.encode(candidate_skills, convert_to_tensor=True)
        job_emb = embedder.encode(job_skills, convert_to_tensor=True)
        cosine_scores = util.cos_sim(candidate_emb, job_emb)
        skill_score = float(cosine_scores.mean().item())
    else:
        skill_score = 0.0

    combined_text = " ".join(matched_skills + [job_title])
    job_category = categorize_job_title(combined_text)

    grouped_education = group_education(education)
    edu_encoded = edu_importance.get(grouped_education, 0)
    job_encoded = job_importance.get(job_category, 1)

    X_client = pd.DataFrame([[edu_encoded, job_encoded, years_experience]],
                            columns=['Education_Encoded', 'Job_Encoded', 'Years of Experience'])

    X_client = X_client[model.feature_names_in_]
    X_client[['Years of Experience']] = scaler_X.transform(X_client[['Years of Experience']])

    y_scaled = model.predict(X_client)
    y_pred = scaler_y.inverse_transform(y_scaled.reshape(-1, 1))[0, 0]


    edu_score = 1.0 if grouped_education != 'Other' else 0.5
    exp_score = min(years_experience / 10, 1.0)  

    final_similarity_score = round(0.6 * skill_score + 0.25 * edu_score + 0.15 * exp_score, 3)

    return {
        'estimated_salary': round(y_pred, 2),
        'job_category': job_category,
        'matched_skills': matched_skills,
        'similarity_score': final_similarity_score
    }



@app.route("/predict-salary", methods=["POST"])
def predict_salary_endpoint():
    try:
        data = request.get_json()

        candidate_skills = data.get("candidate_skills", [])
        job_skills = data.get("job_required_skills", [])
        education = (
            data.get("candidate_education")[0]
            if isinstance(data.get("candidate_education"), list) and len(data.get("candidate_education")) > 0
            else data.get("candidate_education")
        )
        years_experience = float(data.get("candidate_experience", 0))
        job_title = data.get("job_title", "")

        if not education or not candidate_skills:
            return jsonify({"error": "Missing candidate education or skills"}), 400

        result = predict_salary(candidate_skills, job_skills, education, years_experience, job_title)
        result["monthly_salary"] = round(result["estimated_salary"] / 12, 2)

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500







def text_similarity_embeddings(t1: str, t2: str):
    if not t1 or not t2:
        return 0.0
    emb = embedder.encode([t1, t2], convert_to_tensor=True)
    sim = util.cos_sim(emb[0], emb[1]).item()
    return float(sim)


@app.route("/predict-acceptance", methods=["POST"])
def predict_acceptance():
    data = request.get_json()

    candidate_skills = data.get("candidate_skills", [])
    job_title = data.get("job_title", "")
    job_required_skills = data.get("job_required_skills", [])
    job_description = data.get("job_description", "")


    matched = match_skills(candidate_skills, job_required_skills)
    skill_match_score = len(matched) / len(job_required_skills) if job_required_skills else 1.0

    resume_text = " ".join(candidate_skills)
    desc_score = text_similarity_embeddings(resume_text, job_description)
    title_score = text_similarity_embeddings(resume_text, job_title)

    acceptance_score = (
        (skill_match_score * 0.6) +
        (title_score * 0.20) +
        (desc_score * 0.20)
    )

    return jsonify({
        "acceptance_score": round(float(acceptance_score), 3),
        "matched_skills": matched
    })

if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

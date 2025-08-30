from flask import Flask, request, jsonify
from cv import analyze_resume
from embeddings import compute_embedding
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine_similarity

app = Flask(__name__)

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



@app.route('/get-similarity', methods=['POST'])
def get_similarity():
    data = request.get_json()
    resume_embedding = data.get('resume_embedding')
    jobs = data.get('jobs', [])

    if not resume_embedding or not jobs:
        return jsonify({"error": "Missing resume_embedding or jobs"}), 400

    results = []
    resume_vec = [resume_embedding]  
    for job in jobs:
        job_id = job.get('id')
        job_embedding = job.get('embedding')
        if not job_embedding:
            continue
        job_vec = [job_embedding]
        score = sklearn_cosine_similarity(resume_vec, job_vec)[0][0]
        results.append({"jobId": job_id, "score": float(score)})

    results = sorted(results, key=lambda x: x['score'], reverse=True)

    return jsonify(results)


if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

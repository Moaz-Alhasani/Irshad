from flask import Flask, request, jsonify
from cv import analyze_resume
from embeddings import compute_embedding

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


if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

from flask import Flask, request, jsonify
from cv import analyze_resume

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

    response = {
        "parser_output": result.get("parser_output", {}),
        "ner_entities": result.get("ner_entities", {}),
        "email": result.get("email"),
        "phone": result.get("phone"),
        "estimated_experience_years": result.get("experience_years", 1)
    }

    return jsonify(response)

if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)

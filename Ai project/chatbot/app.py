from flask import Flask, request, Response
from flask_cors import CORS
from google import genai
import json, os
app = Flask(__name__)
CORS(app)

# ⚠️ يفضّل نقل المفتاح إلى Environment Variable
client = genai.Client(api_key="AIzaSyA0wernW_WghGtvSWhaqkSkfD4LNqgmvRg")

# ================== Load FAQ ==================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "data.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    FAQ_DATA = json.load(f)

# ================== Fake FAISS ==================
class FakeFAISS:
    def __init__(self, data):
        self.data = data

    def similarity_search(self, query, k=3):
        query_words = set(query.split())
        best_match = None
        max_score = 0

        for item in self.data:
            q_words = set(item["question"].split())
            score = len(query_words & q_words)
            if score > max_score:
                max_score = score
                best_match = item

        return [best_match] if best_match and max_score > 0 else []

vectorstore = FakeFAISS(FAQ_DATA)

# ================== FAQ Match ==================
def faq_intent_match(user_question: str):
    user_words = set(user_question.split())
    for item in FAQ_DATA:
        if len(user_words & set(item["question"].split())) >= 2:
            return item["answer"]
    return None

# ================== Gemini ==================
def generate_with_gemini(question, context=""):
    prompt = f"""
أنت "رشاد بوت"، المساعد الذكي لمنصة إرشاد.

المعلومات:
{context}

السؤال:
{question}

الإجابة:
"""
    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )

        # استخراج النص بشكل آمن
        if (
            response.candidates
            and response.candidates[0].content
            and response.candidates[0].content.parts
        ):
            return response.candidates[0].content.parts[0].text.strip()

        return "لم أتمكن من توليد إجابة حالياً."

    except Exception as e:
        print("Gemini Error:", e)
        return "حدث خطأ أثناء معالجة سؤالك."

# ================== Generate Answer ==================
def generate_answer(question: str):
    faq = faq_intent_match(question)
    if faq:
        return generate_with_gemini(question, faq)

    docs = vectorstore.similarity_search(question)
    if docs:
        return generate_with_gemini(question, docs[0]["answer"])

    return generate_with_gemini(question, "لا توجد معلومات حالياً.")

# ================== API Route ==================
@app.route("/get", methods=["POST"])
def chat():
    msg = request.form.get("msg", "")
    if not msg:
        return Response("سؤال فارغ", mimetype="text/plain")

    answer = generate_answer(msg)
    print("BOT:", answer)  # للتأكد
    return Response(answer, mimetype="text/plain")

# ================== Run ==================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)

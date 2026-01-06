from flask import Flask, request, Response
from flask_cors import CORS
from google import genai
import json, os
from dotenv import load_dotenv


app = Flask(__name__)
CORS(app)
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY_ChatBOT")
if not api_key:
    raise ValueError("GEMINI_API_KEY_ChatBOT not found in .env file")

client = genai.Client(api_key=api_key)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "data.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    FAQ_DATA = json.load(f)


class FakeFAISS:
    def __init__(self, data):
        self.data = data

    def similarity_search(self, query, k=1):
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


def faq_intent_match(user_question: str):
    user_words = set(user_question.split())
    for item in FAQ_DATA:
        if len(user_words & set(item["question"].split())) >= 2:
            return item["answer"]
    return None


chat_history = {}  


def generate_with_gemini(session_id, question, context=""):
    history = chat_history.get(session_id, [])

    history_text = ""
    for h in history[-4:]:  
        history_text += f"المستخدم: {h['user']}\n"
        history_text += f"المساعد: {h['bot']}\n"

    prompt = f"""
أنت "رشاد بوت"، المساعد الذكي لمنصة إرشاد.
أجب باللغة العربية وبأسلوب واضح ومختصر.

سجل المحادثة:
{history_text}

المعلومات المتاحة:
{context}

سؤال المستخدم:
{question}

الإجابة:
"""

    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )

        answer = response.candidates[0].content.parts[0].text.strip()

        history.append({"user": question, "bot": answer})
        chat_history[session_id] = history

        return answer

    except Exception as e:
        print("Gemini Error:", e)
        return "حدث خطأ أثناء معالجة سؤالك."


def generate_answer(session_id, question: str):


    faq = faq_intent_match(question)
    if faq:
        return faq


    docs = vectorstore.similarity_search(question)
    context = docs[0]["answer"] if docs else "لا توجد معلومات حالياً."


    return generate_with_gemini(session_id, question, context)

@app.route("/get", methods=["POST"])
def chat():
    msg = request.form.get("msg", "")
    session_id = request.form.get("session_id", "default")

    if not msg:
        return Response("سؤال فارغ", mimetype="text/plain")

    answer = generate_answer(session_id, msg)
    print(f"[{session_id}] BOT:", answer)

    return Response(answer, mimetype="text/plain")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)

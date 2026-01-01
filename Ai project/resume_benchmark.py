import os
import json
from math import fabs
from app import analyze_resume_with_gemini

CV_DIR = "./benchmark/cvs"
GT_DIR = "./benchmark/ground_truth"
PRED_DIR = "./benchmark/predictions"

os.makedirs(PRED_DIR, exist_ok=True)


tp = fp = fn = 0
email_correct = phone_correct = exp_correct = total = 0


for file in os.listdir(CV_DIR):
    if not file.endswith(".pdf"):
        continue

    print(f"🔍 Processing {file}")


    cv_path = os.path.join(CV_DIR, file)
    prediction = analyze_resume_with_gemini(cv_path)

    pred_path = os.path.join(PRED_DIR, file.replace(".pdf", ".json"))
    with open(pred_path, "w", encoding="utf-8") as f:
        json.dump(prediction, f, indent=2, ensure_ascii=False)


    gt_path = os.path.join(GT_DIR, file.replace(".pdf", ".json"))
    if not os.path.exists(gt_path):
        print(f"Ground truth missing for {file}")
        continue

    gt = json.load(open(gt_path, encoding="utf-8"))


    gt_skills = set(s.lower() for s in gt.get("skills", []))
    pred_skills = set(
        s.lower() for s in prediction["parser_output"].get("skills", [])
    )

    tp += len(gt_skills & pred_skills)
    fp += len(pred_skills - gt_skills)
    fn += len(gt_skills - pred_skills)


    if gt.get("email") == prediction.get("email"):
        email_correct += 1


    if gt.get("phone") == prediction.get("phone"):
        phone_correct += 1

    if fabs(
        gt.get("experience_years", 0)
        - prediction.get("estimated_experience_years", 0)
    ) <= 1:
        exp_correct += 1

    total += 1


precision = tp / (tp + fp) if (tp + fp) else 0
recall = tp / (tp + fn) if (tp + fn) else 0
f1 = (
    2 * precision * recall / (precision + recall)
    if (precision + recall)
    else 0
)

email_acc = email_correct / total if total else 0
phone_acc = phone_correct / total if total else 0
exp_acc = exp_correct / total if total else 0


print(f"Total CVs evaluated: {total}\n")
print("Skills Extraction")
print(f"Precision: {precision:.2f}")
print(f"Recall:    {recall:.2f}")
print(f"F1-score:  {f1:.2f}\n")
print("Email Accuracy:", round(email_acc, 2))
print("Phone Accuracy:", round(phone_acc, 2))
print("Experience Accuracy (±1 year):", round(exp_acc, 2))


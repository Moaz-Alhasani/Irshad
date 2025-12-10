import json
import pytest
from unittest.mock import patch, MagicMock
from app import app


@pytest.fixture
def client():
    app.testing = True
    return app.test_client()


# ---------------------
# 1) TEST /analyze
# ---------------------

def test_analyze_missing_file_path(client):
    res = client.post("/analyze", json={})
    assert res.status_code == 400
    assert "file_path is required" in res.get_data(as_text=True)


@patch("app.analyze_resume_with_gemini")
def test_analyze_valid(mock_gemini, client):
    mock_gemini.return_value = {
        "parser_output": {
            "summary": "Test",
            "skills": ["python"],
            "education": {"degree": "BSc", "university": "X", "major": "CS"},
            "languages": ["English"],
            "experience_years": 2
        },
        "email": "test@test.com",
        "phone": "000"
    }

    res = client.post("/analyze", json={"file_path": "dummy.pdf"})
    assert res.status_code == 200
    assert "parser_output" in res.get_json()


# ---------------------
# 2) TEST /get-similarity
# ---------------------

def test_similarity_no_data(client):
    res = client.post("/get-similarity", json={})
    assert res.status_code == 200
    assert res.get_json() == []


@patch.object(app.modelembe, "encode", return_value=MagicMock())
def test_similarity_basic(mock_encode, client):

    payload = {
        "resume_text": "python developer",
        "resume_skills": ["python"],
        "resume_education": ["Bachelor"],
        "resume_experience": ["2 years"],
        "jobs": [
            {
                "id": 1,
                "title": "Python Dev",
                "description": "Backend",
                "requiredSkills": ["python"],
                "requiredEducation": ["Bachelor"],
                "requiredExperience": 1
            }
        ]
    }

    res = client.post("/get-similarity", json=payload)
    assert res.status_code == 200


# ---------------------
# 3) TEST /predict-salary
# ---------------------

def test_predict_salary_missing_fields(client):
    payload = {
        "candidate_skills": [],
        "job_required_skills": ["python"],
        "candidate_experience": 2,
        "job_title": "AI Engineer"
    }
    res = client.post("/predict-salary", json=payload)
    assert res.status_code == 400


@patch("app.predict_salary")
def test_predict_salary_valid(mock_predict, client):
    mock_predict.return_value = {
        "estimated_salary": 50000,
        "job_category": "AI",
        "matched_skills": ["python"],
        "similarity_score": 0.88
    }

    payload = {
        "candidate_skills": ["python"],
        "job_required_skills": ["python"],
        "candidate_education": ["Bachelor"],
        "candidate_experience": 3,
        "job_title": "AI Engineer"
    }
    res = client.post("/predict-salary", json=payload)
    assert res.status_code == 200
    assert "estimated_salary" in res.get_json()


# ---------------------
# 4) TEST /predict-acceptance
# ---------------------

def test_predict_acceptance(client):
    payload = {
        "candidate_skills": ["python"],
        "job_title": "Backend Dev",
        "job_required_skills": ["python"],
        "job_description": "Need python developer"
    }

    res = client.post("/predict-acceptance", json=payload)
    assert res.status_code == 200
    assert "acceptance_score" in res.get_json()

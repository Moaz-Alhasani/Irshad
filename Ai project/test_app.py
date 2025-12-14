import pytest
from unittest.mock import patch, MagicMock

# =====================================================
# 🔴 PREVENT LOADING SENTENCE TRANSFORMER MODEL
# =====================================================
with patch("sentence_transformers.SentenceTransformer") as MockST:
    mock_instance = MagicMock()
    mock_instance.encode.return_value = MagicMock()
    MockST.return_value = mock_instance

    from app import app


# =====================================================
# Flask Test Client
# =====================================================

@pytest.fixture
def client():
    app.testing = True
    return app.test_client()


# =====================================================
# 1) TEST /analyze
# =====================================================

def test_analyze_no_json(client):
    """
    White-Box Path:
    No JSON provided -> Error 400
    """
    res = client.post("/analyze")
    assert res.status_code == 400
    assert "No JSON data provided" in res.get_data(as_text=True)


def test_analyze_missing_file_path(client):
    """
    White-Box Path:
    JSON exists but file_path missing -> Error 400
    """
    res = client.post("/analyze", json={"file_path": ""})
    assert res.status_code == 400
    assert "file_path is required" in res.get_data(as_text=True)


@patch("app.analyze_resume_with_gemini")
def test_analyze_valid(mock_gemini, client):
    """
    White-Box Path:
    Valid input -> Main execution path
    """
    mock_gemini.return_value = {
        "parser_output": {
            "summary": "Test summary",
            "skills": ["python"],
            "education": {
                "degree": "BSc",
                "university": "Test University",
                "major": "Computer Science"
            },
            "languages": ["English"],
            "experience_years": 2
        },
        "email": "test@test.com",
        "phone": "000"
    }

    res = client.post("/analyze", json={"file_path": "dummy.pdf"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["parser_output"]["summary"] == "Test summary"


# =====================================================
# 2) TEST /get-similarity
# =====================================================

def test_similarity_no_data(client):
    """
    White-Box Path:
    Empty input -> return empty list
    """
    res = client.post("/get-similarity", json={})
    assert res.status_code == 200
    assert res.get_json() == []


@patch("app.util.cos_sim")
def test_similarity_basic(mock_cos_sim, client):
    """
    White-Box Path:
    Similarity calculation path
    """
    fake_tensor = MagicMock()
    fake_tensor.max.return_value.values.mean.return_value.item.return_value = 0.9
    mock_cos_sim.return_value = fake_tensor

    payload = {
        "resume_text": "python developer",
        "resume_skills": ["python"],
        "resume_education": ["Bachelor"],
        "resume_experience": ["2 years"],
        "jobs": [
            {
                "id": 1,
                "title": "Python Developer",
                "description": "Backend",
                "requiredSkills": ["python"],
                "requiredEducation": ["Bachelor"],
                "requiredExperience": 1
            }
        ]
    }

    res = client.post("/get-similarity", json=payload)
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)


# =====================================================
# 3) TEST /predict-salary
# =====================================================

def test_predict_salary_missing_fields(client):
    """
    White-Box Path:
    Missing required fields -> Error 400
    """
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
    """
    White-Box Path:
    Salary prediction success
    """
    mock_predict.return_value = {
        "estimated_salary": 50000,
        "job_category": "AI Engineer",
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


# =====================================================
# 4) TEST /predict-acceptance
# =====================================================

def test_predict_acceptance(client):
    """
    White-Box Path:
    Acceptance score calculation
    """
    payload = {
        "candidate_skills": ["python"],
        "job_title": "Backend Developer",
        "job_required_skills": ["python"],
        "job_description": "Looking for python developer"
    }

    res = client.post("/predict-acceptance", json=payload)
    assert res.status_code == 200
    assert "acceptance_score" in res.get_json()

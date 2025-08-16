# 🚀 Irshad Smart Job Recommendation 

## ✨ Overview

This project is an advanced **Irshad Smart Job Recommendation System** combined with **Salary Prediction** and **Dynamic Multi-Factor Candidate Ranking**, designed to assist job seekers, employers, and administrators in managing recruitment efficiently using AI and NLP techniques.

---

## 🛠 Features

### 1️⃣ Smart Job Recommendation (For Job Seekers)

1. **📄 Resume Upload**
   - Upon initial registration, users upload their resume in PDF format for analysis and future recommendations.

2. **📝 Resume Content Analysis**
   - Uses advanced **NLP techniques** to extract key information:
     - Technical and professional skills.
     - Years of work experience.
     - Educational background.
     - Languages spoken.

3. **🔢 Numerical Representation (Embeddings)**
   - Converts extracted data into numerical embeddings using pretrained models like **Sentence Transformers** to enable efficient smart matching.

4. **🎯 Job Matching**
   - Compares resume embeddings with job embeddings in the database using **Cosine Similarity**.
   - Dynamically returns jobs with the highest match scores.

5. **💡 Suggested Jobs Display**
   - Shows recommended jobs based on similarity scores, guiding users to the best opportunities.

---

### 2️⃣ Salary Prediction System

1. **🔍 Re-analysis of Candidate Data**
   - Upon applying for a specific job, the resume is re-analyzed to extract features affecting market value.

2. **🤖 AI-Powered Predictive Modeling**
   - Features are fed into a pretrained supervised model (e.g., **Tfidf + XGBoost**), considering:
     - Technical skills
     - Years of experience
     - Education level
     - Geographic location
     - Real market salary rates

3. **💰 Expected Salary Output**
   - Produces an estimated salary value visible both to the employer dashboard and the candidate.

---

### 3️⃣ Dynamic Multi-Factor Candidate Ranking

- Evaluates and ranks candidates based on multiple factors simultaneously:
  - Semantic similarity between candidate skills and job requirements using **Embeddings**.
  - Experience alignment with job requirements.
  - Educational qualification match.
  - Geographic compatibility.
  - Additional factors like past performance and interview results (future integration).

- Provides employers a sorted list of the best-suited candidates for each job.

---

### 4️⃣ Company Management (For Employers)

1. **🏢 Account Creation & Verification**
   - Employers create accounts verified by the system admin for authenticity.

2. **📌 Job Posting**
   - Post detailed job listings including:
     - Job title
     - Required skills and qualifications
     - Salary range
     - Employment type (full-time, part-time, freelance, etc.)

3. **📊 Application Tracking**
   - Review incoming applications:
     - See match score for each applicant
     - Review predicted salary
     - Accept or reject candidates directly from the system

4. **📅 Interview Scheduling**
   - Schedule interviews online (e.g., via Google Meet) with automatic invitations sent to selected candidates.

---

### 5️⃣ User Interface (For Job Seekers)

1. **👤 Personal Account Management**
   - Register and verify via email.

2. **📄 Resume Upload**
   - Upload one PDF resume for accurate analysis.

3. **💡 Smart Recommendations**
   - Displays automatically matched jobs based on resume analysis.

4. **🗂 Job Browsing & Application Tracking**
   - Browse all posted jobs or recommended jobs.
   - Track application status (accepted, rejected, pending).

5. **📧 Interview Notifications**
   - View interview links directly in the dashboard with the scheduled time.

---

### 6️⃣ System Administration (Admin)

1. **🔑 Company Account Review & Verification**
   - Approve or reject company account requests to ensure platform quality.

2. **✅ Job Quality Oversight**
   - Ensure posted jobs are valid, relevant, and free from misleading content.

3. **🛡 Role & Access Management**
   - Assign precise roles (User, Employer, Admin) and maintain secure access.

4. **📈 Performance Monitoring & Data Analytics**
   - Generate reports including:
     - Number of recommendations
     - Number of applications
     - Job acceptance rates
     - Average predicted salaries

5. **⚙️ AI & Backend Management**
   - Monitor AI model performance and backend APIs for system accuracy and efficiency.

---

## 💻 Tech Stack

- **Backend:** Node.js, NestJS, TypeORM, PostgreSQL
- **Frontend:** React.js / Angular (if applicable)
- **AI & NLP:** Transformers, Sentence Embeddings, XGBoost
- **Authentication:** JWT, Role-based Access Control
- **Deployment:** Docker / Cloud Hosting (Optional)

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/USERNAME/your-repo.git

# Navigate to project
cd your-repo

# Install dependencies
npm install

# Run the server
npm run start:dev

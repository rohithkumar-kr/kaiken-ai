<div align="center">

# 🚀 Kaiken AI

### AI-Powered Career Preparation Platform

**Version 2.0.0**

Analyze your resume, improve ATS score, generate professional resumes and cover letters, and practice AI-powered mock interviews—all in one platform.

---

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![Neon](https://img.shields.io/badge/Database-Neon-00E699)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF)
![License](https://img.shields.io/badge/Status-Active-success)

</div>

---

# 📌 Overview

Kaiken AI is an AI-powered career preparation platform designed to help students and professionals improve their resumes and prepare for technical interviews.

The platform provides an end-to-end workflow:

- Upload your resume
- Analyze ATS compatibility
- Optimize your resume
- Generate professional cover letters
- Practice personalized AI interviews
- Receive AI feedback
- Export professional reports

---

# ✨ Features

## 📄 Resume Intelligence

- Upload Resume (PDF / DOCX)
- AI Resume Parsing
- Structured Resume Extraction
- Resume History
- ATS Compatibility Analysis
- Resume Improvement Suggestions
- Resume Optimization
- Export Optimized Resume (PDF / Markdown)

---

## 📨 Cover Letter Generator

- AI-generated Cover Letters
- One-page Professional PDF
- Markdown Export
- Personalized for each Job Description

---

## 🎯 ATS Analysis

- Overall ATS Score
- Section-wise Analysis
- Keyword Match Analysis
- Missing Keywords
- Improvement Recommendations
- Professional PDF Report

---

## 🎤 AI Interview Preparation

### Interview Sessions

- Create Interview Sessions
- Company-specific Interviews
- Experience Level Selection
- Interview Type Selection

### AI Question Generation

- Personalized Questions
- Resume-aware Questions
- Company-specific Questions
- Technical
- Behavioral
- Projects
- Resume
- Problem Solving
- System Design

### Interview Player

- Auto Save
- Resume Progress
- Question Timer
- Progress Tracking

### AI Evaluation

- Score
- Strengths
- Weaknesses
- Suggestions
- Ideal Answer

### Interview Report

- Overall Score
- Hiring Recommendation
- Category-wise Performance
- Question Breakdown
- PDF Export
- Markdown Export

---

# 🖼 Screenshots

Screenshots and a live demo will be added in a future release as the user interface continues to evolve.

---

# 🛠 Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Backend

- Next.js API Routes
- Prisma ORM
- Neon PostgreSQL

### Authentication

- Clerk

### AI

- Google Gemini
- Multi-model Fallback

### File Handling

- UploadThing
- PDFKit
- Mammoth
- pdf-parse

### Validation

- Zod

### Notifications

- Sonner

---

# 🏗 Architecture

```
User

↓

Clerk Authentication

↓

Next.js App Router

↓

API Routes

↓

Service Layer

↓

Prisma ORM

↓

Neon PostgreSQL

↓

Gemini AI
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/kaiken-ai.git
cd kaiken-ai
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file.

```env
DATABASE_URL=

CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

UPLOADTHING_TOKEN=

GEMINI_API_KEY=
```

---

## Prisma

```bash
npx prisma migrate deploy
```

or

```bash
npx prisma migrate dev
```

---

## Run

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# 📦 Build

```bash
npm run lint

npm run typecheck

npm run build
```

---

# 📁 Project Structure

```
app/
components/
lib/
prisma/
generated/
public/
tests/
```

---

# 🎯 Current Version

## Version 2.0.0

### Completed

- Resume Parsing
- ATS Analysis
- Resume Optimization
- Cover Letter Generation
- Interview Sessions
- AI Question Generation
- AI Answer Evaluation
- Interview Analytics
- Interview Reports
- PDF & Markdown Export
- Authentication
- History Management

---

# 🛣 Roadmap

### Version 2.1

- Voice Interview
- Speech-to-Text
- Text-to-Speech
- Dynamic Follow-up Questions

### Version 2.2

- Production Polish
- Accessibility
- Mobile Optimization
- Performance Improvements

### Version 3.0

- Multi-language Support
- Company Dashboards
- Team Interview Mode
- AI Career Coach

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository

2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit

```bash
git commit -m "Add new feature"
```

4. Push

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Developer

Developed by **Rohith Kumar K R**

GitHub:
https://github.com/rohithkumar-kr

---

<div align="center">

### ⭐ If you like this project, consider giving it a Star!

**Kaiken AI — Complete AI Career Preparation Platform**

</div>

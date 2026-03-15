import Groq from "groq-sdk";

// Lazy init — ensures process.env is loaded before client creation
let _client = null;
const getClient = () => {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
};

const MODEL = "llama-3.1-8b-instant"; // free, fast, great quality

// ── Helper: call Groq ─────────────────────────────────────────────
const callGroq = async (systemPrompt, userMessage, maxTokens = 1500) => {
  const response = await getClient().chat.completions.create({
    model:      MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage  },
    ],
  });
  return response.choices[0].message.content;
};

// ── Helper: parse JSON safely ─────────────────────────────────────
const parseJSON = (text) => {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
};

// ── 1. Career Roadmap ─────────────────────────────────────────────
export const generateCareerRoadmap = async ({ targetRole, currentSkills, experienceLevel }) => {
  const system = `You are an expert career coach. Always respond with valid JSON only. No markdown, no extra text outside the JSON.`;
  const prompt = `Create a career roadmap for:
- Target Role: ${targetRole}
- Current Skills: ${currentSkills.join(", ") || "None"}
- Experience Level: ${experienceLevel}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence overview",
  "milestones": [
    {
      "title": "Milestone title",
      "description": "What to learn and why",
      "order": 1,
      "estimatedDays": 14,
      "resources": [
        { "title": "Resource name", "url": "https://example.com", "type": "video", "platform": "YouTube", "isFree": true, "estimatedMinutes": 60 }
      ]
    }
  ],
  "alternativePaths": [
    { "role": "Alternative role", "matchScore": 75, "reason": "Why this fits" }
  ]
}
Generate 5-7 milestones with 2-3 real resources each.`;
  const raw = await callGroq(system, prompt, 3000);
  return parseJSON(raw);
};

// ── 2. Skill Gap Analysis ─────────────────────────────────────────
export const analyzeSkillGap = async ({ domain, score, skillLevel, weakTopics, strongTopics }) => {
  const system = `You are a technical skills assessor. Respond with valid JSON only. No extra text.`;
  const prompt = `Analyse this assessment result:
Domain: ${domain}, Score: ${score}%, Level: ${skillLevel}
Strong topics: ${strongTopics.join(", ") || "None"}
Weak topics: ${weakTopics.join(", ") || "None"}

Return valid JSON:
{
  "summary": "2-3 sentence personalised analysis",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "nextSteps": ["Next step 1", "Next step 2"]
}`;
  const raw = await callGroq(system, prompt, 800);
  return parseJSON(raw);
};

// ── 3. ATS Resume Checker ─────────────────────────────────────────
export const checkATS = async ({ resume, jobDescription }) => {
  const system = `You are an ATS resume analyst. Respond with valid JSON only. No extra text.`;
  const resumeText = JSON.stringify({
    summary:    resume.personalInfo?.summary || "",
    skills:     resume.skills || {},
    experience: (resume.experience || []).map(e => ({ role: e.role, bullets: e.bullets })),
    projects:   (resume.projects || []).map(p => ({ name: p.name, description: p.description })),
  });
  const prompt = `Analyse this resume against the job description.
Resume: ${resumeText.substring(0, 2000)}
Job Description: ${jobDescription.substring(0, 1500)}

Return valid JSON:
{
  "score": 72,
  "missingKeywords": ["keyword1", "keyword2"],
  "presentKeywords": ["keyword1", "keyword2"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "sectionFeedback": {
    "summary": "feedback on summary",
    "skills": "feedback on skills",
    "experience": "feedback on experience"
  }
}`;
  const raw = await callGroq(system, prompt, 1200);
  return parseJSON(raw);
};

// ── 4. Bullet Point Improver ──────────────────────────────────────
export const improveBulletPoint = async ({ bullet, role }) => {
  const system = `You are an expert resume writer. Respond with valid JSON only. No extra text.`;
  const safeBullet = bullet.replace(/"/g, '\\"');
  const prompt = `Improve this resume bullet point for a ${role || "software developer"} role.
Original: "${safeBullet}"

Return valid JSON:
{
  "original": "${safeBullet}",
  "improved": [
    "Version 1 with measurable impact and metrics",
    "Version 2 highlighting technologies and skills",
    "Version 3 concise with strong action verb"
  ],
  "tips": "One sentence tip on what made these better"
}`;
  const raw = await callGroq(system, prompt, 600);
  return parseJSON(raw);
};

// ── 5. Study Plan Generator ───────────────────────────────────────
export const generateStudyPlanAI = async ({ topic, daysAvailable, userLevel }) => {
  const system = `You are an expert learning coach. Respond with valid JSON only. No extra text.`;
  const days   = Math.min(Number(daysAvailable), 21); // cap at 21 to stay within token limits
  const prompt = `Create a ${days}-day study plan for: ${topic}
Learner level: ${userLevel || "Beginner"}

Return valid JSON:
{
  "planTitle": "Learn ${topic} in ${days} Days",
  "dailyGoals": [
    {
      "day": 1,
      "tasks": ["Specific task description 1", "Specific task 2"],
      "resources": [{ "title": "Resource name", "url": "https://example.com" }],
      "completed": false
    }
  ]
}
Generate goals for every day from 1 to ${days}.`;
  const raw = await callGroq(system, prompt, 3000);
  return parseJSON(raw);
};

// ── 6. Career Chatbot ─────────────────────────────────────────────
export const chatWithCareerAdvisor = async ({ history, userProfile }) => {
  const systemMessage = {
    role: "system",
    content: `You are an expert AI career advisor helping people from ALL professional fields — not just technology.
Your expertise covers: Technology, Business, Finance, Law, Arts & Design, Marketing, Healthcare, Engineering, Education, Science, and more.

You help with: career planning, skill development, resume writing, interview preparation, job search strategies, certifications, and industry-specific advice.
Be encouraging, practical, and highly personalised to the user's specific field and goals.

User Profile:
- Name: ${userProfile.name}
- User Type: ${userProfile.userType || "Student"}
- Field: ${userProfile.field || "Not specified"}
- Goal: ${userProfile.goal || "Not specified"}
- Target Role: ${userProfile.targetRole || "Not specified"}
- Experience Level: ${userProfile.experienceLevel || "Student (Fresher)"}
- Current Role: ${userProfile.currentTitle ? `${userProfile.currentTitle} at ${userProfile.currentCompany}` : "Not specified"}
- Skills: ${userProfile.skills?.map(s => s.name).join(", ") || "Not specified"}
- Career Goal: ${userProfile.careerGoal || "Not specified"}

IMPORTANT: Always give advice specific to their field (${userProfile.field || "their industry"}), not generic tech advice.
For example, if they are in Law, talk about bar exams, legal internships, law firms.
If they are in Healthcare, talk about clinical experience, medical boards, healthcare management.

Keep responses under 300 words. Use markdown formatting with bold and bullet points.
Be warm, specific, and actionable. End with an encouraging note or follow-up question.`,
  };

  // Build messages array — system + full history
  const messages = [
    systemMessage,
    ...history.map(msg => ({
      role:    msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
  ];

  const response = await getClient().chat.completions.create({
    model:       MODEL,
    max_tokens:  800,
    temperature: 0.8,
    messages,
  });

  return response.choices[0].message.content;
};

// ── 7. Job Fit Score ──────────────────────────────────────────────
export const getJobFitScore = async ({ userSkills, targetRole, experienceLevel, jobTitle, jobSkills, jobDescription }) => {
  const system = `You are a career matching expert. Respond with valid JSON only. No extra text.`;
  const prompt = `Rate how well this candidate fits the job.
Candidate — Skills: ${userSkills.join(", ") || "None"}, Target: ${targetRole}, Experience: ${experienceLevel}
Job — Title: ${jobTitle}, Skills needed: ${jobSkills.join(", ") || "None"}, Description: ${(jobDescription || "").substring(0, 400)}

Return valid JSON:
{
  "score": 75,
  "reasons": ["Matching reason 1", "Reason 2", "Reason 3"],
  "missingSkills": ["skill1", "skill2"],
  "matchingSkills": ["skill1", "skill2"]
}`;
  const raw = await callGroq(system, prompt, 500);
  return parseJSON(raw);
};

// ── 8. Interview Questions ────────────────────────────────────────
export const generateInterviewQuestions = async ({ role, type, count = 8 }) => {
  const system = `You are an expert interviewer. Respond with a valid JSON array only. No extra text.`;
  const prompt = `Generate ${count} interview questions for a ${role} position (${type} round).

Return a valid JSON array:
[
  {
    "question": "Question text here",
    "category": "HR",
    "difficulty": "easy",
    "expectedKeywords": ["keyword1", "keyword2", "keyword3"]
  }
]
Mix HR and Technical questions. Make them realistic, role-specific, and progressively harder.`;
  const raw = await callGroq(system, prompt, 1500);
  return parseJSON(raw);
};

// ── 9. Evaluate Interview Answer ──────────────────────────────────
export const evaluateInterviewAnswer = async ({ question, answer, expectedKeywords, role }) => {
  const system = `You are an expert interview evaluator. Respond with valid JSON only. No extra text.`;
  const prompt = `Evaluate this interview answer for a ${role} position.
Question: ${question}
Answer: ${answer}
Expected keywords: ${expectedKeywords.join(", ")}

Return valid JSON:
{
  "score": 7,
  "feedback": "Specific constructive feedback on the answer",
  "keywordsFound": ["keyword1"],
  "starScore": 7,
  "improvements": "One specific thing to improve"
}
Score from 0 to 10. Be fair, constructive, and specific.`;
  const raw = await callGroq(system, prompt, 600);
  return parseJSON(raw);
};

// ── 10. Overall Interview Feedback ───────────────────────────────
export const getInterviewFeedback = async ({ role, answers, score }) => {
  const system = `You are a senior interview coach. Respond with valid JSON only. No extra text.`;
  const summary = answers
    .slice(0, 5)
    .map(a => `Q: ${a.questionText?.substring(0, 60)} | Score: ${a.aiScore}/10`)
    .join("\n");
  const prompt = `Give overall interview feedback for a ${role} candidate who scored ${score}%.

Performance summary:
${summary}

Return valid JSON:
{
  "feedback": "2-3 sentence personalised overall assessment",
  "strengths": ["Specific strength 1", "Strength 2"],
  "improvements": ["Area to improve 1", "Area 2"],
  "nextSteps": ["Actionable next step 1", "Step 2"]
}`;
  const raw = await callGroq(system, prompt, 600);
  return parseJSON(raw);
};

// ── 11. Generate Assessment Questions Dynamically (for any field) ─
export const generateAssessmentQuestions = async ({ domain, field, count = 15 }) => {
  const system = `You are an expert assessment designer. Respond with a valid JSON array only. No extra text.`;
  const prompt = `Generate ${count} multiple-choice assessment questions for:
Domain: ${domain}
Field: ${field}

Return a JSON array:
[
  {
    "question": "Clear question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "difficulty": "easy",
    "topic": "Sub-topic name",
    "explanation": "Brief explanation of correct answer"
  }
]

Rules:
- correctAnswer is the INDEX (0-3) of the correct option
- difficulty is "easy", "medium", or "hard"
- Mix difficulties: 40% easy, 40% medium, 20% hard
- Make questions practical and relevant to real ${field} careers
- Topics should cover breadth of the ${domain} domain
- All 4 options must be plausible, not obviously wrong`;

  const raw = await callGroq(system, prompt, 3000);
  return parseJSON(raw);
};
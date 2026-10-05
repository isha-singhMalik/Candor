import type { Profile } from "@/types";

export const SAMPLE_PROFILE: Profile = {
  name: "Aarav Sharma (demo)", email: "aarav.demo@example.com", education: "B.Tech", degree: "Computer Science",
  college: "ABC University", gradYear: "2025", experience: "fresher", targetRole: "Software Engineer",
  targetIndustry: "Technology", targetCompanies: "", skills: "Python, JavaScript, React, SQL, Git", interviewType: "technical",
};

export const SAMPLE_RESUME = `AARAV SHARMA
aarav.demo@example.com | +91 98765 43210 | github.com/aarav-demo | linkedin.com/in/aarav-demo

SUMMARY
Hard-working final-year B.Tech Computer Science student passionate about building web applications.

EDUCATION
B.Tech in Computer Science, ABC University, 2021-2025, CGPA 8.1/10

PROJECTS
E-commerce Platform
- Worked on a web application using React and Node.js for an online store.
- Developed REST APIs for products, cart and orders using Express and PostgreSQL.
- Integrated a payment gateway in test mode.

Phishing Detection System
- Built a phishing URL detection system in Python using scikit-learn that achieved 94% accuracy on a public dataset.
- Responsible for feature extraction from URLs and email headers.

Task Management Application
- Created a task management app with JavaScript and MongoDB where users can create, assign and track tasks.
- Helped the team with testing and bug fixes.

EXPERIENCE
Web Development Intern, XYZ Technologies (Jun 2024 - Aug 2024)
- Assisted in building dashboard pages in React for the internal admin tool.
- Fixed UI bugs reported by the QA team and reduced open front-end bugs from 42 to 9 in six weeks.

SKILLS
Python, JavaScript, React, SQL, Git, HTML, CSS, Node.js, MongoDB, Docker

CERTIFICATIONS
Python for Everybody, Coursera

ACHIEVEMENTS
Finalist, college hackathon 2024
`;

export const SAMPLE_JD = `Software Engineer (Graduate / 0-2 years)
We are looking for an engineer to build and ship customer-facing features.
You will work with React, Node.js and REST APIs backed by PostgreSQL, deploy on AWS using Docker and Kubernetes, and write automated tests.
Requirements: strong JavaScript or TypeScript, Git, SQL, CI/CD experience, and ownership of features end to end.
Docker and Kubernetes experience is a strong plus. 1+ years of experience preferred.`;

# 📇 iCard Generating System  

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18+-blue?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6+-brightgreen?logo=mongodb)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

---

## 🧾 Overview  

A full-stack **iCard Generating and Management System** built using the **MERN stack** — **MongoDB, Express.js, React.js, and Node.js**.  
This system simplifies the process of creating, managing, and generating digital/printable ID cards for institutions, businesses, and events.

---

## 🚀 Features  

- ✅ Create and manage **user profiles**
- ✅ Auto-generate ID cards with **real-time data**
- ✅ **Preview & Download** ID cards as PDF or image
- ✅ **Role-based access** (Admins & Users)
- ✅ Dynamic, responsive **React UI**
- ✅ Secure backend with **JWT authentication** and **MongoDB**
- ✅ Integrated **QR code generation** for easy verification

---

## 🛠️ Tech Stack  

| Layer | Technology Used |
|:------|:----------------|
| **Frontend** | React.js, HTML5, CSS3, JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ORM) |
| **Utilities** | PDFKit, QRCode.js, Morgan, dotenv |

---

## 📂 Project Structure  

icard-system/
│
├── client/ # React frontend
├── server/ # Node.js backend
├── models/ # MongoDB schemas
├── routes/ # Express API routes
├── public/ # Static files
├── .env # Environment variables
├── package.json # Dependencies
└── README.md # Documentation

yaml
Copy code

---

## ⚡ Getting Started  

### 1️⃣ Clone the Repository  
```bash
git clone https://github.com/your-username/icard-system.git
cd icard-system
2️⃣ Install Dependencies
bash
Copy code
# Install server dependencies
npm install  

# Move to client folder and install frontend dependencies
cd client
npm install
3️⃣ Set Up Environment Variables
Create a .env file in the root directory and add the following:

env
Copy code
PORT=3000
MONGO_URI=your_mongo_connection_string
ADMIN_USER=admin
ADMIN_PASS=admin123
CORS_ORIGIN=http://localhost:3000
4️⃣ Run the Application
bash
Copy code
# Run backend (from root)
npm run dev  

# Run frontend (from client folder)
npm start
Frontend will run at 👉 http://localhost:3000
Backend will run at 👉 http://localhost:5000 (or as set in .env)

🌟 Use Cases
🎓 Colleges & Universities – Generate student/staff ID cards
🏢 Corporate Offices – Manage employee ID cards
🎫 Events & Conferences – Create guest or participant badges

🧠 Key Learnings
This project demonstrates:

End-to-end MERN stack development

Integration of MongoDB Atlas with Mongoose

Dynamic document creation using PDFKit & QRCode

Authentication and role-based access control

Scalable, modular Express.js API design

🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to fork the repo and submit a pull request.

Fork the Project

Create a Feature Branch (git checkout -b feature/newFeature)

Commit Changes (git commit -m 'Add new feature')

Push to Branch (git push origin feature/newFeature)

Open a Pull Request

💡 Credits

Developed by BISWAJEET BEHERA

Special thanks to contributors and the open-source community ❤️

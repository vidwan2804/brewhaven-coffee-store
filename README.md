# ☕ BrewHaven – Premium Coffee Store  
A full-stack e-commerce application built using **HTML, CSS, JavaScript (frontend)** and **Node.js, Express, MongoDB (backend)**.  
Users can browse products, filter coffee types, add items to cart, register/login, place orders, and admins can manage the store with a dashboard.

---

## 🚀 Features

### 🔹 User Features
- Browse all coffee products  
- Filter by category, roast level, and search  
- Add/remove items from cart  
- User authentication (Login/Register)  
- Checkout with shipping & payment form  
- View order history  
- Beautiful modern UI with animations

### 🔹 Admin Features
- Admin login  
- View dashboard statistics:
  - Total revenue  
  - Total orders  
  - Product count  
  - Customer count  
- View all orders  
- Add/update/delete products  
- Manage order statuses  

---

## 🛠️ Tech Stack

### Frontend
- HTML5  
- CSS3  
- Vanilla JavaScript (app.js)  
- LocalStorage for cart & auth  

### Backend
- Node.js  
- Express.js  
- MongoDB + Mongoose  
- JSON Web Tokens (JWT)  
- Bcrypt.js for password hashing  
- CORS enabled  

---

## 📁 Project Structure

BrewHaven/
│── backend/
│ ├── server.js
│ ├── package.json
│ ├── .env (ignored)
│
│── frontend/
│ ├── index.html
│ ├── styles.css
│ ├── app.js
│
│── README.md
│── .gitignore

yaml
Copy code

---

## 🔐 Environment Variables (`.env`)
Create a `.env` file inside **backend/**:

MONGODB_URI=your-mongodb-url
JWT_SECRET=your-secret-key
PORT=3000

yaml
Copy code

⚠️ `.env` is ignored automatically by `.gitignore`.

---

## 📦 Install & Run

### 1️⃣ Install backend dependencies
```bash
cd backend
npm install
2️⃣ Start backend server
bash
Copy code
node server.js
Server runs at:
http://localhost:3000

⚙️ API Endpoints
Authentication
bash
Copy code
POST /api/auth/register  
POST /api/auth/login
Products
pgsql
Copy code
GET    /api/products  
GET    /api/products/:id  
POST   /api/products      (admin only)  
PUT    /api/products/:id  (admin only)  
DELETE /api/products/:id  (admin only)
Orders
pgsql
Copy code
POST /api/orders  
GET  /api/orders/user/:id  
GET  /api/orders          (admin only)  
PATCH /api/orders/:id     (admin only)
Admin Stats
pgsql
Copy code
GET /api/admin/stats
🧪 Seed Database (optional)
bash
Copy code
POST http://localhost:3000/api/seed
Creates:

1 admin user

1 normal user

8 coffee products

🎯 Deployment Notes
Use Render / Railway / Vercel / Netlify

Keep .env secret

Allow CORS for frontend domain

🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first.

📄 License
MIT License © 2025 BrewHaven

yaml
Copy code

---

# ✔ STEP-BY-STEP: Upload Your Project to GitHub (Starting from `git init`)

Below are **clean instructions** to push your project safely.

---

# 1️⃣ Create `.gitignore` (VERY IMPORTANT)

Inside your main project folder, create:

.gitignore

kotlin
Copy code

Paste this:

Environment files
.env
*.env

Node
node_modules/

Logs
logs/
*.log

OS / system files
.DS_Store
Thumbs.db

Build
dist/
build/

Uploads
uploads/
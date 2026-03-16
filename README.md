# E-Shop

A modern, full-stack e-commerce platform built for high performance and scalability. This project features a responsive React frontend powered by Vite and a robust Node.js backend with SQLite.

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, React Router 7
- **Backend**: Node.js, Express, SQLite3
- **Authentication**: JWT (JSON Web Tokens), Bcrypt.js
- **Styling**: Vanilla CSS (Modern CSS variables and flex/grid layout)

## 📁 Project Structure

- `/src`: React frontend source code.
- `/backend`: Node.js Express server and SQLite database.
- `/public`: Static assets (images, icons).

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/k-s-sync/eshop.git
   cd eshop
   ```

2. **Install Frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install Backend dependencies**:
   ```bash
   cd backend
   npm install
   cd ..
   ```

## 💻 Development

To run the application locally in development mode:

1. **Start the Backend**:
   ```bash
   cd backend
   npm start
   ```
   The backend will run on `http://localhost:5000`.

2. **Start the Frontend**:
   (In a separate terminal)
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`.

## 📦 Build & Deployment

### Building for Production

To create a production-ready build of the frontend:

```bash
npm run build
```
This command generates a `dist` folder containing optimized static files.

### Deployment

#### 1. Frontend Deployment
The contents of the `dist` folder can be hosted on any static site host, such as:
- **Netlify** / **Vercel**: Connect your GitHub repository and set the build command to `npm run build` and the output directory to `dist`.
- **Nginx**: Point your Nginx configuration to the `dist` folder.

#### 2. Backend Deployment
The backend can be deployed to platforms like **Heroku**, **Render**, or a **VPS**:
- Ensure the `PORT` environment variable is correctly set.
- Ensure the `database.sqlite` file has appropriate read/write permissions.
- Use a process manager like `pm2` to keep the server running:
  ```bash
  cd backend
  pm2 start server.js --name eshop-backend
  ```

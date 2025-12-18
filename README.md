# DigitalCook

DigitalCook is an AI-powered Web application designed to assist with cooking and recipe management. It features a modern React frontend and a robust FastAPI backend integrated with advanced AI capabilities.

## Project Structure

The project is divided into two main components:

- **Backend**: A FastAPI application handling API requests, authentication, and AI analysis.
- **frontend**: A React (TypeScript) application providing the user interface.

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **Python** (v3.9 or higher)
- **MongoDB** (running locally or accessible via URI)

## Installation & Setup

### 1. Backend Setup

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```

2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Environment Configuration:
    - Ensure the `.env` file is properly configured in the `Backend` directory.
    - Required variables include SMTP settings for emails and URL configurations:
      ```env
      SMTP_USERNAME=your_email@gmail.com
      SMTP_PASSWORD=your_app_password
      SMTP_SERVER=smtp.gmail.com
      SMTP_PORT=587
      FRONTEND_URL=http://localhost:3000
      BACKEND_URL=http://localhost:8000
      ```

5.  Run the Backend server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.
    API Documentation (Swagger UI) is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the Frontend application:
    ```bash
    npm start
    ```
    The application will open at `http://localhost:3000`.

## Features

- **Authentication**: Secure user login and registration (`/auth`).
- **AI Analysis**: Recipe and ingredient analysis using LLMs (`/analyse`).
- **Generative AI Integration**: Powered by LangChain and Google Generative AI.
- **Modern UI**: Built with React, Material UI, and Styled Components.

## Technology Stack

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **AI/ML**: LangChain, Google Generative AI, FAISS, Sentence Transformers, Scikit-learn
- **Authentication**: Python-Jose, Passlib

### Frontend
- **Framework**: React (TypeScript)
- **Styling**: Material UI (MUI), Styled Components
- **Routing**: React Router
- **HTTP Client**: Axios

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

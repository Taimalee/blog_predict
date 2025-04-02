# Blog Predict

A full-stack blog application with predictive text functionality using FastAPI and React.

## Features

- User authentication with JWT
- Blog post creation and management
- Real-time text prediction using:
  - Basic trigram model
  - Advanced GPT-3.5 Turbo model
- Modern UI with Tailwind CSS
- Protected routes
- Draft and publish functionality

## Prerequisites

- Python 3.8+
- Node.js 14+
- PostgreSQL
- OpenAI API key (for advanced predictions)

## Backend Setup

1. Create a virtual environment and activate it:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory:
```
DATABASE_URL=postgresql://user:password@localhost/blog_predict
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

4. Run the backend server:
```bash
uvicorn app.main:app --reload
```

## Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Database Setup

The application uses PostgreSQL with the following tables:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication
- `POST /api/v1/login/access-token` - Login and get access token

### Posts
- `GET /api/v1/posts` - Get all posts for current user
- `POST /api/v1/posts` - Create a new post
- `GET /api/v1/posts/{id}` - Get a specific post
- `PUT /api/v1/posts/{id}` - Update a post
- `DELETE /api/v1/posts/{id}` - Delete a post

### Predictions
- `POST /api/v1/predict/basic` - Get predictions using trigram model
- `POST /api/v1/predict/advanced` - Get predictions using GPT-3.5

## Usage

1. Register a new account or login
2. Create a new post or edit an existing one
3. Choose between basic or advanced prediction model
4. Start typing to see word predictions
5. Save as draft or publish your post

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 
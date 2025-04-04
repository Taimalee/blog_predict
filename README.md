# W-Rite Expedite: Next Word Predictor 
> AI-powered writing assistant for bloggers.

## 📘 Project Overview

W-Rite Expedite is an intelligent writing assistant that helps writers and content creators overcome writer's block and enhance their writing productivity. The application provides real-time next-word predictions as users type, combining traditional N-gram models with advanced transformer-based AI to deliver contextually aware suggestions.

### What It Does
- Real-time next-word prediction in a clean, distraction-free editor
- Intelligent suggestions based on both local context and global patterns
- Seamless integration of multiple prediction models for optimal results

### Who It's For
- Bloggers and content creators
- Writers looking to speed up their writing process
- Anyone seeking AI assistance to overcome writer's block

### The Problem It Solves
- Reduces writer's block by providing intelligent suggestions
- Eliminates repetitive phrasing through contextual awareness
- Speeds up the writing process with real-time predictions
- Enhances writing quality through AI-powered assistance

## 🚀 Features

### Core Functionality
- Simple, intuitive text editor with real-time predictions
- Dual-model prediction system:
  - N-gram model for quick, local context predictions
  - GPT-3.5 Turbo for advanced contextual understanding
- Personalized suggestions based on user's writing history
- Usage analytics tracking for prediction accuracy
- Real-time spell checking with AI-powered corrections
- Customizable text formatting options:
  - Font family selection (Sans-serif, Serif, Monospace)
  - Font size adjustment
  - Text alignment options
  - Basic formatting (Bold, Italic, Underline)

### Editor Features
- Distraction-free writing environment
- Real-time word suggestions with Tab completion
- Toggle between basic and advanced prediction models
- Auto-complete on/off toggle
- Spell check on/off toggle
- Draft saving and management
- Post status tracking (draft/published)

### Technical Features
- Real-time tokenization and frequency analysis
- Context-aware prediction system
- Adaptive learning from user acceptance patterns
- Secure user authentication and data storage
- User writing style analysis and pattern recognition
- Personalized vocabulary level matching
- Common transition word suggestions
- Error handling and fallback mechanisms

### User Experience
- Clean, modern interface with TailwindCSS
- Responsive design for all devices
- Intuitive navigation between posts and drafts
- Real-time feedback on predictions
- Customizable editor settings
- Profile management and user preferences

## 🛠 Tech Stack

### Frontend
- React with TypeScript
- TailwindCSS for styling
- Modern, responsive UI components

### Backend
- FastAPI (Python)
- Async-first architecture
- RESTful API design

### Database
- PostgreSQL
- Efficient data storage and retrieval
- Secure user data management

### AI/ML Models
- N-gram models for basic prediction
- GPT-3.5 Turbo for advanced contextual understanding
- Hybrid prediction system for optimal results

## 📊 Database Structure

The application uses PostgreSQL with the following tables:

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- Stores user account information
- Uses UUID for secure identification
- Tracks account creation time

### Posts Table
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY DEFAULT nextval('posts_id_seq'),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Post',
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
- Stores blog posts and drafts
- Auto-incrementing integer IDs
- Tracks creation and update times
- Supports draft/published status

### User Patterns Table
```sql
CREATE TABLE user_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    pattern_type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    frequency INTEGER,
    last_used TIMESTAMP
);
```
- Stores user writing patterns
- Tracks pattern frequency and usage
- Enables personalized predictions

### Suggestion Stats Table
```sql
CREATE TABLE suggestion_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    shown_count INTEGER DEFAULT 0,
    accepted_count INTEGER DEFAULT 0
);
```
- Tracks prediction performance
- Measures suggestion effectiveness
- Helps improve prediction accuracy

### Key Features
- UUID-based user identification
- Automatic timestamp management
- Foreign key constraints for data integrity
- Indexed columns for optimal performance
- Support for draft/published post states
- Pattern tracking for personalized suggestions

## 🗂 Project Structure
```
blog-predict/
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── public/        # Static files
│   ├── node_modules/  # Dependencies
│   ├── package.json   # Frontend dependencies and scripts
│   ├── tailwind.config.js  # TailwindCSS configuration
│   └── postcss.config.js   # PostCSS configuration
├── backend/           # FastAPI backend server
│   ├── app/          # Main application code
│   │   ├── api/      # API endpoints
│   │   ├── models/   # Database models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic
│   ├── alembic/      # Database migrations
│   ├── venv/         # Python virtual environment
│   ├── requirements.txt  # Python dependencies
│   └── .env         # Environment variables
├── .git/             # Git repository
└── .gitignore        # Git ignore rules
```

## 🧪 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL
- OpenAI API key (for GPT-3.5 predictions)

### Backend Setup
1. Clone the repository:
```bash
git clone https://github.com/yourusername/blog-predict.git
cd blog-predict
```

2. Create and activate virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
# Create .env file in backend directory
DATABASE_URL=postgresql://user:password@localhost/blog_predict
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

5. Start the backend server:
```bash
uvicorn app.main:app --reload
```

### Frontend Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## 📝 Usage
1. Create an account or log in
2. Start a new post or open an existing one
3. Begin typing to see real-time word predictions
4. Accept or ignore suggestions as needed
5. Save your work or publish when ready

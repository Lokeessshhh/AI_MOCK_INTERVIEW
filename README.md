# AI Mock Interview Platform

A premium, AI-powered interview preparation platform with Django backend and Next.js frontend.

## Features

- **AI-Generated Questions**: Personalized interview questions based on your skills and target role
- **Voice Recording**: Practice answers with voice recording capability
- **Real-time Feedback**: Get AI-powered feedback on your responses
- **Progress Tracking**: Monitor your improvement over time
- **Premium UI**: Beautiful, modern interface with smooth animations
- **Clerk Authentication**: Secure authentication with Clerk

## Tech Stack

### Backend
- Django 5.0
- Django REST Framework
- Clerk JWT Authentication
- OpenAI API for AI question generation
- SQLite (production-ready for PostgreSQL)

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- Lucide React icons
- Axios for API calls
- Clerk for authentication

## Project Structure

```
AI MOCK INTERVIEW/
├── backend/
│   ├── config/          # Django settings and URLs
│   ├── accounts/        # User authentication and profiles
│   ├── interviews/      # Interview management
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── app/            # Next.js app directory
    │   ├── sign-in/    # Clerk sign-in page
    │   └── sign-up/    # Clerk sign-up page
    ├── components/     # Reusable UI components
    ├── lib/           # Utilities and API client
    └── package.json
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API Key
- Clerk Account (for authentication)

### Clerk Setup

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your API keys from the Clerk dashboard
4. Add the keys to your `.env.local` file

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and Clerk keys
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Start development server:
```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local and add your Clerk keys
```

4. Start development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- Clerk handles authentication automatically
- JWT tokens are validated on the backend

### Interviews
- `GET /api/interviews/` - List all interviews
- `POST /api/interviews/` - Create new interview
- `GET /api/interviews/{id}/` - Get interview details
- `GET /api/interviews/{id}/questions/` - Get interview questions
- `POST /api/interviews/questions/{id}/answer/` - Submit answer
- `POST /api/interviews/{id}/complete/` - Complete interview

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
OPENAI_API_KEY=your-openai-api-key-here
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Development

### Running Tests
```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

### Building for Production

#### Backend
```bash
cd backend
python manage.py collectstatic
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

## Features to Implement

- [x] Clerk authentication
- [ ] Voice recording and playback
- [ ] AI-powered answer evaluation
- [ ] Detailed analytics dashboard
- [ ] Interview history and replay
- [ ] Multiple interview templates
- [ ] Real-time transcription
- [ ] Dark mode toggle
- [ ] Mobile responsive design

## License

MIT

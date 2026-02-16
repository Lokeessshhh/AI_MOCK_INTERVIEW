# Vercel Deployment Guide

## Project Structure
This project has been restructured for Vercel deployment:
- Next.js frontend is at the root level
- Django backend is configured as Vercel serverless functions in the `api/` directory
- Original Django backend code remains in `backend/` directory

## Environment Variables

Set these in your Vercel project settings:

### Frontend
- `NEXT_PUBLIC_API_URL`: Your API base URL (e.g., `https://your-app.vercel.app/api`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk authentication key

### Backend
- `SECRET_KEY`: Django secret key (generate a secure one)
- `DEBUG`: Set to `False` for production
- `ALLOWED_HOSTS`: Your Vercel domain (e.g., `your-app.vercel.app`)
- `DATABASE_URL`: PostgreSQL connection string (Vercel provides this)
- `CORS_ALLOWED_ORIGINS`: Your frontend URL
- `OPENAI_API_KEY`: Your OpenAI API key

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Restructure for Vercel deployment"
   git push
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect Next.js

3. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all the variables listed above

4. **Deploy**
   - Vercel will automatically deploy on push
   - The first deployment may take longer as it builds both frontend and backend

## Database Configuration

Vercel provides managed PostgreSQL. Add the `DATABASE_URL` environment variable with your connection string.

Django will automatically use PostgreSQL when `DATABASE_URL` is set.

## Notes

- The Django backend runs as Vercel serverless functions
- Static files are handled by Vercel's CDN
- Media files need a storage solution (consider Vercel Blob or AWS S3)
- The API routes are rewritten to `/api/index.py` for Django handling

## Troubleshooting

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Ensure `ALLOWED_HOSTS` includes your Vercel domain
4. Check database connection string format

# Attendance App MVP

A simple, full-stack attendance tracking application built with Next.js, Supabase, and Tailwind CSS.

## Features

- 🔐 Authentication via Supabase Auth
- 📚 Class management (create and view classes)
- 📅 Session management (create sessions for classes)
- ✅ Attendance tracking (mark students as present/absent)
- 📊 Attendance summaries (present/absent counts)

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Supabase** - PostgreSQL database and authentication
- **Tailwind CSS** - Styling
- **Vercel** - Deployment platform

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up the database:
Run the SQL schema in `supabase/schema.sql` in your Supabase SQL editor.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Schema

- `users` - User accounts (managed by Supabase Auth)
- `classes` - Classes created by instructors
- `sessions` - Individual class sessions/dates
- `attendance` - Attendance records (student + session + status)

# Attendance App

Live Demo: https://attendance-app-chi-khaki.vercel.app


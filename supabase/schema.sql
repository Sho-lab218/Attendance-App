-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth users)
-- Note: Supabase Auth already creates an auth.users table
-- This table stores additional user profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'instructor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Class Students table (students enrolled in a class)
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(class_id, email)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.class_students(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(session_id, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for classes
CREATE POLICY "Users can view their own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own classes"
  ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for sessions
CREATE POLICY "Users can view sessions of their classes"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions for their classes"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions of their classes"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sessions of their classes"
  ON public.sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.owner_id = auth.uid()
    )
  );

-- RLS Policies for class_students
CREATE POLICY "Users can view students in their classes"
  ON public.class_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_students.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can add students to their classes"
  ON public.class_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_students.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update students in their classes"
  ON public.class_students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_students.class_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete students from their classes"
  ON public.class_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_students.class_id
      AND classes.owner_id = auth.uid()
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Users can view attendance for their classes"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.classes ON classes.id = sessions.class_id
      WHERE sessions.id = attendance.session_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attendance for their classes"
  ON public.attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.classes ON classes.id = sessions.class_id
      WHERE sessions.id = attendance.session_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attendance for their classes"
  ON public.attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.classes ON classes.id = sessions.class_id
      WHERE sessions.id = attendance.session_id
      AND classes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendance for their classes"
  ON public.attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      JOIN public.classes ON classes.id = sessions.class_id
      WHERE sessions.id = attendance.session_id
      AND classes.owner_id = auth.uid()
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


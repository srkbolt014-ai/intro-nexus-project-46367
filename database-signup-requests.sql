-- ============================================
-- SIGNUP REQUESTS TABLE FOR STUDENT ACCESS
-- ============================================

-- Create signup_requests table
create table if not exists public.signup_requests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  student_id text,
  department_id uuid references public.departments(id) on delete cascade not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.signup_requests enable row level security;

-- Allow anyone to insert (public signup)
create policy "Anyone can create signup requests"
  on public.signup_requests
  for insert
  to anon
  with check (true);

-- Department admins can view requests for their department
create policy "Department admins can view their department requests"
  on public.signup_requests
  for select
  to authenticated
  using (
    department_id in (
      select department_id 
      from public.profiles 
      where id = auth.uid()
    )
    and exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role = 'department_admin'
    )
  );

-- Department admins can update requests for their department
create policy "Department admins can update their department requests"
  on public.signup_requests
  for update
  to authenticated
  using (
    department_id in (
      select department_id 
      from public.profiles 
      where id = auth.uid()
    )
    and exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role = 'department_admin'
    )
  );

-- Super admins can view and update all requests
create policy "Super admins can view all requests"
  on public.signup_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role = 'super_admin'
    )
  );

create policy "Super admins can update all requests"
  on public.signup_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role = 'super_admin'
    )
  );

import { supabase } from '@/integrations/supabase/client';

export interface SignupRequest {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  department_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  department?: {
    name: string;
    code: string;
  };
}

export const createSignupRequest = async (
  name: string,
  email: string,
  departmentId: string,
  studentId?: string,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabase
    .from('signup_requests')
    .insert({
      name,
      email,
      student_id: studentId || null,
      department_id: departmentId,
      message: message || null,
    });

  if (error) {
    console.error('Error creating signup request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const getSignupRequests = async (
  departmentId?: string
): Promise<SignupRequest[]> => {
  if (!supabase) return [];

  let query = supabase
    .from('signup_requests')
    .select(`
      *,
      departments(name, code)
    `)
    .order('created_at', { ascending: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching signup requests:', error);
    return [];
  }

  return (data || []).map((req: any) => ({
    id: req.id,
    name: req.name,
    email: req.email,
    student_id: req.student_id,
    department_id: req.department_id,
    message: req.message,
    status: req.status,
    reviewed_by: req.reviewed_by,
    reviewed_at: req.reviewed_at,
    created_at: req.created_at,
    department: req.departments,
  }));
};

export const approveSignupRequest = async (
  requestId: string,
  reviewerId: string,
  temporaryPassword: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('signup_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Request not found' };
    }

    // Create the user account (this needs to be done by admin via Supabase dashboard or edge function)
    // For now, just mark as approved
    const { error: updateError } = await supabase
      .from('signup_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error approving signup request:', error);
    return { success: false, error: error.message };
  }
};

export const rejectSignupRequest = async (
  requestId: string,
  reviewerId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const { error } = await supabase
    .from('signup_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting signup request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

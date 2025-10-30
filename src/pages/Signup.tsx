import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap } from 'lucide-react';
import { createSignupRequest } from '@/lib/signupRequestManager';
import { getDepartments } from '@/lib/departmentManager';
import { z } from 'zod';
const signupRequestSchema = z.object({
  name: z.string().trim().min(2, {
    message: "Name must be at least 2 characters"
  }).max(100, {
    message: "Name must be less than 100 characters"
  }),
  email: z.string().trim().email({
    message: "Invalid email address"
  }).max(255, {
    message: "Email must be less than 255 characters"
  }),
  studentId: z.string().trim().optional(),
  departmentId: z.string().min(1, {
    message: "Please select a department"
  }),
  message: z.string().trim().max(500, {
    message: "Message must be less than 500 characters"
  }).optional()
});
export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const depts = await getDepartments();
    setDepartments(depts);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      signupRequestSchema.parse({
        name,
        email,
        studentId,
        departmentId,
        message
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        setLoading(false);
        return;
      }
    }

    const { success, error } = await createSignupRequest(
      name,
      email,
      departmentId,
      studentId,
      message
    );

    setLoading(false);

    if (success) {
      toast({
        title: 'Request Submitted!',
        description: 'Your access request has been sent to the department admin for review.',
      });
      // Reset form
      setName('');
      setEmail('');
      setStudentId('');
      setDepartmentId('');
      setMessage('');
    } else {
      toast({
        title: 'Submission Failed',
        description: error || 'Failed to submit request. Please try again.',
        variant: 'destructive'
      });
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 hero-gradient">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl educational-gradient shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Request Student Access</CardTitle>
          <CardDescription className="text-base">
            Submit a request to your department admin for login access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className={`h-11 border-2 ${errors.name ? 'border-destructive' : ''}`} 
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your@email.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className={`h-11 border-2 ${errors.email ? 'border-destructive' : ''}`} 
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-sm font-medium">Student ID (Optional)</Label>
              <Input 
                id="studentId" 
                type="text" 
                placeholder="e.g., S12345" 
                value={studentId} 
                onChange={e => setStudentId(e.target.value)} 
                className="h-11 border-2" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} required>
                <SelectTrigger className={`h-11 border-2 ${errors.departmentId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">Message (Optional)</Label>
              <Textarea 
                id="message" 
                placeholder="Any additional information..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                rows={3} 
                className="border-2" 
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>

            <Button type="submit" variant="glow" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
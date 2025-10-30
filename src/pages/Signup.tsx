import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, UserCircle, Briefcase } from 'lucide-react';
import { createApplication } from '@/lib/instructorApplicationManager';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
const signupSchema = z.object({
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
  password: z.string().min(6, {
    message: "Password must be at least 6 characters"
  }).max(100, {
    message: "Password must be less than 100 characters"
  })
});
const instructorApplicationSchema = z.object({
  reason: z.string().trim().min(10, {
    message: "Please provide at least 10 characters"
  }).max(500, {
    message: "Reason must be less than 500 characters"
  }),
  experience: z.string().trim().min(10, {
    message: "Please provide at least 10 characters"
  }).max(500, {
    message: "Experience must be less than 500 characters"
  }),
  expertise: z.string().trim().min(5, {
    message: "Please provide at least 5 characters"
  }).max(200, {
    message: "Expertise must be less than 200 characters"
  }),
  qualifications: z.string().trim().min(10, {
    message: "Please provide at least 10 characters"
  }).max(500, {
    message: "Qualifications must be less than 500 characters"
  }),
  courseIdea: z.string().trim().min(20, {
    message: "Please provide at least 20 characters"
  }).max(1000, {
    message: "Course idea must be less than 1000 characters"
  })
});
export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'student' | 'instructor'>('student');
  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [expertise, setExpertise] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [courseIdea, setCourseIdea] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    signup
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate basic signup fields
    try {
      signupSchema.parse({
        name,
        email,
        password
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
        return;
      }
    }

    // Validate instructor application fields if instructor
    if (accountType === 'instructor') {
      try {
        instructorApplicationSchema.parse({
          reason,
          experience,
          expertise,
          qualifications,
          courseIdea
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
          toast({
            title: 'Validation Error',
            description: 'Please fill out all instructor application fields correctly',
            variant: 'destructive'
          });
          return;
        }
      }
    }
    const {
      error
    } = await signup(name, email, password, accountType);
    if (!error) {
      if (accountType === 'instructor') {
        try {
          // Get the current user
          const {
            data: {
              user
            }
          } = await supabase!.auth.getUser();
          if (user) {
            // Create instructor application in database
            await createApplication(user.id, {
              reason,
              experience,
              expertise,
              qualifications,
              courseIdea
            });
            toast({
              title: 'Application submitted!',
              description: 'Your instructor application has been sent for admin review. You can use the platform as a student while waiting for approval.'
            });
          }
        } catch (appError) {
          console.error('Failed to create application:', appError);
          toast({
            title: 'Application Error',
            description: 'Account created but failed to submit application. Please contact support.',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Account created successfully!'
        });
      }
      navigate('/student/dashboard');
    } else {
      toast({
        title: 'Signup failed',
        description: error || 'Failed to create account',
        variant: 'destructive'
      });
    }
  };
  return <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 hero-gradient">
      <Card className="w-full max-w-md card-glass">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gradient">Sign Up Disabled</CardTitle>
          <CardDescription className="text-base">
            Public registration is currently disabled. Please contact your administrator for an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            
            <ul className="text-sm text-muted-foreground space-y-1">
              
              
            </ul>
          </div>
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* OLD SIGNUP FORM - KEPT FOR REFERENCE, HIDDEN */}
      <Card className="w-full max-w-2xl relative z-10 border-2 card-glass shadow-2xl max-h-[95vh] overflow-y-auto hidden">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl educational-gradient shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-display font-bold">Join LearnFlow</CardTitle>
          <CardDescription className="text-base">Create your account and start your journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">I want to join as:</Label>
              <RadioGroup value={accountType} onValueChange={value => setAccountType(value as 'student' | 'instructor')}>
                <div className="grid grid-cols-2 gap-4">
                  <Label htmlFor="student" className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${accountType === 'student' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="student" id="student" className="sr-only" />
                    <div className="flex flex-col items-center gap-2">
                      <UserCircle className="h-8 w-8" />
                      <span className="font-semibold">Student</span>
                      <span className="text-xs text-muted-foreground text-center">Learn from courses</span>
                    </div>
                  </Label>
                  
                  <Label htmlFor="instructor" className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${accountType === 'instructor' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="instructor" id="instructor" className="sr-only" />
                    <div className="flex flex-col items-center gap-2">
                      <Briefcase className="h-8 w-8" />
                      <span className="font-semibold">Instructor</span>
                      <span className="text-xs text-muted-foreground text-center">Teach courses</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <Input id="name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className={`h-11 border-2 ${errors.name ? 'border-destructive' : ''}`} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className={`h-11 border-2 ${errors.email ? 'border-destructive' : ''}`} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className={`h-11 border-2 ${errors.password ? 'border-destructive' : ''}`} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {accountType === 'instructor' && <div className="space-y-4 p-5 rounded-xl bg-muted/50 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Instructor Application</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Tell us about yourself and your teaching experience. Your application will be reviewed by our admin team.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">Why do you want to become an instructor?</Label>
                  <Textarea id="reason" placeholder="Share your motivation for teaching..." value={reason} onChange={e => setReason(e.target.value)} required rows={3} className={`border-2 ${errors.reason ? 'border-destructive' : ''}`} />
                  {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-sm font-medium">Teaching Experience</Label>
                  <Textarea id="experience" placeholder="Describe your teaching background..." value={experience} onChange={e => setExperience(e.target.value)} required rows={3} className={`border-2 ${errors.experience ? 'border-destructive' : ''}`} />
                  {errors.experience && <p className="text-xs text-destructive">{errors.experience}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise" className="text-sm font-medium">Area of Expertise</Label>
                  <Input id="expertise" placeholder="e.g., Web Development, Data Science..." value={expertise} onChange={e => setExpertise(e.target.value)} required className={`h-11 border-2 ${errors.expertise ? 'border-destructive' : ''}`} />
                  {errors.expertise && <p className="text-xs text-destructive">{errors.expertise}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications" className="text-sm font-medium">Qualifications & Certifications</Label>
                  <Textarea id="qualifications" placeholder="List your relevant qualifications..." value={qualifications} onChange={e => setQualifications(e.target.value)} required rows={3} className={`border-2 ${errors.qualifications ? 'border-destructive' : ''}`} />
                  {errors.qualifications && <p className="text-xs text-destructive">{errors.qualifications}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courseIdea" className="text-sm font-medium">First Course Idea</Label>
                  <Textarea id="courseIdea" placeholder="Describe a course you'd like to create..." value={courseIdea} onChange={e => setCourseIdea(e.target.value)} required rows={4} className={`border-2 ${errors.courseIdea ? 'border-destructive' : ''}`} />
                  {errors.courseIdea && <p className="text-xs text-destructive">{errors.courseIdea}</p>}
                </div>
              </div>}

            <Button type="submit" variant="glow" size="lg" className="w-full">
              {accountType === 'instructor' ? 'Submit Application' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:text-primary-glow font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>;
}
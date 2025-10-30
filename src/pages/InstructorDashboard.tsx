import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { notifyEnrolledStudents } from '@/lib/notificationManager';
import { createCourse, getInstructorCourses, updateCourse, deleteCourse, getCourseEnrollmentCount, Course } from '@/lib/courseManager';
import { createLesson, getCourseLessons, updateLesson, deleteLesson, reorderLessons } from '@/lib/lessonManager';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<(Course & { enrollmentCount?: number })[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    thumbnail: '',
    category: '',
    duration: '',
    difficulty: 'beginner' as const,
    lessons: [{ title: '', description: '', videoUrl: '', duration: '' }],
  });

  const [editCourse, setEditCourse] = useState<{
    title: string;
    description: string;
    thumbnail: string;
    category: string;
    duration: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    lessons: { id?: string; title: string; description: string; videoUrl: string; duration: string }[];
  }>({
    title: '',
    description: '',
    thumbnail: '',
    category: '',
    duration: '',
    difficulty: 'beginner',
    lessons: [{ title: '', description: '', videoUrl: '', duration: '' }],
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'instructor') {
      loadCourses();
    }
  }, [user, navigate]);

  const loadCourses = async () => {
    if (!user) return;
    setLoading(true);
    const instructorCourses = await getInstructorCourses(user.id);
    
    // Get enrollment counts
    const coursesWithCounts = await Promise.all(
      instructorCourses.map(async (course) => {
        const count = await getCourseEnrollmentCount(course.id);
        return { ...course, enrollmentCount: count };
      })
    );
    
    setCourses(coursesWithCounts);
    setLoading(false);
  };

  const handleCreateCourse = async () => {
    if (!user || !user.departmentId) {
      toast({ title: 'Error', description: 'User information missing', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const createdCourse = await createCourse({
      title: newCourse.title,
      description: newCourse.description,
      instructorId: user.id,
      instructorName: user.name,
      category: newCourse.category,
      level: newCourse.difficulty,
      duration: newCourse.duration,
      thumbnail: newCourse.thumbnail,
      departmentId: user.departmentId,
    });

    if (createdCourse) {
      // Create lessons
      const validLessons = newCourse.lessons.filter(l => l.title.trim() && l.videoUrl.trim());
      for (let i = 0; i < validLessons.length; i++) {
        await createLesson({
          courseId: createdCourse.id,
          title: validLessons[i].title,
          description: validLessons[i].description,
          videoUrl: validLessons[i].videoUrl,
          duration: validLessons[i].duration,
          orderIndex: i + 1,
        });
      }

      await loadCourses();
      setShowCreateDialog(false);
      setNewCourse({
        title: '',
        description: '',
        thumbnail: '',
        category: '',
        duration: '',
        difficulty: 'beginner',
        lessons: [{ title: '', description: '', videoUrl: '', duration: '' }],
      });
      toast({ title: 'Course created successfully!' });
    } else {
      toast({ title: 'Error', description: 'Failed to create course', variant: 'destructive' });
    }
    setLoading(false);
  };

  const addLesson = (isEdit: boolean = false) => {
    const newLesson = { title: '', description: '', videoUrl: '', duration: '' };
    if (isEdit) {
      setEditCourse({ ...editCourse, lessons: [...editCourse.lessons, newLesson] });
    } else {
      setNewCourse({ ...newCourse, lessons: [...newCourse.lessons, newLesson] });
    }
  };

  const removeLesson = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditCourse({ 
        ...editCourse, 
        lessons: editCourse.lessons.filter((_, i) => i !== index) 
      });
    } else {
      setNewCourse({ 
        ...newCourse, 
        lessons: newCourse.lessons.filter((_, i) => i !== index) 
      });
    }
  };

  const updateLessonField = (index: number, field: string, value: string, isEdit: boolean = false) => {
    if (isEdit) {
      const updatedLessons = [...editCourse.lessons];
      updatedLessons[index] = { ...updatedLessons[index], [field]: value };
      setEditCourse({ ...editCourse, lessons: updatedLessons });
    } else {
      const updatedLessons = [...newCourse.lessons];
      updatedLessons[index] = { ...updatedLessons[index], [field]: value };
      setNewCourse({ ...newCourse, lessons: updatedLessons });
    }
  };

  const handleEditClick = async (course: Course) => {
    setEditingCourse(course);
    
    // Load lessons from database
    const lessons = await getCourseLessons(course.id);
    
    setEditCourse({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      duration: course.duration,
      difficulty: course.level as 'beginner' | 'intermediate' | 'advanced',
      lessons: lessons.length > 0 
        ? lessons.map(l => ({
            id: l.id,
            title: l.title, 
            description: l.description || '', 
            videoUrl: l.videoUrl || '', 
            duration: l.duration || ''
          }))
        : [{ title: '', description: '', videoUrl: '', duration: '' }],
    });
    setShowEditDialog(true);
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    setLoading(true);
    const success = await updateCourse(editingCourse.id, {
      title: editCourse.title,
      description: editCourse.description,
      category: editCourse.category,
      level: editCourse.difficulty,
      duration: editCourse.duration,
      thumbnail: editCourse.thumbnail,
    });

    if (success) {
      // Get existing lessons
      const existingLessons = await getCourseLessons(editingCourse.id);
      const validLessons = editCourse.lessons.filter(l => l.title.trim() && l.videoUrl.trim());

      // Update or create lessons
      for (let i = 0; i < validLessons.length; i++) {
        const lesson = validLessons[i];
        if (lesson.id && existingLessons.find(l => l.id === lesson.id)) {
          // Update existing lesson
          await updateLesson(lesson.id, {
            title: lesson.title,
            description: lesson.description,
            videoUrl: lesson.videoUrl,
            duration: lesson.duration,
            orderIndex: i + 1,
          });
        } else {
          // Create new lesson
          await createLesson({
            courseId: editingCourse.id,
            title: lesson.title,
            description: lesson.description,
            videoUrl: lesson.videoUrl,
            duration: lesson.duration,
            orderIndex: i + 1,
          });
        }
      }

      // Delete lessons that were removed
      const lessonIdsToKeep = validLessons.filter(l => l.id).map(l => l.id!);
      for (const existingLesson of existingLessons) {
        if (!lessonIdsToKeep.includes(existingLesson.id)) {
          await deleteLesson(existingLesson.id);
        }
      }

      // Notify enrolled students
      await notifyEnrolledStudents(
        editingCourse.id,
        editCourse.title,
        'course_update',
        `${editCourse.title} has been updated with new content!`
      );

      await loadCourses();
      setShowEditDialog(false);
      setEditingCourse(null);
      toast({ title: 'Course updated successfully!' });
    } else {
      toast({ title: 'Error', description: 'Failed to update course', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleDeleteCourse = async () => {
    if (!editingCourse) return;

    setLoading(true);
    const success = await deleteCourse(editingCourse.id);
    
    if (success) {
      await loadCourses();
      setShowEditDialog(false);
      setEditingCourse(null);
      toast({ title: 'Course deleted' });
    } else {
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    }
    setLoading(false);
  };

  if (!user || user.role !== 'instructor') {
    navigate('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Instructor Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>Fill in the course details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  value={newCourse.thumbnail}
                  onChange={(e) => setNewCourse({ ...newCourse, thumbnail: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={newCourse.category}
                    onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (e.g., "4 weeks")</Label>
                  <Input
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    placeholder="4 weeks"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={newCourse.difficulty}
                  onValueChange={(v: any) => setNewCourse({ ...newCourse, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Lessons</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addLesson(false)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Lesson
                  </Button>
                </div>
                {newCourse.lessons.map((lesson, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Lesson {index + 1}</span>
                      {newCourse.lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLesson(index, false)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Lesson Title"
                      value={lesson.title}
                      onChange={(e) => updateLessonField(index, 'title', e.target.value, false)}
                    />
                    <Input
                      placeholder="Video URL (Vimeo/YouTube)"
                      value={lesson.videoUrl}
                      onChange={(e) => updateLessonField(index, 'videoUrl', e.target.value, false)}
                    />
                    <Input
                      placeholder="Duration (e.g., 15:30)"
                      value={lesson.duration}
                      onChange={(e) => updateLessonField(index, 'duration', e.target.value, false)}
                    />
                  </div>
                ))}
              </div>

              <Button onClick={handleCreateCourse} className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>Update your course details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editCourse.title}
                  onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editCourse.description}
                  onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input
                  value={editCourse.thumbnail}
                  onChange={(e) => setEditCourse({ ...editCourse, thumbnail: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editCourse.category}
                    onChange={(e) => setEditCourse({ ...editCourse, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (e.g., "4 weeks")</Label>
                  <Input
                    value={editCourse.duration}
                    onChange={(e) => setEditCourse({ ...editCourse, duration: e.target.value })}
                    placeholder="4 weeks"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={editCourse.difficulty}
                  onValueChange={(v: any) => setEditCourse({ ...editCourse, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Lessons</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addLesson(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Lesson
                  </Button>
                </div>
                {editCourse.lessons.map((lesson, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Lesson {index + 1}</span>
                      {editCourse.lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLesson(index, true)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Lesson Title"
                      value={lesson.title}
                      onChange={(e) => updateLessonField(index, 'title', e.target.value, true)}
                    />
                    <Input
                      placeholder="Video URL (Vimeo/YouTube)"
                      value={lesson.videoUrl}
                      onChange={(e) => updateLessonField(index, 'videoUrl', e.target.value, true)}
                    />
                    <Input
                      placeholder="Duration (e.g., 15:30)"
                      value={lesson.duration}
                      onChange={(e) => updateLessonField(index, 'duration', e.target.value, true)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateCourse} className="flex-1" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Course'}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteCourse}
                  className="flex-1"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Course
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id}>
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <CardHeader>
              <CardTitle className="line-clamp-2">{course.title}</CardTitle>
              <CardDescription className="line-clamp-2">{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {course.enrollmentCount || 0} students
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleEditClick(course)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Course
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">You haven't created any courses yet.</p>
        </div>
      )}
    </div>
  );
}
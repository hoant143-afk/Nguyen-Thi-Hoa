import { apiClient } from '../services/apiClient';
import { Classroom, DEFAULT_CLASSES } from '../data/classData';
import { EduplayStorage } from '../services/eduplayStorage';

export class ClassesRepository {
  public static async listClasses(): Promise<Classroom[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('classes.list');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // For each class, load its students from cloud
          const classesWithStudents: Classroom[] = [];
          for (const c of res.data) {
            let students: any[] = [];
            try {
              const stRes = await apiClient.apiRequest<any[]>('students.listByClass', { classId: c.id });
              if (stRes.success && Array.isArray(stRes.data)) {
                students = stRes.data.map(st => ({
                  id: st.id,
                  name: st.fullName || st.displayName,
                  gender: (st.gender === 'F' ? 'F' : 'M') as 'M' | 'F',
                  stars: Number(st.stars) || 5,
                }));
              }
            } catch {}

            classesWithStudents.push({
              id: c.id,
              name: c.className || c.classCode || 'Lớp',
              grade: `Lớp ${c.grade || 5}`,
              teacherName: c.teacherName || 'Giáo viên',
              schoolName: c.schoolName || 'Trường Tiểu học',
              students: students,
            });
          }
          if (classesWithStudents.length > 0) {
            return classesWithStudents;
          }
        }
      } catch (err) {
        console.warn('Failed to load classes from cloud, falling back to local', err);
      }
    }

    // Local fallback
    const local = EduplayStorage.getClasses();
    return local && local.length > 0 ? local : DEFAULT_CLASSES;
  }

  public static async createClass(cls: Omit<Classroom, 'id'>): Promise<Classroom> {
    const newClass: Classroom = {
      ...cls,
      id: `class_${Date.now()}`,
    };

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('classes.create', {
          className: cls.name,
          grade: parseInt(cls.grade.replace(/\D/g, ''), 10) || 5,
          teacherName: cls.teacherName,
          schoolName: cls.schoolName,
          studentCount: cls.students.length,
        });

        if (res.success && res.data) {
          newClass.id = res.data.id;
          // Upload students
          for (const st of cls.students) {
            await apiClient.apiRequest('students.create', {
              classId: newClass.id,
              fullName: st.name,
              displayName: st.name,
            });
          }
        }
      } catch (err) {
        console.warn('Cloud create failed, saved locally', err);
      }
    }

    // Update local storage
    const current = EduplayStorage.getClasses();
    EduplayStorage.saveClasses([...current, newClass]);
    return newClass;
  }
}

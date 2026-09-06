import { apiClient } from '../services/apiClient';
import { Student } from '../data/classData';

export class StudentsRepository {
  public static async listByClass(classId: string): Promise<Student[]> {
    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any[]>('students.listByClass', { classId });
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(st => ({
            id: st.id,
            name: st.fullName || st.displayName,
            gender: (st.gender === 'F' ? 'F' : 'M') as 'M' | 'F',
            stars: Number(st.stars) || 5,
          }));
        }
      } catch (err) {
        console.warn('Failed to load students from cloud', err);
      }
    }
    return [];
  }

  public static async createStudent(classId: string, student: Omit<Student, 'id'>): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    if (apiClient.getMode() === 'cloud') {
      try {
        const res = await apiClient.apiRequest<any>('students.create', {
          classId,
          fullName: student.name,
          displayName: student.name,
        });
        if (res.success && res.data) {
          newStudent.id = res.data.id;
        }
      } catch (err) {
        console.warn('Cloud create student failed', err);
      }
    }

    return newStudent;
  }
}

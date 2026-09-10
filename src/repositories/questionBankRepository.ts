import { QuestionBankLesson, GradeLevel, Question } from '../types';
import { DEFAULT_QUESTION_BANKS, SUBJECTS_BY_GRADE } from '../data/questionBanksData';
import { EduplayStorage } from '../services/eduplayStorage';

const STORAGE_KEYS = {
  LESSONS: 'eduplay_question_bank_lessons_v1',
  SELECTED_LESSON_ID: 'eduplay_selected_lesson_id_v1',
};

export class QuestionBankRepository {
  /**
   * Retrieves all lessons across all grades (1 to 9).
   */
  public static getAllLessons(): QuestionBankLesson[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LESSONS);
      if (!raw) {
        this.saveAllLessons(DEFAULT_QUESTION_BANKS);
        return DEFAULT_QUESTION_BANKS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_QUESTION_BANKS;
    } catch (e) {
      console.error('Error loading question bank lessons', e);
      return DEFAULT_QUESTION_BANKS;
    }
  }

  /**
   * Alias for getAllLessons
   */
  public static getLessons(): QuestionBankLesson[] {
    return this.getAllLessons();
  }

  /**
   * Saves the entire collection of lessons.
   */
  public static saveAllLessons(lessons: QuestionBankLesson[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
    } catch (e) {
      console.error('Error saving lessons', e);
    }
  }

  /**
   * Retrieves lessons filtered by Grade (1-9).
   */
  public static getLessonsByGrade(grade: GradeLevel): QuestionBankLesson[] {
    const all = this.getAllLessons();
    return all.filter((l) => Number(l.grade) === Number(grade));
  }

  /**
   * Retrieves available subjects for a specific grade.
   */
  public static getSubjectsByGrade(grade: GradeLevel): string[] {
    const defaultSubjects = SUBJECTS_BY_GRADE[grade] || [];
    const lessons = this.getLessonsByGrade(grade);
    const existingSubjects = Array.from(new Set(lessons.map((l) => l.subject)));
    // Combine and deduplicate
    const combined = Array.from(new Set([...defaultSubjects, ...existingSubjects]));
    return combined;
  }

  /**
   * Retrieves lessons filtered by Grade and Subject.
   */
  public static getLessonsByGradeAndSubject(grade: GradeLevel, subject: string): QuestionBankLesson[] {
    const lessons = this.getLessonsByGrade(grade);
    if (!subject || subject === 'Tất cả môn') {
      return lessons;
    }
    return lessons.filter((l) => l.subject.toLowerCase() === subject.toLowerCase());
  }

  /**
   * Retrieves a single lesson by ID.
   */
  public static getLessonById(id: string): QuestionBankLesson | undefined {
    const all = this.getAllLessons();
    return all.find((l) => l.id === id);
  }

  /**
   * Saves or updates a lesson.
   */
  public static saveLesson(lesson: QuestionBankLesson): void {
    const all = this.getAllLessons();
    const index = all.findIndex((l) => l.id === lesson.id);
    if (index >= 0) {
      all[index] = lesson;
    } else {
      all.push(lesson);
    }
    this.saveAllLessons(all);

    // If this lesson is currently active, sync questions to EduplayStorage
    if (this.getSelectedLessonId() === lesson.id && lesson.questions && lesson.questions.length > 0) {
      EduplayStorage.saveQuestions(lesson.questions);
    }
  }

  /**
   * Deletes a lesson by ID.
   */
  public static deleteLesson(id: string): void {
    const all = this.getAllLessons().filter((l) => l.id !== id);
    this.saveAllLessons(all);
  }

  /**
   * Adds or updates a question inside a lesson.
   */
  public static saveQuestionToLesson(lessonId: string, question: Question): void {
    const lesson = this.getLessonById(lessonId);
    if (!lesson) return;

    const qIndex = lesson.questions.findIndex((q) => q.id === question.id);
    if (qIndex >= 0) {
      lesson.questions[qIndex] = question;
    } else {
      lesson.questions.push(question);
    }
    this.saveLesson(lesson);
  }

  /**
   * Removes a question from a lesson.
   */
  public static deleteQuestionFromLesson(lessonId: string, questionId: number): void {
    const lesson = this.getLessonById(lessonId);
    if (!lesson) return;

    lesson.questions = lesson.questions.filter((q) => q.id !== questionId);
    this.saveLesson(lesson);
  }

  /**
   * Currently active/selected lesson for game sessions.
   * Defaults to 'k5_tinhoc_b1' (Cam Race classic).
   */
  public static getSelectedLesson(): QuestionBankLesson {
    const defaultId = 'k5_tinhoc_b1';
    try {
      const selectedId = localStorage.getItem(STORAGE_KEYS.SELECTED_LESSON_ID) || defaultId;
      const found = this.getLessonById(selectedId);
      if (found) return found;

      // Fallback to first available or default
      const all = this.getAllLessons();
      return all[0] || DEFAULT_QUESTION_BANKS[0];
    } catch {
      return DEFAULT_QUESTION_BANKS[0];
    }
  }

  /**
   * Returns currently selected lesson ID.
   */
  public static getSelectedLessonId(): string {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_LESSON_ID) || 'k5_tinhoc_b1';
  }

  /**
   * Sets the active lesson ID.
   */
  public static setSelectedLessonId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_LESSON_ID, id);
      const lesson = this.getLessonById(id);
      if (lesson && lesson.questions && lesson.questions.length > 0) {
        EduplayStorage.saveQuestions(lesson.questions);
      }
    } catch (e) {
      console.error('Error saving selected lesson ID', e);
    }
  }

  /**
   * Resets all banks back to original factory defaults.
   */
  public static resetToDefaults(): void {
    this.saveAllLessons(DEFAULT_QUESTION_BANKS);
    this.setSelectedLessonId('k5_tinhoc_b1');
  }
}

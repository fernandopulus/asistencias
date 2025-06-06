
export enum Subject {
  LENGUA_LITERATURA = "Lengua y Literatura",
  MATEMATICA = "Matemática",
  CIENCIAS = "Ciencias",
  CIENCIAS_CIUDADANIA = "Ciencias para la ciudadanía",
  HISTORIA = "Historia",
  EDUCACION_CIUDADANA = "Educación Ciudadana",
  FILOSOFIA = "Filosofía",
  INGLES = "Inglés",
  PENSAMIENTO_LOGICO = "Pensamiento Lógico",
  COMPETENCIA_LECTORA = "Competencia Lectora",
  ARTES = "Artes",
  MUSICA = "Música",
  EDUCACION_FISICA = "Educación Física",
  EMPRENDIMIENTO = "Emprendimiento",
  MECANICA_AUTOMOTRIZ = "Mecánica Automotriz",
  MECANICA_INDUSTRIAL = "Mecánica Industrial",
  TECNOLOGIA = "Tecnología",
}

export enum CoverageType {
  COVERED = "Horas cubiertas", 
  ACCOUNTED_NOT_DONE = "Hora contabilizada pero no hecha",
}

export interface AbsenceRecord {
  id: string; // This will be the Firestore document ID
  date: string; // ISO string format "YYYY-MM-DD"
  absentTeacher: string;
  absentTeacherSubject: Subject;
  replacementTeacher: string;
  replacementTeacherSubject: Subject;
  hoursCovered: number;
  coverageType: CoverageType;
}

// Utility type for data before it's sent to Firestore (Firestore generates the ID)
export type OmitId<T> = Omit<T, 'id'>;


export interface Filters {
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  absentTeacherSubject: Subject | '';
  replacementTeacherSubject: Subject | '';
}

export interface MonthlyConsolidatedData {
  month: number;
  year: number;
  absencesByTeacher: Record<string, number>;
  absencesBySubject: Record<string, number>; 
  replacementsByTeacher: Record<string, { coveredHours: number; accountedHours: number }>;
  coverageByOriginalSubject: Record<string, { coveredHours: number; accountedHours: number }>; 
  globalTotals: {
    totalAbsencesEvents: number;
    totalHours: number;
    totalCoveredHours: number;
    totalAccountedHours: number;
  };
  recordsInMonth: AbsenceRecord[];
}
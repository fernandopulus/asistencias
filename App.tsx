import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AbsenceRecord, CoverageType, Subject, Filters, MonthlyConsolidatedData, OmitId } from './types';
import { ALL_SUBJECTS, APP_TITLE, TABS } from './constants';
import AbsenceForm from './components/AbsenceForm';
import AbsenceList from './components/AbsenceList';
import ConsolidatedView from './components/ConsolidatedView';
import { 
  fetchAbsenceRecordsFromFirestore, 
  addAbsenceRecordToFirestore, 
  deleteAbsenceRecordFromFirestore 
} from './firebase'; // Ensure firebase.ts is created

const App: React.FC = () => {
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>(TABS.REGISTRATION);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    absentTeacherSubject: '',
    replacementTeacherSubject: '',
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const records = await fetchAbsenceRecordsFromFirestore();
        setAbsenceRecords(records);
      } catch (err) {
        console.error("Failed to load records:", err);
        setError("Error al cargar los registros. Por favor, intente recargar la página.");
        alert("Error al cargar los registros. Verifique la consola para más detalles.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addAbsenceRecord = useCallback(async (record: Omit<AbsenceRecord, 'id' | 'coverageType'>) => {
    const coverageType = record.absentTeacherSubject === record.replacementTeacherSubject
      ? CoverageType.COVERED
      : CoverageType.ACCOUNTED_NOT_DONE;
    
    const recordDataForFirestore: OmitId<AbsenceRecord> = {
      ...record,
      coverageType,
    };

    setIsLoading(true); // Optional: for visual feedback during save
    try {
      const newRecordWithId = await addAbsenceRecordToFirestore(recordDataForFirestore);
      setAbsenceRecords(prevRecords => [newRecordWithId, ...prevRecords]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      alert("Registro guardado exitosamente en la nube.");
    } catch (err) {
      console.error("Failed to save record:", err);
      setError("Error al guardar el registro.");
      alert("Error al guardar el registro. Verifique la consola para más detalles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAbsenceRecord = useCallback(async (id: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.")) {
      return;
    }
    setIsLoading(true); // Optional: for visual feedback during delete
    try {
      await deleteAbsenceRecordFromFirestore(id);
      setAbsenceRecords(prevRecords => prevRecords.filter(record => record.id !== id));
      alert("Registro eliminado exitosamente de la nube.");
    } catch (err) {
      console.error("Failed to delete record:", err);
      setError("Error al eliminar el registro.");
      alert("Error al eliminar el registro. Verifique la consola para más detalles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredRecords = useMemo(() => {
    return absenceRecords.filter(record => {
      const recordDate = new Date(record.date);
      const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo) {
        const adjustedDateTo = new Date(dateTo);
        adjustedDateTo.setDate(adjustedDateTo.getDate() + 1); 
        if (recordDate >= adjustedDateTo) return false;
      }
      
      if (filters.absentTeacherSubject && record.absentTeacherSubject !== filters.absentTeacherSubject) return false;
      if (filters.replacementTeacherSubject && record.replacementTeacherSubject !== filters.replacementTeacherSubject) return false;
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchMatch = record.absentTeacher.toLowerCase().includes(term) ||
                            record.replacementTeacher.toLowerCase().includes(term) ||
                            record.absentTeacherSubject.toLowerCase().includes(term) ||
                            record.replacementTeacherSubject.toLowerCase().includes(term);
        if (!searchMatch) return false;
      }
      return true;
    });
  }, [absenceRecords, filters]);


  const calculateMonthlyConsolidated = useCallback((month: number, year: number): MonthlyConsolidatedData => {
    const recordsInMonth = absenceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });

    const absencesByTeacher: Record<string, number> = {};
    const absencesBySubject: Record<string, number> = {};
    const replacementsByTeacher: Record<string, { coveredHours: number; accountedHours: number }> = {};
    const coverageByOriginalSubject: Record<string, { coveredHours: number; accountedHours: number }> = {};
    let totalAbsencesEvents = 0;
    let totalHours = 0;
    let totalCoveredHours = 0;
    let totalAccountedHours = 0;

    recordsInMonth.forEach(record => {
      totalAbsencesEvents++;
      totalHours += record.hoursCovered;

      absencesByTeacher[record.absentTeacher] = (absencesByTeacher[record.absentTeacher] || 0) + 1;
      absencesBySubject[record.absentTeacherSubject] = (absencesBySubject[record.absentTeacherSubject] || 0) + 1;

      if (!replacementsByTeacher[record.replacementTeacher]) {
        replacementsByTeacher[record.replacementTeacher] = { coveredHours: 0, accountedHours: 0 };
      }
      if (!coverageByOriginalSubject[record.absentTeacherSubject]) {
        coverageByOriginalSubject[record.absentTeacherSubject] = { coveredHours: 0, accountedHours: 0 };
      }
      
      if (record.coverageType === CoverageType.COVERED) {
        replacementsByTeacher[record.replacementTeacher].coveredHours += record.hoursCovered;
        coverageByOriginalSubject[record.absentTeacherSubject].coveredHours += record.hoursCovered;
        totalCoveredHours += record.hoursCovered;
      } else {
        replacementsByTeacher[record.replacementTeacher].accountedHours += record.hoursCovered;
        coverageByOriginalSubject[record.absentTeacherSubject].accountedHours += record.hoursCovered;
        totalAccountedHours += record.hoursCovered;
      }
    });
    
    return {
      month,
      year,
      absencesByTeacher,
      absencesBySubject,
      replacementsByTeacher,
      coverageByOriginalSubject,
      globalTotals: {
        totalAbsencesEvents,
        totalHours,
        totalCoveredHours,
        totalAccountedHours,
      },
      recordsInMonth,
    };
  }, [absenceRecords]);

  if (isLoading && absenceRecords.length === 0 && activeTab === TABS.REGISTRATION) { // Show general loading only on initial data fetch
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-liceoBlue text-xl">Cargando datos...</div>
      </div>
    );
  }

  if (error) {
     return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-liceoAccent hover:bg-opacity-80 text-white font-semibold py-2 px-6 rounded-md shadow-sm transition duration-150 ease-in-out"
        >
          Recargar Página
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-liceoBlue text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold text-center">{APP_TITLE}</h1>
      </header>

      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 flex justify-center">
          {[TABS.REGISTRATION, TABS.CONSOLIDATED].map(tabName => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`py-4 px-6 text-lg font-medium focus:outline-none transition-colors duration-150
                ${activeTab === tabName 
                  ? 'border-b-4 border-liceoAccent text-liceoAccent' 
                  : 'text-gray-600 hover:text-liceoAccent'}`}
              aria-current={activeTab === tabName ? 'page' : undefined}
            >
              {tabName}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8">
        {isLoading && <div className="text-center text-liceoBlue p-4">Actualizando datos...</div>}
        {activeTab === TABS.REGISTRATION && (
          <>
            <AbsenceForm onSubmit={addAbsenceRecord} />
            <AbsenceList 
              records={filteredRecords} 
              filters={filters}
              onFiltersChange={setFilters}
              onDelete={deleteAbsenceRecord}
            />
          </>
        )}
        {activeTab === TABS.CONSOLIDATED && (
          <ConsolidatedView 
            calculateData={calculateMonthlyConsolidated} 
            subjects={ALL_SUBJECTS} 
          />
        )}
      </main>

      <footer className="bg-gray-200 text-center p-4 mt-8 text-sm text-gray-600">
        <p>&copy; {new Date().getFullYear()} Liceo Industrial de Recoleta. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default App;

import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import type { Firestore, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
// import { getAnalytics } from 'firebase/analytics'; // Analytics can be added if needed
import { AbsenceRecord, OmitId } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAsXmF2kw9vISEhmKBG7RxbVaAZYrtCk0Y", // Replace with your actual API key
  authDomain: "traductor-escolar.firebaseapp.com",
  projectId: "traductor-escolar",
  storageBucket: "traductor-escolar.firebasestorage.app",
  messagingSenderId: "1016369858850",
  appId: "1:1016369858850:web:da3d29a63d4f61b8673d7b",
  measurementId: "G-83J80F0Y1J"
};

let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  // const analytics = getAnalytics(app); // Enable if analytics is used
  console.log("Firebase initialized successfully.");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Handle initialization error, maybe show a message to the user
}


const ABSENCE_RECORDS_COLLECTION = 'absenceRecords';

export const fetchAbsenceRecordsFromFirestore = async (): Promise<AbsenceRecord[]> => {
  if (!db) {
    console.error("Firestore is not initialized.");
    throw new Error("Firestore is not initialized.");
  }
  try {
    const querySnapshot = await getDocs(collection(db, ABSENCE_RECORDS_COLLECTION));
    const records: AbsenceRecord[] = [];
    querySnapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      records.push({ id: docSnap.id, ...docSnap.data() } as AbsenceRecord);
    });
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
  } catch (error) {
    console.error("Error fetching absence records: ", error);
    throw error;
  }
};

export const addAbsenceRecordToFirestore = async (recordData: OmitId<AbsenceRecord>): Promise<AbsenceRecord> => {
  if (!db) {
    console.error("Firestore is not initialized.");
    throw new Error("Firestore is not initialized.");
  }
  try {
    const docRef = await addDoc(collection(db, ABSENCE_RECORDS_COLLECTION), recordData);
    console.log("Document written with ID: ", docRef.id);
    return { ...recordData, id: docRef.id };
  } catch (error) {
    console.error("Error adding absence record: ", error);
    throw error;
  }
};

export const deleteAbsenceRecordFromFirestore = async (recordId: string): Promise<void> => {
  if (!db) {
    console.error("Firestore is not initialized.");
    throw new Error("Firestore is not initialized.");
  }
  try {
    await deleteDoc(doc(db, ABSENCE_RECORDS_COLLECTION, recordId));
    console.log("Document successfully deleted with ID: ", recordId);
  } catch (error) {
    console.error("Error deleting absence record: ", error);
    throw error;
  }
};

// Example of a generic logging function, if needed elsewhere:
// async function guardarRegistroGenerico(data: any, collectionName: string = "registros") {
//   if (!db) {
//     console.error("Firestore is not initialized for generic logging.");
//     return;
//   }
//   try {
//     const docRef = await addDoc(collection(db, collectionName), {
//       timestamp: new Date().toISOString(),
//       ...data
//     });
//     console.log(\`Generic log to \${collectionName} saved with ID: \`, docRef.id);
//   } catch (e) {
//     console.error(\`Error saving generic log to \${collectionName}: \`, e);
//   }
// }

// Example usage of generic logging:
// guardarRegistroGenerico({
//   usuario: "sistema",
//   accion: "App loaded",
//   details: { userAgent: navigator.userAgent }
// }, "appUsos");


export { db }; // Export db if direct access is needed, though encapsulated functions are preferred.

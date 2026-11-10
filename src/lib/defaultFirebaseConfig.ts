import { FirebaseConfig } from './firebase';

/**
 * Konfigurasi Firebase bawaan untuk aplikasi WealthTrack / Expenses Tracker.
 * Otomatis aktif untuk semua perangkat (PC & HP) secara real-time.
 */
export const defaultFirebaseConfig: FirebaseConfig | null = {
  apiKey: "AIzaSyAl4J4Rtczg7CFFE_zdmgsaGWV40BluS88",
  authDomain: "expenses-tracker-davin.firebaseapp.com",
  projectId: "expenses-tracker-davin",
  storageBucket: "expenses-tracker-davin.firebasestorage.app",
  messagingSenderId: "308380875910",
  appId: "1:308380875910:web:26d42f8eabf8db1074a507",
  measurementId: "G-8ZWWGZNRW9",
};

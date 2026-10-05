import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBvAvd3mG96jD2H6duLv61z12lL1Wsc2Gg",
  authDomain: "car-booking-bangphra.firebaseapp.com",
  databaseURL: "https://car-booking-bangphra-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "car-booking-bangphra",
  storageBucket: "car-booking-bangphra.firebasestorage.app",
  messagingSenderId: "568355482649",
  appId: "1:568355482649:web:5cd08c635b4eb51b8f0e88",
  measurementId: "G-6P3HELVYRD"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
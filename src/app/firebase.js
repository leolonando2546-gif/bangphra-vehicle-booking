import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// เติมคำว่า export ไว้ด้านหน้าตรงนี้ครับ
export const firebaseConfig = {
  apiKey: "AIzaSyBvAvd3mG96jD2H6duLv61z12l1Wsc2Gg",
  authDomain: "car-booking-bangphra.firebaseapp.com",
  databaseURL: "https://car-booking-bangphra-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "car-booking-bangphra",
  storageBucket: "car-booking-bangphra.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // เพิ่มบรรทัดนี้

const firebaseConfig = {
  // ก๊อปปี้ค่า apiKey และอื่นๆ ของคุณมาวางตรงนี้
  apiKey: "AIzaSyBvAvd3mG96jD2H6duLv61z12lL1Wsc2Gg", 
  authDomain: "car-booking-bangphra.firebaseapp.com",
  databaseURL: "https://car-booking-bangphra-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "car-booking-bangphra",
  storageBucket: "car-booking-bangphra.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);

// ส่งออกตัวแปรเพื่อให้ไฟล์ page.js เรียกใช้ได้
export const db = getDatabase(app);
export const auth = getAuth(app); // <--- บรรทัดนี้สำคัญที่สุดที่หายไปครับ
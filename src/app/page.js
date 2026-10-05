"use client";
import React, { useState, useEffect } from 'react';
// สำคัญ: ต้อง import firebaseConfig มาด้วย
import { db, auth, firebaseConfig } from './firebase'; 
import { ref, push, onValue, update, remove, set } from "firebase/database";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from 'firebase/app';
import emailjs from '@emailjs/browser';

export default function App() {
  const [user, setUser] = useState(null); 
  const [userRole, setUserRole] = useState(''); 
  const [bookingList, setBookingList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]); 
  const [usersList, setUsersList] = useState([]);
  const [adminTab, setAdminTab] = useState('bookings');
  
  const [isMounted, setIsMounted] = useState(false);

  // State สำหรับหน้า Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // State สำหรับแอดมินสร้าง User ใหม่
  const [newUserAccount, setNewUserAccount] = useState({
    email: '', password: '', name: '', department: '', phone: '', role: 'user'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [showSchedule, setShowSchedule] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentCalendarMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentCalendarMonth(new Date(year, month + 1, 1));

  const [mileageRecord, setMileageRecord] = useState({ 
    bookingId: '', vehicleId: '', startMile: '', endMile: '', fuelCost: '' 
  });

  const [newVehicle, setNewVehicle] = useState({
    plate: '', type: 'รถตู้', status: 'พร้อมใช้งาน', mileage: '', taxDate: '', insuranceDate: ''
  });

  const [formData, setFormData] = useState({
    purpose: '', destination: '', date: '', time: '', vehicleType: 'รถตู้ (12 ที่นั่ง)', assignedDriver: ''
  });

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // ดึงข้อมูลจากตาราง users ทั้งหมดมาเช็กด้วยอีเมล เพื่อความชัวร์ไม่ให้พลาด
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const allUsers = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            // ค้นหาข้อมูลผู้ใช้จากอีเมลที่ตรงกัน
            const foundUser = allUsers.find(u => u.email === currentUser.email);
            if (foundUser) {
              setUserRole(foundUser.role);
            } else {
              // ถ้ายังไม่มีข้อมูลใน db ให้กำหนดสิทธิ์เริ่มต้นเป็น user ไปก่อน หรือบังคับเป็น admin ถ้าเป็นอีเมลหลัก
              setUserRole(currentUser.email === 'leolonando2546@gmail.com' ? 'admin' : 'user');
            }
          }
        });
      } else {
        setUser(null);
        setUserRole('');
      }
    });

    onValue(ref(db, 'bookings'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setBookingList(list.reverse());
      } else { setBookingList([]); }
    });

    onValue(ref(db, 'vehicles'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setVehicleList(list);
      } else { setVehicleList([]); }
    });

    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key] }));
        setUsersList(list);
      } else { setUsersList([]); }
    });

    return () => unsubscribe();
  }, []);

  // --- ฟังก์ชัน Login แบบ Email/Password ---
  // --- ฟังก์ชัน Login แบบ Email/Password (ปรับปรุงให้แสดง Error ชัดเจน) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error("Login Error Code:", error.code);
      console.error("Login Error Message:", error.message);
      
      if (error.code === 'auth/invalid-credential') {
        alert("เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else if (error.code === 'auth/user-not-found') {
        alert("ไม่พบผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบอีเมลอีกครั้ง");
      } else if (error.code === 'auth/wrong-password') {
        alert("รหัสผ่านไม่ถูกต้อง");
      } else {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // --- ฟังก์ชันแอดมินสร้างบัญชีผู้ใช้ใหม่ (ปรับปรุงใหม่ให้บันทึกชัวร์ 100%) ---
  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    if (window.confirm(`ต้องการสร้างบัญชี ${newUserAccount.email} ใช่หรือไม่?`)) {
      try {
        // 1. สร้างบัญชีใน Firebase Auth โดยใช้ Secondary App เพื่อไม่ให้แอดมินหลุด
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          newUserAccount.email, 
          newUserAccount.password
        );
        
        const newUid = userCredential.user.uid;

        // 2. ปิดระบบ Secondary Auth เพื่อเคลียร์แรม
        await secondaryAuth.signOut();

        // 3. บันทึกข้อมูลลงใน Realtime Database ทันทีโดยใช้ UID ที่ได้มา
        await set(ref(db, `users/${newUid}`), {
          uid: newUid,
          email: newUserAccount.email,
          name: newUserAccount.name,
          department: newUserAccount.department || '-',
          phone: newUserAccount.phone || '-',
          role: newUserAccount.role
        });
        
        alert("บันทึกผู้ใช้งานใหม่และสร้างข้อมูลในระบบสำเร็จ!");
        setNewUserAccount({ email: '', password: '', name: '', department: '', phone: '', role: 'user' });
      } catch (error) { 
        alert("เกิดข้อผิดพลาดในการสร้างบัญชี: " + error.message); 
      }
    }
  };

  const handleRoleChange = async (uid, newRole) => {
    if (window.confirm(`ยืนยันการเปลี่ยนสิทธิ์เป็น ${newRole} ใช่หรือไม่?`)) {
      try {
        await update(ref(db, `users/${uid}`), { role: newRole });
        alert("อัปเดตสิทธิ์ผู้ใช้งานสำเร็จ");
      } catch (error) { alert(error.message); }
    }
  };

  const handleRequestCancel = async (id) => {
    if (window.confirm("คุณต้องการส่งคำขอยกเลิกการจองนี้ให้ผู้ดูแลระบบใช่หรือไม่?")) {
      try {
        await update(ref(db, `bookings/${id}`), { status: 'ขอยกเลิก' });
        alert("ส่งคำขอยกเลิกเรียบร้อย กรุณารอแอดมินดำเนินการ");
      } catch (error) { alert(error.message); }
    }
  };

  const handleAdminDelete = async (id) => {
    if (window.confirm("คำเตือน: คุณต้องการลบรายการจองนี้ออกจากระบบอย่างถาวรใช่หรือไม่?")) {
      try {
        await remove(ref(db, `bookings/${id}`));
        alert("ลบรายการจองเรียบร้อยแล้ว");
      } catch (error) { alert(error.message); }
    }
  };

  const handleEditBooking = (item) => {
    setFormData({
      purpose: item.purpose, destination: item.destination, date: item.date, time: item.time, vehicleType: item.vehicleType
    });
    remove(ref(db, `bookings/${item.id}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert("ดึงข้อมูลกลับมาที่ฟอร์มเพื่อแก้ไขแล้ว");
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      const currentUserData = usersList.find(u => u.email === user.email);
      const bookingRef = ref(db, 'bookings');
      const newBooking = { 
        ...formData, 
        requester: currentUserData?.name || user.email, 
        requesterEmail: user.email,
        status: 'รออนุมัติ', 
        timestamp: Date.now(), 
        fuelCost: 0 
      };
      await push(bookingRef, newBooking);
      await emailjs.send('service_6zr2n1u', 'template_9js03jo', { ...newBooking, vehicle: newBooking.vehicleType }, 'NsbdSqmj53jtuT2nj');
      alert('ส่งคำขอจองรถสำเร็จ!');
      setFormData({ purpose: '', destination: '', date: '', time: '', vehicleType: 'รถตู้ (12 ที่นั่ง)', assignedDriver: '' });
    } catch (error) { alert(error.message); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await push(ref(db, 'vehicles'), newVehicle);
      alert('เพิ่มข้อมูลรถเข้าระบบสำเร็จ!');
      setNewVehicle({ plate: '', type: 'รถตู้', status: 'พร้อมใช้งาน', mileage: '', taxDate: '', insuranceDate: '' });
    } catch (error) { alert(error.message); }
  };

  const handleUpdateStatus = async (item, newStatus, driverName, selectedVehiclePlate) => {
    if (newStatus === 'อนุมัติแล้ว') {
      const isConflict = bookingList.some(b => 
        b.id !== item.id && b.date === item.date && b.assignedVehicle === selectedVehiclePlate && b.status === 'อนุมัติแล้ว'
      );
      if (isConflict) {
        const confirmOverride = window.confirm(`ระวัง! รถทะเบียน ${selectedVehiclePlate} มีคิวอนุมัติแล้วในวันที่ ${item.date} คุณต้องการอนุมัติซ้อนคิวหรือไม่?`);
        if (!confirmOverride) return;
      }
    }
    try {
      await update(ref(db, `bookings/${item.id}`), { 
        status: newStatus, assignedDriver: driverName || 'ยังไม่ระบุ', assignedVehicle: selectedVehiclePlate || 'ยังไม่ระบุ'
      });
      alert(`อัปเดตสถานะเรียบร้อย`);
    } catch (error) { alert(error.message); }
  };

  const handleDriverUpdate = async (e) => {
    e.preventDefault();
    if (!mileageRecord.bookingId || !mileageRecord.vehicleId || !mileageRecord.endMile || !mileageRecord.fuelCost) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }
    try {
      await update(ref(db, `vehicles/${mileageRecord.vehicleId}`), { mileage: Number(mileageRecord.endMile), status: 'พร้อมใช้งาน' });
      await update(ref(db, `bookings/${mileageRecord.bookingId}`), {
        fuelCost: Number(mileageRecord.fuelCost), startMile: Number(mileageRecord.startMile), endMile: Number(mileageRecord.endMile), status: 'เสร็จสิ้นงาน'
      });
      alert('บันทึกค่าน้ำมันสำเร็จ!');
      setMileageRecord({ bookingId: '', vehicleId: '', startMile: '', endMile: '', fuelCost: '' });
    } catch (error) { alert(error.message); }
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">กำลังโหลดระบบ...</div>;
  }

  // --- หน้าจอ Login (แบบใหม่) ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: 'url("/logo2.jpg")' }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 z-10 relative border-4 border-blue-700">
          <div className="text-center mb-8">
            <img src="/555.jpg" alt="Logo" className="h-24 mx-auto mb-4 rounded-full" />
            <h1 className="text-3xl font-black text-black">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 font-bold mt-2">ระบบจองรถออนไลน์ เทศบาลเมืองบางพระ</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-black text-gray-700 ml-1">อีเมลผู้ใช้งาน</label>
              <input 
                type="email" 
                required 
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 outline-none text-black font-bold"
                placeholder="email@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-black text-gray-700 ml-1">รหัสผ่าน</label>
              <input 
                type="password" 
                required 
                className="w-full mt-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 outline-none text-black font-bold"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-blue-800 transition transform hover:scale-105 active:scale-95">
              เข้าสู่ระบบ
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6 font-bold">* หากไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ (Admin)</p>
        </div>
      </div>
    );
  }

  const currentUserInfo = usersList.find(u => u.email === user.email);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-medium">
      <nav className="bg-blue-700 text-white p-4 shadow-md flex justify-between items-center font-bold sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white text-blue-700 flex items-center justify-center rounded-full font-black text-xl border-2 border-blue-300">
            {currentUserInfo?.name ? currentUserInfo.name.charAt(0) : 'U'}
          </div>
          <div>
            <span className="font-black text-lg hidden md:block">เทศบาลเมืองบางพระ</span>
            <span className="text-xs opacity-80 uppercase tracking-widest">{userRole} | {currentUserInfo?.name || user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSchedule(!showSchedule)} className="bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition">
            {showSchedule ? '🏠 กลับหน้าหลัก' : '📅 ดูตารางคิวรถ'}
          </button>
          <button onClick={handleLogout} className="underline font-black text-white hover:text-red-200 transition">ออกจากระบบ</button>
        </div>
      </nav>

      {showSchedule ? (
        <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border-4 border-blue-100">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-100 gap-4">
              <h2 className="text-2xl md:text-3xl font-black text-black flex items-center gap-3">📅 ปฏิทินการใช้รถยนต์</h2>
              <div className="flex items-center gap-4 bg-blue-50 p-2 rounded-2xl border border-blue-200">
                <button onClick={prevMonth} className="px-4 py-2 bg-white hover:bg-blue-600 hover:text-white rounded-xl font-black shadow transition">◀ เดือนก่อนหน้า</button>
                <span className="text-lg md:text-xl font-black text-blue-900 min-w-[180px] text-center">{thaiMonths[month]} {year + 543}</span>
                <button onClick={nextMonth} className="px-4 py-2 bg-white hover:bg-blue-600 hover:text-white rounded-xl font-black shadow transition">เดือนถัดไป ▶</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, idx) => (
                <div key={day} className={`p-3 text-center font-black text-sm rounded-xl ${idx === 0 ? 'bg-red-100 text-red-700' : idx === 6 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{day}</div>
              ))}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 opacity-40"></div>
              ))}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const dayBookings = (bookingList || []).filter(b => b && b.date === formattedDate && (b.status === 'อนุมัติแล้ว' || b.status === 'เสร็จสิ้นงาน'));
                const isToday = todayDate === formattedDate;

                return (
                  <div key={dayNumber} className={`min-h-[120px] p-2 rounded-2xl border-2 flex flex-col justify-between transition hover:shadow-md ${isToday ? 'border-blue-600 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-100'}`}>{dayNumber}</span>
                    </div>
                    <div className="space-y-1.5 overflow-y-auto max-h-[90px]">
                      {dayBookings.map(item => (
                        <div key={item.id} className="bg-blue-600 text-white p-1.5 rounded-xl text-[11px] font-bold shadow leading-tight">
                          <p className="truncate">📍 {item.destination}</p>
                          <p className="text-[9px] opacity-90 truncate">⏰ {item.time} น. | {item.assignedVehicle || item.vehicleType}</p>
                          <p className="text-[9px] text-yellow-200 truncate">👤 {item.assignedDriver || 'ยังไม่ระบุ'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row min-h-screen">
          {userRole === 'admin' && (
            <div className="w-full md:w-64 bg-white shadow-lg p-6 space-y-2 border-r border-gray-200 sticky top-16 h-screen overflow-y-auto">
              <h3 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest">เมนูจัดการ</h3>
              <button onClick={() => setAdminTab('bookings')} className={`w-full text-left p-4 rounded-xl font-black transition-all ${adminTab === 'bookings' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-black'}`}>📋 รายการจอง</button>
              <button onClick={() => setAdminTab('fleet')} className={`w-full text-left p-4 rounded-xl font-black transition-all ${adminTab === 'fleet' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-black'}`}>🚗 จัดการรถ (Fleet)</button>
              <button onClick={() => setAdminTab('users')} className={`w-full text-left p-4 rounded-xl font-black transition-all ${adminTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-black'}`}>👥 จัดการผู้ใช้งาน</button>
              <button onClick={() => setAdminTab('reports')} className={`w-full text-left p-4 rounded-xl font-black transition-all ${adminTab === 'reports' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-black'}`}>📊 รายงานสรุปผล</button>
            </div>
          )}

          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            {/* --- หน้า User --- */}
            {userRole === 'user' && (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-blue-600">
                  <h2 className="text-2xl font-black mb-6 text-black border-b pb-4">📝 ส่งคำขอจองรถยนต์</h2>
                  <form onSubmit={handleBooking} className="space-y-4 font-black">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600 ml-1">วัตถุประสงค์การใช้รถ</label>
                      <input type="text" required className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-600 outline-none" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600 ml-1">สถานที่ปลายทาง</label>
                      <input type="text" required className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-600 outline-none" value={formData.destination} onChange={(e)=>setFormData({...formData, destination: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600 ml-1">วันที่เดินทาง</label>
                        <input type="date" required min={todayDate} className="w-full border-2 border-gray-100 p-4 rounded-xl text-black font-black" value={formData.date} onChange={(e)=>setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600 ml-1">เวลาเดินทาง</label>
                        <input type="time" required className="w-full border-2 border-gray-100 p-4 rounded-xl text-black font-black" value={formData.time} onChange={(e)=>setFormData({...formData, time: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600 ml-1">เลือกประเภทรถยนต์</label>
                      <select className="w-full border-2 border-gray-100 p-4 rounded-xl bg-white text-black font-black" value={formData.vehicleType} onChange={(e)=>setFormData({...formData, vehicleType: e.target.value})}>
                        <option>รถตู้ (12 ที่นั่ง)</option><option>รถเก๋ง (4 ที่นั่ง)</option><option>รถกระบะ</option>
                      </select>
                    </div>
                    <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition">✅ ยืนยันการจอง</button>
                  </form>
                </div>
                <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
                  <h3 className="text-2xl font-black mb-6 border-b pb-4 text-black uppercase">🗂️ จัดการการจองของฉัน</h3>
                  <div className="space-y-6">
                    {bookingList.filter(b => b.requesterEmail === user.email).map(item => (
                      <div key={item.id} className={`p-6 rounded-2xl border-2 shadow-sm ${item.status === 'ขอยกเลิก' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-xl text-blue-900">📍 {item.destination}</p>
                            <div className="flex gap-4 mt-2">
                              <span className="text-sm font-black text-gray-600">📅 {item.date}</span>
                              <span className="text-sm font-black text-blue-700">⏰ {item.time} น.</span>
                            </div>
                            <p className="text-xs font-black text-gray-400 mt-1">🚗 {item.vehicleType} | 👤 โดย: {item.assignedDriver || 'รอแอดมินมอบหมาย'}</p>
                          </div>
                          <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-md ${item.status === 'อนุมัติแล้ว' ? 'bg-green-600 text-white' : item.status === 'เสร็จสิ้นงาน' ? 'bg-blue-600 text-white' : item.status === 'ขอยกเลิก' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-black'}`}>{item.status}</span>
                        </div>
                        {item.status === 'รออนุมัติ' && (
                          <div className="flex gap-3 mt-4 border-t pt-4">
                            <button onClick={() => handleEditBooking(item)} className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-xs font-black hover:bg-amber-600 shadow-lg transition">✏️ แก้ไขข้อมูล</button>
                            <button onClick={() => handleRequestCancel(item.id)} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-xs font-black hover:bg-red-700 shadow-lg transition">✋ ขอยกเลิกรายการ</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- หน้า Driver --- */}
            {userRole === 'driver' && (
              <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border-2 border-orange-500 text-black">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-4xl">🚛</span>
                  <h2 className="text-3xl font-black text-orange-600 uppercase tracking-widest">บันทึกงานและค่าน้ำมัน</h2>
                </div>
                <form onSubmit={handleDriverUpdate} className="space-y-6 font-black text-black">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500 ml-1">เลือกรรายการงานที่แอดมินอนุมัติ</label>
                    <select className="w-full border-2 border-gray-200 p-5 rounded-xl bg-white font-black text-black text-lg focus:border-orange-500 outline-none" value={mileageRecord.bookingId} onChange={(e) => setMileageRecord({...mileageRecord, bookingId: e.target.value})}>
                      <option value="">-- เลือกรายการงาน --</option>
                      {bookingList.filter(b => b.status === 'อนุมัติแล้ว').map(b => (
                        <option key={b.id} value={b.id}>📍 {b.destination} | 🚗 {b.vehicleType} | 📅 {b.date}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-500 ml-1">เลือกรถที่ใช้ปฏิบัติงานจริง</label>
                    <select className="w-full border-2 border-gray-200 p-5 rounded-xl bg-white font-black text-black text-lg focus:border-orange-500 outline-none" value={mileageRecord.vehicleId} onChange={(e) => setMileageRecord({...mileageRecord, vehicleId: e.target.value})}>
                      <option value="">-- เลือกรถที่ใช้งาน --</option>
                      {vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate} ({v.type}) - ไมล์ปัจจุบัน: {v.mileage}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400">เลขไมล์เริ่ม</label>
                      <input type="number" placeholder="0" className="w-full border-2 border-gray-200 p-4 rounded-xl font-black text-black" value={mileageRecord.startMile} onChange={(e)=>setMileageRecord({...mileageRecord, startMile: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400">เลขไมล์สิ้นสุด</label>
                      <input type="number" placeholder="0" className="w-full border-2 border-gray-200 p-4 rounded-xl font-black text-black" value={mileageRecord.endMile} onChange={(e)=>setMileageRecord({...mileageRecord, endMile: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-black text-orange-600 ml-1 uppercase">ค่าน้ำมันรวม (บาท)</label>
                    <input type="number" placeholder="0.00" className="w-full border-2 border-orange-300 p-5 rounded-xl font-black text-3xl text-orange-700 bg-orange-50 focus:ring-2 focus:ring-orange-500 outline-none" value={mileageRecord.fuelCost} onChange={(e)=>setMileageRecord({...mileageRecord, fuelCost: e.target.value})} />
                  </div>
                  <button className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-2xl shadow-xl hover:bg-orange-700 transition">✅ บันทึกค่าน้ำมันและจบงาน</button>
                </form>
              </div>
            )}

            {/* --- หน้า Admin --- */}
            {userRole === 'admin' && (
              <div className="max-w-6xl mx-auto space-y-8">
                
                {/* แท็บ: จัดการผู้ใช้งาน (เพิ่มฟอร์มสร้างบัญชีใหม่ตามรูป) */}
                {adminTab === 'users' && (
                  <div className="space-y-8">
                    {/* ฟอร์มเพิ่มผู้ใช้งานใหม่ */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-gray-100">
                      <h2 className="text-2xl font-black mb-6 text-black border-b pb-4">👥 เพิ่มผู้ใช้ใหม่</h2>
                      <form onSubmit={handleCreateNewUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">อีเมล (ใช้เป็นชื่อเข้าระบบ)</label>
                            <input type="email" required className="w-full border-2 p-3 rounded-xl font-bold bg-yellow-50 focus:border-blue-500 outline-none" placeholder="example@email.com" value={newUserAccount.email} onChange={(e)=>setNewUserAccount({...newUserAccount, email: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">รหัสผ่าน (ขั้นต่ำ 6 ตัว)</label>
                            <input type="password" required minLength="6" className="w-full border-2 p-3 rounded-xl font-bold bg-gray-50 focus:border-blue-500 outline-none" placeholder="••••••••" value={newUserAccount.password} onChange={(e)=>setNewUserAccount({...newUserAccount, password: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">ชื่อ-นามสกุล</label>
                            <input type="text" required className="w-full border-2 p-3 rounded-xl font-bold bg-gray-50 focus:border-blue-500 outline-none" placeholder="เช่น นายมาไว ขับเร็ว" value={newUserAccount.name} onChange={(e)=>setNewUserAccount({...newUserAccount, name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">แผนก / ตำแหน่ง</label>
                            <input type="text" className="w-full border-2 p-3 rounded-xl font-bold bg-gray-50 focus:border-blue-500 outline-none" placeholder="เช่น ไอที" value={newUserAccount.department} onChange={(e)=>setNewUserAccount({...newUserAccount, department: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">เบอร์โทรศัพท์</label>
                            <input type="text" className="w-full border-2 p-3 rounded-xl font-bold bg-gray-50 focus:border-blue-500 outline-none" placeholder="081-XXXXXXX" value={newUserAccount.phone} onChange={(e)=>setNewUserAccount({...newUserAccount, phone: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-gray-500">สิทธิ์การใช้งาน</label>
                            <select className="w-full border-2 p-3 rounded-xl font-bold bg-white focus:border-blue-500 outline-none" value={newUserAccount.role} onChange={(e)=>setNewUserAccount({...newUserAccount, role: e.target.value})}>
                              <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                              <option value="driver">พนักงานขับรถ (Driver)</option>
                              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-blue-700 transition">💾 บันทึก</button>
                          <button type="button" onClick={() => setNewUserAccount({ email: '', password: '', name: '', department: '', phone: '', role: 'user' })} className="bg-gray-500 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-gray-600 transition">✖ ยกเลิก</button>
                        </div>
                      </form>
                    </div>

                    {/* ตารางรายชื่อผู้ใช้งาน */}
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-100">
                      <div className="p-8 bg-blue-700 flex justify-between items-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">รายชื่อบัญชีผู้ใช้งานในระบบ</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-blue-50 border-b-2 border-blue-100">
                            <tr className="text-black font-black uppercase text-xs text-center">
                              <th className="p-4">ชื่อ-นามสกุล</th>
                              <th className="p-4">อีเมล (ชื่อผู้ใช้)</th>
                              <th className="p-4">แผนก</th>
                              <th className="p-4">เบอร์โทรศัพท์</th>
                              <th className="p-4">สิทธิ์ปัจจุบัน</th>
                              <th className="p-4">เปลี่ยนสิทธิ์</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-center">
                            {usersList.map((u) => (
                              <tr key={u.uid} className="hover:bg-blue-50 transition">
                                <td className="p-4 font-black text-black">{u.name}</td>
                                <td className="p-4 text-sm text-gray-600">{u.email}</td>
                                <td className="p-4 text-sm text-gray-600">{u.department || '-'}</td>
                                <td className="p-4 text-sm text-gray-600">{u.phone || '-'}</td>
                                <td className="p-4">
                                  <span className={`px-3 py-1 rounded-lg text-xs font-black text-white ${u.role === 'admin' ? 'bg-purple-600' : u.role === 'driver' ? 'bg-orange-600' : 'bg-gray-500'}`}>
                                    {u.role.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <select 
                                    className="border-2 p-2 rounded-xl font-black bg-white text-xs focus:border-blue-700"
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                                  >
                                    <option value="user">User</option>
                                    <option value="driver">Driver</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* แท็บ: รายการจอง */}
                {adminTab === 'bookings' && (
                  <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100">
                    <div className="p-8 bg-blue-700 flex justify-between items-center">
                      <h2 className="text-2xl font-black text-white uppercase tracking-wider">📋 รายการขอใช้รถยนต์ทั้งหมด</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-blue-50 border-b-2 border-blue-100">
                          <tr className="text-black font-black uppercase text-sm">
                            <th className="p-6">ผู้จอง / สถานะ</th>
                            <th className="p-6">สถานที่ไป / วันเวลา</th>
                            <th className="p-6">เลือกรถ</th>
                            <th className="p-6">เลือกคนขับ</th>
                            <th className="p-6 text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bookingList.map((item) => (
                            <tr key={item.id} className={`hover:bg-blue-50 transition-colors ${item.status === 'ขอยกเลิก' ? 'bg-red-50' : ''}`}>
                              <td className="p-6">
                                <p className="font-black text-black text-lg leading-none">{item.requester}</p>
                                <span className={`text-xs mt-2 px-2 py-1 inline-block rounded font-black ${item.status === 'ขอยกเลิก' ? 'bg-red-600 text-white' : 'bg-gray-200 text-black'}`}>{item.status}</span>
                              </td>
                              <td className="p-6">
                                <p className="font-black text-black">📍 {item.destination}</p>
                                <span className="text-xs font-black text-blue-700">📅 {item.date} | ⏰ {item.time}</span>
                              </td>
                              <td className="p-6">
                                <select id={`vehicle-${item.id}`} className="border-2 border-gray-200 p-2 text-xs rounded-xl font-black w-32">
                                  <option value="">-- เลือกรถ --</option>
                                  {vehicleList.filter(v => v.type.includes(item.vehicleType.split(' ')[0])).map(v => (
                                    <option key={v.id} value={v.plate}>{v.plate}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-6">
                                <select id={`driver-${item.id}`} className="border-2 border-gray-200 p-2 text-xs rounded-xl font-black w-32">
                                  <option value="">-- เลือกคนขับ --</option>
                                  {usersList.filter(u => u.role === 'driver').map(u => (
                                    <option key={u.uid} value={u.name}>{u.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-6">
                                <div className="flex flex-col gap-2 items-center">
                                  {item.status !== 'เสร็จสิ้นงาน' && (
                                    <button onClick={() => handleUpdateStatus(item, 'อนุมัติแล้ว', document.getElementById(`driver-${item.id}`).value, document.getElementById(`vehicle-${item.id}`).value)} className="w-full bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-green-700 transition">✅ อนุมัติ</button>
                                  )}
                                  <button onClick={() => handleAdminDelete(item.id)} className="w-full bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-red-700 transition">🗑️ ลบถาวร</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* แท็บ: จัดการรถ */}
                {adminTab === 'fleet' && (
                   <div className="space-y-8">
                   <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-gray-100">
                     <h2 className="text-2xl font-black mb-6 text-black border-b pb-4">🚗 เพิ่มยานพาหนะใหม่เข้า Fleet</h2>
                     <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-4 gap-4 font-black">
                       <input type="text" placeholder="เลขทะเบียนรถ" required className="border-2 p-4 rounded-xl focus:border-blue-700 outline-none" value={newVehicle.plate} onChange={(e)=>setNewVehicle({...newVehicle, plate: e.target.value})} />
                       <select className="border-2 p-4 rounded-xl bg-white" value={newVehicle.type} onChange={(e)=>setNewVehicle({...newVehicle, type: e.target.value})}>
                         <option>รถตู้</option><option>รถเก๋ง</option><option>รถกระบะ</option>
                       </select>
                       <input type="number" placeholder="ไมล์สะสมเริ่มต้น" className="border-2 p-4 rounded-xl" value={newVehicle.mileage} onChange={(e)=>setNewVehicle({...newVehicle, mileage: e.target.value})} />
                       <button type="submit" className="bg-blue-700 text-white p-4 rounded-xl font-black shadow-xl hover:bg-blue-800 transition uppercase">บันทึกรถ</button>
                     </form>
                   </div>
                   <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-100">
                     <table className="w-full text-left font-black text-black">
                       <thead className="bg-gray-800 text-white">
                         <tr><th className="p-6">ทะเบียน</th><th className="p-6">ประเภท</th><th className="p-6">สถานะ</th><th className="p-6 text-right">ไมล์ล่าสุด (กม.)</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {vehicleList.map(v => (
                           <tr key={v.id} className="border-b font-black hover:bg-gray-50 transition-colors"><td className="p-6">{v.plate}</td><td className="p-6">{v.type}</td><td className="p-6 text-green-600">{v.status}</td><td className="p-6 text-right text-blue-700 text-xl font-black">{Number(v.mileage).toLocaleString()}</td></tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
                )}

                {/* แท็บ: รายงานสรุป */}
                {adminTab === 'reports' && (
                  <div className="space-y-8 animate-fadeIn font-black">
                  <h2 className="text-3xl font-black border-l-8 border-blue-700 pl-4 text-black uppercase tracking-widest">📊 สถิติและรายงานสรุปภาพรวม</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-blue-600 p-12 rounded-[40px] shadow-2xl text-white text-center flex flex-col items-center">
                      <p className="text-sm font-black opacity-80 uppercase tracking-widest">รายการจองสะสม</p>
                      <p className="text-7xl font-black mt-4">{bookingList.length}</p>
                      <span className="text-xs mt-2 bg-white/20 px-3 py-1 rounded-full uppercase">รายการ</span>
                    </div>
                    <div className="bg-green-600 p-12 rounded-[40px] shadow-2xl text-white text-center flex flex-col items-center border-4 border-white">
                      <p className="text-sm font-black opacity-80 uppercase tracking-widest">งบน้ำมันที่ใช้ (บาท)</p>
                      <p className="text-6xl font-black mt-4 tracking-tighter">
                        {bookingList.reduce((sum, b) => sum + (Number(b.fuelCost) || 0), 0).toLocaleString()}
                      </p>
                      <span className="text-xs mt-2 bg-white/20 px-3 py-1 rounded-full uppercase">สรุปยอดเงินจริง</span>
                    </div>
                    <div className="bg-gray-800 p-12 rounded-[40px] shadow-2xl text-white text-center flex flex-col items-center">
                      <p className="text-sm font-black opacity-80 uppercase tracking-widest">รถยนต์ทั้งหมด</p>
                      <p className="text-7xl font-black mt-4">{vehicleList.length}</p>
                      <span className="text-xs mt-2 bg-white/20 px-3 py-1 rounded-full uppercase">คัน</span>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-gray-100 text-black">
                    <h3 className="font-black text-2xl mb-8 border-b pb-6 uppercase tracking-wider flex items-center gap-3">
                      <span>🚗</span> สถิติการใช้งานแยกตามประเภทรถยนต์
                    </h3>
                    <div className="space-y-8">
                      {['รถตู้ (12 ที่นั่ง)', 'รถเก๋ง (4 ที่นั่ง)', 'รถกระบะ'].map(type => {
                        const count = bookingList.filter(b => b.vehicleType === type).length;
                        const percent = bookingList.length > 0 ? (count / bookingList.length) * 100 : 0;
                        return (
                          <div key={type} className="space-y-3">
                            <div className="flex justify-between font-black text-lg">
                              <span>{type}</span>
                              <span className="text-blue-700">{count} ครั้ง ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-6 shadow-inner p-1">
                              <div className="bg-blue-600 h-4 rounded-full transition-all duration-1000 shadow-lg" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => window.print()} className="mt-12 w-full bg-black text-white py-6 rounded-3xl font-black shadow-2xl hover:bg-blue-900 transition-all text-xl uppercase tracking-widest border-b-8 border-gray-700 active:border-b-0">
                      🖨️ พิมพ์รายงานสรุปโครงการ (PDF/PRINT)
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
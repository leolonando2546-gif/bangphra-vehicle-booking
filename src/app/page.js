"use client";
import React, { useState, useEffect } from 'react';
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

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
    plate: '', type: 'รถตู้ (12 ที่นั่ง)', status: 'พร้อมใช้งาน', mileage: '', taxDate: '', insuranceDate: ''
  });

  const [formData, setFormData] = useState({
    purpose: '', destination: '', date: '', time: '', vehicleType: 'รถตู้ (12 ที่นั่ง)', assignedDriver: ''
  });

  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        if (currentUser.email === 'leolonando2546@gmail.com') {
          setUserRole('admin');
        }

        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const allUsers = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            const foundUser = allUsers.find(u => u.email === currentUser.email);
            if (foundUser) {
              setUserRole(foundUser.role);
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
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setUsersList(list);
      } else { setUsersList([]); }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      alert("เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    if (window.confirm(`ต้องการสร้างบัญชี ${newUserAccount.email} ใช่หรือไม่?`)) {
      try {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          newUserAccount.email, 
          newUserAccount.password
        );
        
        const newUid = userCredential.user.uid;
        await secondaryAuth.signOut();

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

  const handleVehicleStatusChange = async (vehicleId, newStatus) => {
    try {
      await update(ref(db, `vehicles/${vehicleId}`), { status: newStatus });
      alert("อัปเดตสถานะรถสำเร็จ");
    } catch (error) { alert(error.message); }
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

  const handleDeleteVehicle = async (id, plate) => {
    if (window.confirm(`ต้องการลบรถทะเบียน ${plate} ออกจากระบบถาวรใช่หรือไม่?`)) {
      try {
        await remove(ref(db, `vehicles/${id}`));
        alert("ลบข้อมูลรถสำเร็จ");
      } catch (error) { alert(error.message); }
    }
  };

  const handleEditBooking = (item) => {
    setFormData({
      purpose: item.purpose || '', destination: item.destination || '', date: item.date || '', time: item.time || '', vehicleType: item.vehicleType || 'รถตู้ (12 ที่นั่ง)'
    });
    remove(ref(db, `bookings/${item.id}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert("ดึงข้อมูลกลับมาที่ฟอร์มเพื่อแก้ไขแล้ว กรุณากดยืนยันส่งคำใหม่อีกครั้ง");
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
        fuelCost: 0,
        rejectReason: ''
      };
      await push(bookingRef, newBooking);
      await emailjs.send('service_6zr2n1u', 'template_9js03jo', { ...newBooking, vehicle: newBooking.vehicleType }, 'NsbdSqmj53jtuT2nj');
      alert('ส่งคำขอจองรถสำเร็จ!');
      setFormData({ purpose: '', destination: '', date: '', time: '', vehicleType: 'รถตู้ (12 ที่นั่ง)', assignedDriver: '' });
    } catch (error) { alert(error.message); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.mileage) {
      return alert("กรุณากรอกข้อมูลเลขทะเบียนและเลขไมล์เริ่มต้นให้ครบถ้วน");
    }
    try {
      await push(ref(db, 'vehicles'), {
        ...newVehicle,
        mileage: Number(newVehicle.mileage)
      });
      alert('เพิ่มข้อมูลรถเข้าระบบสำเร็จ!');
      setNewVehicle({ plate: '', type: 'รถตู้ (12 ที่นั่ง)', status: 'พร้อมใช้งาน', mileage: '', taxDate: '', insuranceDate: '' });
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
        status: newStatus, assignedDriver: driverName || 'ยังไม่ระบุ', assignedVehicle: selectedVehiclePlate || 'ยังไม่ระบุ', rejectReason: ''
      });
      alert(`อัปเดตสถานะเรียบร้อย`);
    } catch (error) { alert(error.message); }
  };

  const handleRejectBooking = async (item) => {
    const reason = prompt("กรุณาระบุเหตุผลที่ไม่อนุมัติการจองนี้:", "รถไม่ว่าง / ติดภารกิจอื่น");
    if (reason !== null) {
      try {
        await update(ref(db, `bookings/${item.id}`), { 
          status: 'ไม่อนุมัติ', rejectReason: reason || 'ไม่ระบุเหตุผล' 
        });
        alert("บันทึกการปฏิเสธคำขอเรียบร้อย");
      } catch (error) { alert(error.message); }
    }
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500 text-lg">กำลังโหลดระบบ...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: 'url("/logo2.jpg")' }}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 z-10 relative border border-slate-100">
          <div className="text-center mb-8">
            <img src="/555.jpg" alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-black text-slate-800">เข้าสู่ระบบ</h1>
            <p className="text-xs font-bold text-slate-500 mt-1">ระบบบริหารจัดการยานพาหนะ</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">อีเมลองค์กร</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none text-slate-800 font-bold text-sm transition"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">รหัสผ่าน</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none text-slate-800 font-bold text-sm transition"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition">
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentUserInfo = usersList.find(u => u.email === user.email);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans">
      <nav className="bg-slate-900 text-white px-6 py-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600 text-white flex items-center justify-center rounded-xl font-black text-lg shadow-inner">
            {currentUserInfo?.name ? currentUserInfo.name.charAt(0) : 'U'}
          </div>
          <div>
            <span className="font-black text-base text-slate-100 block">เทศบาลเมืองบางพระ</span>
            <span className="text-xs text-slate-400 font-bold uppercase">
              {userRole === 'admin' ? 'ผู้ดูแลระบบ (ADMIN)' : userRole === 'driver' ? 'พนักงานขับรถ (DRIVER)' : 'ผู้ใช้งานทั่วไป (USER)'} • {currentUserInfo?.name || user.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSchedule(!showSchedule)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-black transition border border-slate-700">
            {showSchedule ? '🏠 หน้าหลัก' : '📅 ปฏิทินตารางรถ'}
          </button>
          <button onClick={handleLogout} className="text-rose-400 hover:text-rose-300 text-xs font-black transition px-2 py-1">
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {showSchedule ? (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-100 gap-4">
              <h2 className="text-xl font-black text-slate-800">ตารางการใช้ยานพาหนะส่วนกลาง</h2>
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <button onClick={prevMonth} className="px-3 py-1.5 bg-white hover:bg-slate-100 rounded-lg text-xs font-black shadow-sm text-slate-700 transition">◀ ก่อนหน้า</button>
                <span className="text-sm font-black text-slate-800 min-w-[140px] text-center">{thaiMonths[month]} {year + 543}</span>
                <button onClick={nextMonth} className="px-3 py-1.5 bg-white hover:bg-slate-100 rounded-lg text-xs font-black shadow-sm text-slate-700 transition">ถัดไป ▶</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day, idx) => (
                <div key={day} className={`py-2 text-center font-black text-xs rounded-lg ${idx === 0 ? 'text-rose-700 bg-rose-50' : idx === 6 ? 'text-purple-700 bg-purple-50' : 'text-slate-700 bg-slate-50'}`}>{day}</div>
              ))}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/40 rounded-xl border border-dashed border-slate-200"></div>
              ))}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const dayBookings = (bookingList || []).filter(b => b && b.date === formattedDate && (b.status === 'อนุมัติแล้ว' || b.status === 'เสร็จสิ้นงาน'));
                const isToday = todayDate === formattedDate;

                return (
                  <div key={dayNumber} className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition ${isToday ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-white'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-800 bg-slate-100'}`}>{dayNumber}</span>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[85px]">
                      {dayBookings.map(item => (
                        <div key={item.id} className="bg-slate-900 text-white p-1.5 rounded-lg text-[10px] shadow-sm leading-tight font-bold">
                          <p className="truncate">📍 {item.destination}</p>
                          <p className="text-[9px] text-slate-300 truncate mt-0.5">⏰ {item.time} | {item.assignedVehicle || item.vehicleType}</p>
                          <p className="text-[9px] text-amber-300 truncate">👤 {item.assignedDriver || 'รอระบุคนขับ'}</p>
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
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-73px)]">
          {userRole === 'admin' && (
            <div className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-2 shrink-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-2">เมนูการจัดการ</p>
              <button onClick={() => setAdminTab('bookings')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition flex items-center gap-3 ${adminTab === 'bookings' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>📋</span> รายการคำขอจองรถ
              </button>
              <button onClick={() => setAdminTab('fleet')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition flex items-center gap-3 ${adminTab === 'fleet' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>🚗</span> บริหารยานพาหนะ (Fleet)
              </button>
              <button onClick={() => setAdminTab('users')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition flex items-center gap-3 ${adminTab === 'users' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>👥</span> จัดการบัญชีผู้ใช้งาน
              </button>
              <button onClick={() => setAdminTab('reports')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition flex items-center gap-3 ${adminTab === 'reports' ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>📊</span> รายงานสถิติภาพรวม
              </button>
            </div>
          )}

          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {userRole === 'user' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h2 className="text-lg font-black text-slate-800 mb-1">ฟอร์มส่งคำขอจองรถยนต์ส่วนกลาง</h2>
                  <p className="text-xs font-bold text-slate-500 mb-6">กรอกรายละเอียดภารกิจเพื่อเสนอผู้ดูแลระบบอนุมัติการใช้รถ</p>
                  <form onSubmit={handleBooking} className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">วัตถุประสงค์ / ภารกิจ</label>
                      <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">สถานที่ปลายทาง</label>
                      <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={formData.destination} onChange={(e)=>setFormData({...formData, destination: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1">วันที่เดินทาง</label>
                        <input type="date" required min={todayDate} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={formData.date} onChange={(e)=>setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1">เวลาเดินทาง</label>
                        <input type="time" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={formData.time} onChange={(e)=>setFormData({...formData, time: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">ประเภทรถยนต์ที่ต้องการ</label>
                      <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={formData.vehicleType} onChange={(e)=>setFormData({...formData, vehicleType: e.target.value})}>
                        <option>รถตู้ (12 ที่นั่ง)</option>
                        <option>รถเก๋ง (4 ที่นั่ง)</option>
                        <option>รถกระบะ</option>
                      </select>
                    </div>
                    <button className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">
                      ยืนยันการส่งคำขอจองรถ
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-4">สถานะการจองรถของคุณ</h3>
                  <div className="space-y-3">
                    {bookingList.filter(b => b.requesterEmail === user.email).map(item => (
                      <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                          <p className="font-black text-sm text-slate-900">📍 {item.destination}</p>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">📅 {item.date} | ⏰ {item.time} น. ({item.vehicleType})</p>
                          <p className="text-xs font-black text-indigo-700 mt-1">พนักงานขับรถ: {item.assignedDriver || 'รอผู้ดูแลระบบมอบหมาย'}</p>
                          {item.status === 'ไม่อนุมัติ' && (
                            <p className="text-xs font-black text-rose-600 mt-1 bg-rose-50 px-2 py-1 rounded">⚠️ เหตุผลที่ไม่อนุมัติ: {item.rejectReason}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${item.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-900' : item.status === 'เสร็จสิ้นงาน' ? 'bg-blue-100 text-blue-900' : item.status === 'ไม่อนุมัติ' ? 'bg-rose-100 text-rose-900' : item.status === 'ขอยกเลิก' ? 'bg-amber-100 text-amber-900' : 'bg-amber-100 text-amber-900'}`}>
                            {item.status}
                          </span>
                          {(item.status === 'รออนุมัติ' || item.status === 'ไม่อนุมัติ') && (
                            <div className="flex gap-2">
                              <button onClick={() => handleEditBooking(item)} className="text-xs text-indigo-600 hover:underline font-black">✏️ แก้ไข</button>
                              {item.status === 'รออนุมัติ' && (
                                <button onClick={() => handleRequestCancel(item.id)} className="text-xs text-rose-600 hover:underline font-black">ขอยกเลิก</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {userRole === 'driver' && (
              <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">🚛</div>
                  <div>
                    <h2 className="text-base font-black text-slate-800">บันทึกข้อมูลการปฏิบัติงาน</h2>
                    <p className="text-xs font-bold text-slate-500">บันทึกเลขไมล์และค่าน้ำมันหลังเสร็จสิ้นภารกิจ</p>
                  </div>
                </div>
                <form onSubmit={handleDriverUpdate} className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">เลือกรายการงานที่ได้รับมอบหมาย</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={mileageRecord.bookingId} onChange={(e) => setMileageRecord({...mileageRecord, bookingId: e.target.value})}>
                      <option value="">-- เลือกรายการงาน --</option>
                      {bookingList.filter(b => b.status === 'อนุมัติแล้ว').map(b => (
                        <option key={b.id} value={b.id}>📍 {b.destination} ({b.date})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">เลือกรถที่ใช้ปฏิบัติงานจริง</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={mileageRecord.vehicleId} onChange={(e) => setMileageRecord({...mileageRecord, vehicleId: e.target.value})}>
                      <option value="">-- เลือกรถ --</option>
                      {vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate} (ไมล์ล่าสุด: {v.mileage})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">เลขไมล์เริ่มต้น</label>
                      <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={mileageRecord.startMile} onChange={(e)=>setMileageRecord({...mileageRecord, startMile: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">เลขไมล์สิ้นสุด</label>
                      <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={mileageRecord.endMile} onChange={(e)=>setMileageRecord({...mileageRecord, endMile: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">ค่าน้ำมันรวม (บาท)</label>
                    <input type="number" className="w-full px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-black text-amber-900 focus:bg-white outline-none transition" value={mileageRecord.fuelCost} onChange={(e)=>setMileageRecord({...mileageRecord, fuelCost: e.target.value})} />
                  </div>
                  <button className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-slate-800 transition">
                    บันทึกข้อมูลและปิดงาน
                  </button>
                </form>
              </div>
            )}

            {userRole === 'admin' && (
              <div className="max-w-6xl mx-auto space-y-6">
                {adminTab === 'users' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                      <h2 className="text-base font-black text-slate-800 mb-1">เพิ่มบัญชีผู้ใช้งานใหม่ในระบบ</h2>
                      <p className="text-xs font-bold text-slate-500 mb-6">สร้างบัญชีสำหรับบุคลากรภายในองค์กรและกำหนดสิทธิ์การใช้งาน</p>
                      <form onSubmit={handleCreateNewUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">อีเมลผู้ใช้งาน</label>
                            <input type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.email} onChange={(e)=>setNewUserAccount({...newUserAccount, email: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัว)</label>
                            <input type="password" required minLength="6" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.password} onChange={(e)=>setNewUserAccount({...newUserAccount, password: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">ชื่อ - นามสกุล</label>
                            <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.name} onChange={(e)=>setNewUserAccount({...newUserAccount, name: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">แผนก / กอง</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.department} onChange={(e)=>setNewUserAccount({...newUserAccount, department: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">เบอร์โทรศัพท์ภายใน/มือถือ</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.phone} onChange={(e)=>setNewUserAccount({...newUserAccount, phone: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">กำหนดสิทธิ์ระบบ</label>
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newUserAccount.role} onChange={(e)=>setNewUserAccount({...newUserAccount, role: e.target.value})}>
                              <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                              <option value="driver">พนักงานขับรถ (Driver)</option>
                              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">
                          บันทึกผู้ใช้งานใหม่
                        </button>
                      </form>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายชื่อบัญชีผู้ใช้งานทั้งหมดในระบบ</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-600 font-black text-xs uppercase border-b border-slate-100">
                              <th className="px-6 py-3">ชื่อ - นามสกุล</th>
                              <th className="px-6 py-3">อีเมล</th>
                              <th className="px-6 py-3">แผนก</th>
                              <th className="px-6 py-3">เบอร์โทร</th>
                              <th className="px-6 py-3 text-center">สิทธิ์</th>
                              <th className="px-6 py-3 text-center">จัดการสิทธิ์</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-black">
                            {usersList.map((u) => (
                              <tr key={u.id || u.uid} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 text-slate-900">{u.name}</td>
                                <td className="px-6 py-4 text-slate-700">{u.email}</td>
                                <td className="px-6 py-4 text-slate-700">{u.department || '-'}</td>
                                <td className="px-6 py-4 text-slate-700">{u.phone || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${u.role === 'admin' ? 'bg-purple-100 text-purple-900' : u.role === 'driver' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-900'}`}>
                                    {u.role.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none" value={u.role} onChange={(e) => handleRoleChange(u.id || u.uid, e.target.value)}>
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

                {adminTab === 'bookings' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายการคำขอใช้รถยนต์ทั้งหมด</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-600 font-black text-xs uppercase border-b border-slate-100">
                            <th className="px-6 py-3">ผู้จอง / สถานะ</th>
                            <th className="px-6 py-3">รายละเอียดการเดินทาง</th>
                            <th className="px-6 py-3">มอบหมายรถ</th>
                            <th className="px-6 py-3">มอบหมายคนขับ</th>
                            <th className="px-6 py-3 text-center">ดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-black">
                          {bookingList.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4">
                                <p className="text-slate-900 text-sm">{item.requester}</p>
                                <span className={`inline-block mt-1 px-2.5 py-1 rounded text-xs font-black ${item.status === 'อนุมัติแล้ว' ? 'bg-emerald-100 text-emerald-900' : item.status === 'ไม่อนุมัติ' ? 'bg-rose-100 text-rose-900' : item.status === 'ขอยกเลิก' ? 'bg-amber-100 text-amber-900' : 'bg-amber-100 text-amber-900'}`}>
                                  {item.status}
                                </span>
                                {item.rejectReason && (
                                  <p className="text-[10px] text-rose-600 mt-1">เหตุผล: {item.rejectReason}</p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-slate-900">📍 {item.destination}</p>
                                <p className="text-xs text-slate-600 mt-0.5">📅 {item.date} | ⏰ {item.time} น.</p>
                                <span className="inline-block mt-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded text-xs font-black">🚗 รถที่ขอ: {item.vehicleType || 'รถตู้ (12 ที่นั่ง)'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <select id={`vehicle-${item.id}`} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none w-40">
                                  <option value="">-- เลือกรถ --</option>
                                  {vehicleList.map(v => <option key={v.id} value={v.plate}>{v.plate} ({v.type})</option>)}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select id={`driver-${item.id}`} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none w-40">
                                  <option value="">-- เลือกคนขับ --</option>
                                  {usersList.filter(u => u.role === 'driver').map(u => <option key={u.id || u.uid} value={u.name}>{u.name}</option>)}
                                </select>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {item.status !== 'อนุมัติแล้ว' && item.status !== 'เสร็จสิ้นงาน' && (
                                    <button onClick={() => handleUpdateStatus(item, 'อนุมัติแล้ว', document.getElementById(`driver-${item.id}`).value, document.getElementById(`vehicle-${item.id}`).value)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black shadow-sm hover:bg-emerald-700 transition">
                                      อนุมัติ
                                    </button>
                                  )}
                                  {item.status !== 'ไม่อนุมัติ' && item.status !== 'เสร็จสิ้นงาน' && (
                                    <button onClick={() => handleRejectBooking(item)} className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-[11px] font-black shadow-sm hover:bg-amber-600 transition">
                                      ปฏิเสธ
                                    </button>
                                  )}
                                  <button onClick={() => handleAdminDelete(item.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[11px] font-black transition">
                                    ลบ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'fleet' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                      <h2 className="text-base font-black text-slate-800 mb-1">เพิ่มยานพาหนะเข้าสู่กองยาน (Fleet)</h2>
                      <p className="text-xs font-bold text-slate-500 mb-6">ลงทะเบียนรถยนต์ส่วนกลางใหม่พร้อมเลขไมล์เริ่มต้นและสถานะ</p>
                      <form onSubmit={handleAddVehicle} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">เลขทะเบียนรถ</label>
                            <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newVehicle.plate} onChange={(e)=>setNewVehicle({...newVehicle, plate: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">ประเภทรถยนต์</label>
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newVehicle.type} onChange={(e)=>setNewVehicle({...newVehicle, type: e.target.value})}>
                              <option>รถตู้ (12 ที่นั่ง)</option>
                              <option>รถเก๋ง (4 ที่นั่ง)</option>
                              <option>รถกระบะ</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">สถานะรถ</label>
                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newVehicle.status} onChange={(e)=>setNewVehicle({...newVehicle, status: e.target.value})}>
                              <option value="พร้อมใช้งาน">พร้อมใช้งาน</option>
                              <option value="ไม่พร้อมใช้งาน">ไม่พร้อมใช้งาน (ซ่อมบำรุง)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">เลขไมล์เริ่มต้น (กม.)</label>
                            <input type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition" value={newVehicle.mileage} onChange={(e)=>setNewVehicle({...newVehicle, mileage: e.target.value})} />
                          </div>
                        </div>
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">
                          บันทึกข้อมูลรถใหม่
                        </button>
                      </form>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">รายการยานพาหนะทั้งหมดในสังกัด</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-600 font-black text-xs uppercase border-b border-slate-100">
                              <th className="px-6 py-3">เลขทะเบียนรถ</th>
                              <th className="px-6 py-3">ประเภท</th>
                              <th className="px-6 py-3 text-center">สถานะ</th>
                              <th className="px-6 py-3 text-right">ไมล์สะสมล่าสุด</th>
                              <th className="px-6 py-3 text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-black">
                            {vehicleList.map(v => (
                              <tr key={v.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 text-slate-900 text-sm">{v.plate}</td>
                                <td className="px-6 py-4 text-slate-700">{v.type}</td>
                                <td className="px-6 py-4 text-center">
                                  <select className={`px-3 py-1.5 rounded-lg text-xs font-black outline-none border ${v.status === 'พร้อมใช้งาน' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} value={v.status || 'พร้อมใช้งาน'} onChange={(e) => handleVehicleStatusChange(v.id, e.target.value)}>
                                    <option value="พร้อมใช้งาน">🟢 พร้อมใช้งาน</option>
                                    <option value="ไม่พร้อมใช้งาน">🔴 ไม่พร้อมใช้งาน</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-right text-indigo-700">{Number(v.mileage || 0).toLocaleString()} กม.</td>
                                <td className="px-6 py-4 text-center">
                                  <button onClick={() => handleDeleteVehicle(v.id, v.plate)} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-black transition">ลบ</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'reports' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">คำขอจองรถทั้งหมด</p>
                        <p className="text-4xl font-black text-slate-900 mt-4">{bookingList.length} <span className="text-sm font-black text-slate-400">รายการ</span></p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">งบประมาณค่าน้ำมันสะสม</p>
                        <p className="text-4xl font-black text-emerald-700 mt-4">{bookingList.reduce((sum, b) => sum + (Number(b.fuelCost) || 0), 0).toLocaleString()} <span className="text-sm font-black text-slate-400">บาท</span></p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">ยานพาหนะในสังกัด</p>
                        <p className="text-4xl font-black text-indigo-700 mt-4">{vehicleList.length} <span className="text-sm font-black text-slate-400">คัน</span></p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">สถิติการใช้งานแยกตามประเภทรถยนต์</h3>
                      <div className="space-y-5">
                        {['รถตู้ (12 ที่นั่ง)', 'รถเก๋ง (4 ที่นั่ง)', 'รถกระบะ'].map(type => {
                          const count = bookingList.filter(b => b.vehicleType === type).length;
                          const percent = bookingList.length > 0 ? (count / bookingList.length) * 100 : 0;
                          return (
                            <div key={type} className="space-y-2">
                              <div className="flex justify-between text-xs font-black text-slate-800">
                                <span>{type}</span>
                                <span className="text-indigo-700">{count} ครั้ง ({percent.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full transition-all duration-700" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
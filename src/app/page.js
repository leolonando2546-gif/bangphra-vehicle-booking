"use client";
import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase'; 
import { ref, push, onValue, update, remove, set } from "firebase/database";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import emailjs from '@emailjs/browser';

export default function App() {
  const [user, setUser] = useState(null); 
  const [userRole, setUserRole] = useState(''); 
  const [bookingList, setBookingList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]); 
  const [usersList, setUsersList] = useState([]); // เก็บรายชื่อผู้ใช้ทั้งหมด
  const [adminTab, setAdminTab] = useState('bookings');
  
  const [showSchedule, setShowSchedule] = useState(false); // State สำหรับสลับไปหน้าตารางคิวรถ

  const [mileageRecord, setMileageRecord] = useState({ 
    bookingId: '', vehicleId: '', startMile: '', endMile: '', fuelCost: '' 
  });

  const [newVehicle, setNewVehicle] = useState({
    plate: '', type: 'รถตู้', status: 'พร้อมใช้งาน', mileage: '', taxDate: '', insuranceDate: ''
  });

  const [formData, setFormData] = useState({
    purpose: '', destination: '', date: '', time: '', vehicleType: 'รถตู้ (12 ที่นั่ง)', assignedDriver: ''
  });

  // หาวันที่ปัจจุบันเพื่อป้องกันการจองย้อนหลัง
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // 1. ตรวจสอบสถานะการล็อกอิน และดึง Role จาก Database
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // ดึงข้อมูลผู้ใช้จาก Firebase
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserRole(snapshot.val().role);
          } else {
            // ถ้าเป็นผู้ใช้ใหม่ ให้เซ็ตค่าเริ่มต้นเป็น 'user' (หรือ admin ถ้าเป็นอีเมลหลัก)
            const defaultRole = currentUser.email === 'leolonando2546@gmail.com' ? 'admin' : 'user';
            set(userRef, {
              email: currentUser.email,
              name: currentUser.displayName,
              role: defaultRole,
              uid: currentUser.uid
            });
            setUserRole(defaultRole);
          }
        });
      } else {
        setUser(null);
        setUserRole('');
      }
    });

    // 2. ดึงข้อมูลการจอง
    onValue(ref(db, 'bookings'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setBookingList(list.reverse());
      } else { setBookingList([]); }
    });

    // 3. ดึงข้อมูลรถ
    onValue(ref(db, 'vehicles'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setVehicleList(list);
      } else { setVehicleList([]); }
    });

    // 4. ดึงข้อมูลผู้ใช้งานทั้งหมด (สำหรับ Admin)
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key] }));
        setUsersList(list);
      } else { setUsersList([]); }
    });

    return () => unsubscribe();
  }, []);

  // --- ฟังก์ชัน Login/Logout ---
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleLogout = () => signOut(auth);

  // --- ฟังก์ชันการจัดการผู้ใช้งาน (Admin) ---
  const handleRoleChange = async (uid, newRole) => {
    if (window.confirm(`ยืนยันการเปลี่ยนสิทธิ์เป็น ${newRole} ใช่หรือไม่?`)) {
      try {
        await update(ref(db, `users/${uid}`), { role: newRole });
        alert("อัปเดตสิทธิ์ผู้ใช้งานสำเร็จ");
      } catch (error) { alert(error.message); }
    }
  };

  // --- ฟังก์ชันการยกเลิกการจอง ---
  // User ขอยกเลิก (แค่เปลี่ยนสถานะ แอดมินต้องเป็นคนลบ)
  const handleRequestCancel = async (id) => {
    if (window.confirm("คุณต้องการส่งคำขอยกเลิกการจองนี้ให้ผู้ดูแลระบบใช่หรือไม่?")) {
      try {
        await update(ref(db, `bookings/${id}`), { status: 'ขอยกเลิก' });
        alert("ส่งคำขอยกเลิกเรียบร้อย กรุณารอแอดมินดำเนินการ");
      } catch (error) { alert(error.message); }
    }
  };

  // Admin ลบจริง
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
      purpose: item.purpose,
      destination: item.destination,
      date: item.date,
      time: item.time,
      vehicleType: item.vehicleType
    });
    remove(ref(db, `bookings/${item.id}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert("ดึงข้อมูลกลับมาที่ฟอร์มเพื่อแก้ไขแล้ว");
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      const bookingRef = ref(db, 'bookings');
      const newBooking = { 
        ...formData, 
        requester: user.displayName, 
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

  // เช็คคิวชน และ อัปเดตสถานะ
  const handleUpdateStatus = async (item, newStatus, driverName, selectedVehiclePlate) => {
    // ป้องกันรถชนคิว
    if (newStatus === 'อนุมัติแล้ว') {
      const isConflict = bookingList.some(b => 
        b.id !== item.id && 
        b.date === item.date && 
        b.assignedVehicle === selectedVehiclePlate && 
        b.status === 'อนุมัติแล้ว'
      );
      
      if (isConflict) {
        const confirmOverride = window.confirm(`ระวัง! รถทะเบียน ${selectedVehiclePlate} มีคิวอนุมัติแล้วในวันที่ ${item.date} คุณต้องการอนุมัติซ้อนคิวหรือไม่?`);
        if (!confirmOverride) return;
      }
    }

    try {
      await update(ref(db, `bookings/${item.id}`), { 
        status: newStatus,
        assignedDriver: driverName || 'ยังไม่ระบุ',
        assignedVehicle: selectedVehiclePlate || 'ยังไม่ระบุ'
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
      await update(ref(db, `vehicles/${mileageRecord.vehicleId}`), { 
        mileage: Number(mileageRecord.endMile), 
        status: 'พร้อมใช้งาน' 
      });
      await update(ref(db, `bookings/${mileageRecord.bookingId}`), {
        fuelCost: Number(mileageRecord.fuelCost),
        startMile: Number(mileageRecord.startMile),
        endMile: Number(mileageRecord.endMile),
        status: 'เสร็จสิ้นงาน'
      });
      alert('บันทึกค่าน้ำมันสำเร็จ!');
      setMileageRecord({ bookingId: '', vehicleId: '', startMile: '', endMile: '', fuelCost: '' });
    } catch (error) { alert(error.message); }
  };

  // --- หน้าจอ Login ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: 'url("/logo2.jpg")' }}>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 z-10 relative text-center border-4 border-blue-700">
          <img src="/logo.png" alt="Logo" className="h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-black leading-tight">ระบบจองรถออนไลน์</h1>
          <p className="text-lg text-black font-bold mb-8 italic">เทศบาลเมืองบางพระ</p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 p-4 rounded-xl font-black text-black shadow-lg hover:bg-gray-50 transition transform hover:scale-105 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" />
            เข้าสู่ระบบด้วย Gmail
          </button>
        </div>
      </div>
    );
  }

  // --- ส่วนหน้าจอหลัก ---
  return (
    <div className="min-h-screen bg-gray-50 text-black font-medium">
      <nav className="bg-blue-700 text-white p-4 shadow-md flex justify-between items-center font-bold sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={user.photoURL} alt="profile" className="h-8 w-8 rounded-full border border-white" />
          <span className="font-black text-lg hidden md:block">เทศบาลเมืองบางพระ | {userRole.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSchedule(!showSchedule)} className="bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition">
            {showSchedule ? '🏠 กลับหน้าหลัก' : '📅 ดูตารางคิวรถ'}
          </button>
          <button onClick={handleLogout} className="underline font-black text-white hover:text-red-200 transition">ออกจากระบบ</button>
        </div>
      </nav>

      {/* --- ส่วนแสดงตารางคิวรถรายเดือน (แสดงเมื่อกดปุ่ม "ดูตารางคิวรถ") --- */}
      {showSchedule ? (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-blue-100">
            <h2 className="text-3xl font-black mb-6 text-black border-b pb-4 flex items-center gap-3">
              📅 ตารางการใช้รถประจำเดือน
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-50 border-b-2 border-blue-200 text-black uppercase text-sm font-black">
                  <tr>
                    <th className="p-4">วันที่</th>
                    <th className="p-4">เวลา</th>
                    <th className="p-4">สถานที่ปลายทาง</th>
                    <th className="p-4">ผู้จอง</th>
                    <th className="p-4">ประเภท/ทะเบียนรถ</th>
                    <th className="p-4">คนขับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-black text-gray-700">
                  {bookingList
                    .filter(b => b.status === 'อนุมัติแล้ว' || b.status === 'เสร็จสิ้นงาน')
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(item => (
                    <tr key={item.id} className="hover:bg-blue-50 transition">
                      <td className="p-4 text-blue-700">{item.date}</td>
                      <td className="p-4">{item.time} น.</td>
                      <td className="p-4">📍 {item.destination}</td>
                      <td className="p-4">{item.requester}</td>
                      <td className="p-4">🚗 {item.vehicleType} <br/><span className="text-xs text-orange-600">{item.assignedVehicle}</span></td>
                      <td className="p-4">👤 {item.assignedDriver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* --- หน้าจอทำงานปกติ (Dashboard) --- */
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
            {/* --- หน้าผู้ใช้ --- */}
            {userRole === 'user' && (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white rounded-3xl shadow-xl p-8 border-4 border-blue-600">
                  <h2 className="text-2xl font-black mb-6 text-black border-b pb-4">📝 ส่งคำขอจองรถยนต์</h2>
                  <form onSubmit={handleBooking} className="space-y-4 font-black">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600 ml-1">วัตถุประสงค์การใช้รถ</label>
                      <input type="text" placeholder="ระบุเหตุผลการจอง" required className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-600 outline-none transition-all" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-600 ml-1">สถานที่ปลายทาง</label>
                      <input type="text" placeholder="สถานที่ไป" required className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-blue-600 outline-none transition-all" value={formData.destination} onChange={(e)=>setFormData({...formData, destination: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-600 ml-1">วันที่เดินทาง</label>
                        {/* ป้องกันจองย้อนหลังด้วย min={todayDate} */}
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
                    <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition transform hover:scale-102">✅ ยืนยันการจอง</button>
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
                          <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-md ${
                            item.status === 'อนุมัติแล้ว' ? 'bg-green-600 text-white' : 
                            item.status === 'เสร็จสิ้นงาน' ? 'bg-blue-600 text-white' : 
                            item.status === 'ขอยกเลิก' ? 'bg-red-600 text-white' :
                            'bg-yellow-400 text-black'
                          }`}>{item.status}</span>
                        </div>
                        
                        {/* ผู้ใช้ขอยกเลิกได้เฉพาะตอนรออนุมัติ */}
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

            {/* --- หน้าคนขับ --- */}
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
                  <button className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-2xl shadow-xl hover:bg-orange-700 transition transform hover:scale-102">✅ บันทึกค่าน้ำมันและจบงาน</button>
                </form>
              </div>
            )}

            {/* --- หน้าแอดมิน --- */}
            {userRole === 'admin' && (
              <div className="max-w-6xl mx-auto space-y-8">
                {/* แท็บ: จัดการการจอง */}
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
                                {/* แอดมินต้องเลือกรถเพื่อป้องกันคิวชน */}
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

                {/* แท็บ: จัดการผู้ใช้งาน (เพิ่มใหม่) */}
                {adminTab === 'users' && (
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-gray-100">
                    <div className="p-8 bg-blue-700 flex justify-between items-center">
                      <h2 className="text-2xl font-black text-white uppercase tracking-wider">👥 จัดการสิทธิ์บัญชีผู้ใช้</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-blue-50 border-b-2 border-blue-100">
                        <tr className="text-black font-black uppercase text-sm">
                          <th className="p-6">ชื่อผู้ใช้</th>
                          <th className="p-6">อีเมล</th>
                          <th className="p-6">สิทธิ์ปัจจุบัน</th>
                          <th className="p-6">เปลี่ยนสิทธิ์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {usersList.map((u) => (
                          <tr key={u.uid} className="hover:bg-blue-50 transition">
                            <td className="p-6 font-black text-black">{u.name}</td>
                            <td className="p-6 text-sm text-gray-600">{u.email}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-lg text-xs font-black text-white ${u.role === 'admin' ? 'bg-purple-600' : u.role === 'driver' ? 'bg-orange-600' : 'bg-gray-500'}`}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-6">
                              <select 
                                className="border-2 p-2 rounded-xl font-black bg-white focus:border-blue-700"
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                              >
                                <option value="user">User (ผู้ใช้งาน)</option>
                                <option value="driver">Driver (คนขับรถ)</option>
                                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* แท็บ: จัดการรถ (เหมือนเดิม) */}
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

                {/* แท็บ: รายงานสรุป (เหมือนเดิม) */}
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
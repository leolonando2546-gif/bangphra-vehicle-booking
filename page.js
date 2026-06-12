"use client";
import React, { useState } from 'react';

export default function BookingPage() {
  const [formData, setFormData] = useState({
    purpose: '',
    destination: '',
    startDate: '',
    vehicleType: 'รถตู้'
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">จองรถ - เทศบาลเมืองบางพระ</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">วัตถุประสงค์</label>
            <input 
              type="text" 
              className="mt-1 block w-full border rounded-md p-2" 
              placeholder="ระบุเหตุผลการใช้รถ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">สถานที่ไป</label>
            <input 
              type="text" 
              className="mt-1 block w-full border rounded-md p-2" 
              placeholder="ระบุจุดหมาย"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">วันที่เดินทาง</label>
            <input type="date" className="mt-1 block w-full border rounded-md p-2" />
          </div>

          <button className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 transition">
            ยืนยันการจองรถ
          </button>
        </div>
      </div>
    </div>
  );
}
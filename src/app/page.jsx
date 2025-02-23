"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// ... rest of your imports

const HealthcareFacilityMap = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the specified URL
    window.location.href = 'https://smart-cap.vercel.app/';
  }, []);

  // Rest of your component code...
  // Note: The rest of the code won't execute due to the redirect
  return null;
};

export default HealthcareFacilityMap;

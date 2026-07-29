"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Clock, Calendar, Sun, CloudRain, Search } from "lucide-react";

export default function DashboardHeader() {
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState("Team Member");
  const [currentDate, setCurrentDate] = useState("");
  const [temperature, setTemperature] = useState(null);
  const [city, setCity] = useState("Toronto");
  const [region, setRegion] = useState("Ontario");
  const [country, setCountry] = useState("Canada");
  const [timezone, setTimezone] = useState("");

  // Fetch User profile name
  useEffect(() => {
    async function fetchName() {
      if (currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || "Team Member");
          }
        } catch (err) {
          console.error("Error fetching user doc in header:", err);
        }
      }
    }
    fetchName();
  }, [currentUser]);

  // Live date update (once on timezone loaded or at midnight, no 1s intervals)
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const dateOpts = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      if (timezone) {
        dateOpts.timeZone = timezone;
      }
      setCurrentDate(now.toLocaleDateString("en-US", dateOpts));
    };
    updateDate();
  }, [timezone]);

  // Weather & IP Geolocation fetch using Open-Meteo & ipapi
  useEffect(() => {
    const fetchWeatherAndGeo = async () => {
      try {
        let lat = 43.6532;
        let lon = -79.3832;
        let cityName = "Toronto";
        let regionName = "Ontario";
        let countryName = "Canada";
        let tzName = "";

        // Attempt IP Geolocation
        try {
          const geoRes = await fetch("https://ipapi.co/json/");
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.latitude && geoData.longitude) {
              lat = Number(geoData.latitude);
              lon = Number(geoData.longitude);
              cityName = geoData.city || cityName;
              regionName = geoData.region || regionName;
              countryName = geoData.country_name || countryName;
              tzName = geoData.timezone || tzName;
            }
          }
        } catch (geoErr) {
          console.warn("Could not geolocate IP, using browser/settings fallback:", geoErr);
          if (typeof Intl !== "undefined") {
            tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
        }

        // Attempt to load settings (override if admin set specific coordinates)
        try {
          const settingsSnap = await getDoc(doc(db, "settings", "agency"));
          if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            if (data.latitude && data.longitude) {
              lat = Number(data.latitude);
              lon = Number(data.longitude);
              cityName = data.city || cityName;
              regionName = data.region || regionName;
              countryName = data.country || countryName;
            }
          }
        } catch (err) {
          console.warn("Could not load agency weather settings, using dynamic detected:", err);
        }

        setCity(cityName);
        setRegion(regionName);
        setCountry(countryName);
        setTimezone(tzName);

        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`
        );
        const data = await res.json();
        if (data && data.current) {
          setTemperature(Math.round(data.current.temperature_2m));
        }
      } catch (err) {
        console.error("Error fetching temperature:", err);
      }
    };

    fetchWeatherAndGeo();
    const interval = setInterval(fetchWeatherAndGeo, 900000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-6 bg-white border-b border-sky-100 gap-4">
      {/* Welcome messages */}
      <div className="flex items-center gap-6">
        <img src="/logonew.png" alt="Monk Media Logo" className="h-24 w-auto object-contain" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-sky-600">
            Welcome, {userName}
          </h1>
          <p className="text-xs text-sky-400 font-bold uppercase tracking-wider mt-0.5">
            Monk Media CRM Dashboard
          </p>
        </div>
      </div>

      {/* Clock, Date & Weather Widgets */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-sky-500">
        
        {/* Date Panel */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50/50 rounded-2xl border border-sky-100 shadow-sm">
          <Calendar id="dashboard-header-date-icon" className="w-4 h-4 text-sky-400" />
          <span>{currentDate}</span>
        </div>

        {/* Local Clock Panel */}
        <LocalClock timezone={timezone} />

        {/* IST Clock Panel */}
        <IstClock />

        {/* Weather Panel */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50/50 rounded-2xl border border-sky-100 shadow-sm">
          {temperature !== null && temperature < 10 ? (
            <CloudRain id="dashboard-header-weather-rain-icon" className="w-4 h-4 text-sky-400" />
          ) : (
            <Sun id="dashboard-header-weather-sun-icon" className="w-4 h-4 text-sky-400 animate-spin-slow" />
          )}
          <span>
            {city}, {region} ({country}): {temperature !== null ? `${temperature}°C` : "Loading..."}
          </span>
        </div>
        
      </div>
    </header>
  );
}

// Local Clock Subcomponent (Self-contained 1s updates to prevent parent re-renders)
function LocalClock({ timezone }) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeOpts = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      if (timezone) {
        timeOpts.timeZone = timezone;
      }
      setCurrentTime(now.toLocaleTimeString("en-US", timeOpts));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50/50 rounded-2xl border border-sky-100 shadow-sm min-w-[105px]">
      <Clock id="dashboard-header-local-clock-icon" className="w-4 h-4 text-sky-400" />
      <span className="font-mono">{currentTime}</span>
    </div>
  );
}

// IST Clock Subcomponent (Self-contained 1s updates to prevent parent re-renders)
function IstClock() {
  const [istTime, setIstTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istOpts = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      };
      setIstTime(now.toLocaleTimeString("en-US", istOpts));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50/50 rounded-2xl border border-amber-100 text-amber-600 shadow-sm min-w-[125px]">
      <Clock id="dashboard-header-ist-clock-icon" className="w-4 h-4 text-amber-500" />
      <span className="font-mono">IST: {istTime}</span>
    </div>
  );
}

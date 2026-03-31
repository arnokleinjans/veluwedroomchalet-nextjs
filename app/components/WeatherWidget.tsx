"use client";

import { useState, useEffect } from "react";

// WMO Weather interpretation codes
const getWeatherDetails = (code: number, isDay: boolean = true) => {
  if (code === 0) return { text: "Onbewolkt", icon: isDay ? "sunny-outline" : "moon-outline" };
  if (code === 1 || code === 2) return { text: "Licht bewolkt", icon: isDay ? "partly-sunny-outline" : "cloudy-night-outline" };
  if (code === 3) return { text: "Bewolkt", icon: "cloud-outline" };
  if (code === 45 || code === 48) return { text: "Mist", icon: "cloud-outline" };
  if (code >= 51 && code <= 55) return { text: "Motregen", icon: "rainy-outline" };
  if (code >= 61 && code <= 65) return { text: "Regen", icon: "rainy-outline" };
  if (code >= 71 && code <= 77) return { text: "Sneeuw", icon: "snow-outline" };
  if (code >= 80 && code <= 82) return { text: "Buien", icon: "rainy-outline" };
  if (code >= 95) return { text: "Onweer", icon: "thunderstorm-outline" };
  return { text: "Onbekend", icon: "cloud-outline" };
};

const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  const days = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  return days[date.getDay()];
};

export default function WeatherWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hoenderloo coordinates
    const lat = 52.1158;
    const lon = 5.875;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FAmsterdam&forecast_days=3`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Geen weerdata kunnen ophalen", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="w-64 h-64 rounded-3xl bg-black/20 backdrop-blur-md border border-white/20 animate-pulse"></div>
    );
  }

  const currentDetail = getWeatherDetails(data.current.weather_code, data.current.is_day === 1);
  const currentTemp = Math.round(data.current.temperature_2m);

  return (
    <div className="w-72 bg-black/20 backdrop-blur-md border border-white/20 rounded-[2rem] p-5 text-white shadow-xl flex flex-col font-sans transition-transform hover:scale-[1.02]">
      {/* Location tag */}
      <div className="bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 mb-2 shadow-sm border border-white/10">
        {/* @ts-ignore */}
        <ion-icon name="navigate" style={{ fontSize: "14px" }}></ion-icon>
        Hoenderloo
      </div>

      {/* Current Weather */}
      <div className="flex flex-col items-center mb-6 mt-2">
        <h2 className="text-6xl font-light tracking-tighter mb-1 relative left-2" style={{ color: "white" }}>
          {currentTemp}&deg;<span className="text-3xl font-normal opacity-80 inline-block -ml-1">C</span>
        </h2>
        <div className="flex items-center gap-2 text-lg font-medium opacity-90">
          {/* @ts-ignore */}
          <ion-icon name={currentDetail.icon} style={{ fontSize: "28px", color: "#FBBF24" }}></ion-icon>
          {currentDetail.text}
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mb-5"></div>

      {/* Forecast */}
      <div className="flex justify-between px-2">
        {data.daily.time.slice(0, 3).map((time: string, index: number) => {
          const detail = getWeatherDetails(data.daily.weather_code[index], true);
          const maxT = Math.round(data.daily.temperature_2m_max[index]);
          const minT = Math.round(data.daily.temperature_2m_min[index]);

          return (
            <div key={time} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-xs font-medium opacity-90">{getDayName(time)}</span>
              {/* @ts-ignore */}
              <ion-icon name={detail.icon} style={{ fontSize: "20px", color: index === 0 ? "#FBBF24" : "white" }}></ion-icon>
              <div className="text-xs font-semibold tracking-wide">
                <span>{maxT}&deg;</span>
                <span className="text-white/60 mx-px">/</span>
                <span className="text-white/60">{minT}&deg;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

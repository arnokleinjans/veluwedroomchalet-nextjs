"use client";

import { useState } from "react";
import { useBooking } from "../../context/BookingContext";

export const dynamic = "force-dynamic";

export default function Home() {
  const { booking, appData } = useBooking();
  const [showWifiModal, setShowWifiModal] = useState(false);

  const handleAction = (action: string) => {
    if (action === "wifi-modal") {
      setShowWifiModal(true);
    }
  };

  return (
    <div className="tab-content active" id="home-tab">
      <div className="card">
        <div className="icon-wrapper">
          {/* @ts-ignore */}
          <ion-icon name="calendar-outline"></ion-icon>
        </div>
        <div className="card-content">
          <h3>Uw Verblijf</h3>
          <p id="guest-stay-dates">
            {booking.checkIn} t/m {booking.checkOut}
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: "1.4rem", marginBottom: "15px", marginTop: "25px" }}>
        Handig om te weten
      </h2>
      <div id="insights-container">
        {appData.insights.map((insight: { icon: string, title: string, subtitle: string, action: string }, index: number) => (
          <div key={index} className="card clickable" onClick={() => handleAction(insight.action)}>
            <div className="icon-wrapper">
              {/* @ts-ignore */}
              <ion-icon name={insight.icon}></ion-icon>
            </div>
            <div className="card-content">
              <h3>{insight.title}</h3>
              <p>{insight.subtitle}</p>
            </div>
            <div style={{ marginLeft: "auto", color: "var(--text-secondary)" }}>
              {/* @ts-ignore */}
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </div>
          </div>
        ))}
      </div>

      {showWifiModal && (
        <div className="modal show" onClick={() => setShowWifiModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => setShowWifiModal(false)}>&times;</span>
            <h2>WiFi Gegevens</h2>
            <div className="wifi-details">
              <p><strong>Netwerk:</strong> {appData.property.wifi.network}</p>
              <p><strong>Wachtwoord:</strong> {appData.property.wifi.password}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

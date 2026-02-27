"use client";

import { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { parseTemplateString, formatDutchDate } from "../../utils/templateParser";

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
      <div id="insights-container">
        {appData.insights.map((insight: { icon: string, title: string, subtitle: string, action: string }, index: number) => {
          // Check if icon string is an image file path (like "icons/home.png") or a fallback ion-icon string
          const isImage = insight.icon && insight.icon.includes('.');

          return (
            <div key={index} className="card clickable" onClick={() => handleAction(insight.action)}>
              <div className="icon-wrapper">
                {isImage ? (
                  <img src={`/${insight.icon}`} alt="" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                ) : (
                  /* @ts-ignore */
                  <ion-icon name={insight.icon || "information-circle-outline"}></ion-icon>
                )}
              </div>
              <div className="card-content">
                <h3>{parseTemplateString(insight.title, booking)}</h3>
                <p>{parseTemplateString(insight.subtitle, booking)}</p>
              </div>
              {insight.action === "wifi-modal" && (
                <div style={{ marginLeft: "auto", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  {/* @ts-ignore */}
                  <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
              )}
            </div>
          );
        })}
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

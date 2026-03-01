"use client";

import Link from "next/link";
import { useBooking } from "../../context/BookingContext";
import { parseTemplateString } from "../../utils/templateParser";

export const dynamic = "force-dynamic";

export default function Home() {
  const { booking, appData } = useBooking();

  return (
    <div className="tab-content active" id="home-tab">
      <div id="insights-container">
        {appData.insights.map((insight: { icon: string, title: string, subtitle: string, action: string, detailContent?: string }, index: number) => {
          const isImage = insight.icon && insight.icon.includes('.');
          const hasDetail = insight.detailContent && insight.detailContent.trim().length > 0;

          const cardContent = (
            <>
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
              {hasDetail && (
                <div style={{ marginLeft: "auto", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                  {/* @ts-ignore */}
                  <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
              )}
            </>
          );

          if (hasDetail) {
            return (
              <Link
                key={index}
                href={`/b/${booking?.id}/info/home/${index}`}
                className="card clickable"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="card">
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}

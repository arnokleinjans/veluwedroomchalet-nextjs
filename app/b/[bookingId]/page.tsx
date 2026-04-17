"use client";

import Link from "next/link";
import { useBooking } from "../../context/BookingContext";
import { parseTemplateString } from "../../utils/templateParser";

export const dynamic = "force-dynamic";


function isInsightVisible(insight: any, booking: any): boolean {
  const visibility = insight.visibility || "always";
  if (visibility === "always") return true;
  if (!booking?.checkIn || !booking?.checkOut) return true;

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  if (visibility === "checkin") {
    // Visible from link receipt until end of check-in day
    return today <= booking.checkIn;
  }

  if (visibility === "checkout") {
    // Visible from noon the day before checkout onwards
    const checkoutMidnight = new Date(booking.checkOut + "T00:00:00");
    const showFrom = new Date(checkoutMidnight.getTime() - 12 * 60 * 60 * 1000);
    return now >= showFrom;
  }

  return true;
}

export default function Home() {
  const { booking, appData } = useBooking();
  const visibleInsights = (appData.insights || [])
    .map((insight: any, originalIndex: number) => ({ ...insight, originalIndex }))
    .filter((insight: any) => isInsightVisible(insight, booking));

  return (
    <div className="tab-content active" id="home-tab">
      <style>{`
        @media (max-width: 767px) {
          [data-hide-mobile="true"] {
            display: none !important;
          }
        }
        .card-glass[data-visibility="checkin"] {
          background: rgba(210, 225, 190, 0.82) !important;
          border: 1px solid rgba(74, 93, 35, 0.25) !important;
          box-shadow: 0 4px 18px rgba(74, 93, 35, 0.12) !important;
        }
        .card-glass[data-visibility="checkout"] {
          background: rgba(210, 225, 190, 0.82) !important;
          border: 1px solid rgba(74, 93, 35, 0.25) !important;
          box-shadow: 0 4px 18px rgba(74, 93, 35, 0.12) !important;
        }
      `}</style>
      <div className="md:-mt-16 mt-[-2rem] relative z-30 space-y-8 md:space-y-12">
        <div id="insights-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleInsights.map((insight: { icon: string, title: string, subtitle: string, action: string, detailContent?: string, widgetCode?: string, hideOnMobile?: boolean, originalIndex: number }, index: number) => {
          const isImage = insight.icon && insight.icon.includes('.');
          const rawDetail = (insight.detailContent || '').trim();
          const hasWidgetCode = (insight.widgetCode || '').trim().length > 0;
          // TipTap laat vaak lege tags achter als een veld is leeggemaakt.
          const hasDetail = (rawDetail.length > 0 && rawDetail !== '<p></p>' && rawDetail !== '<p><br></p>') || hasWidgetCode;

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
                href={`/b/${booking?.id}/info/home/${insight.originalIndex}`}
                className="card card-glass clickable h-full m-0"
                data-hide-mobile={insight.hideOnMobile ? "true" : undefined}
                data-visibility={(insight as any).visibility || undefined}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="card card-glass h-full m-0" data-hide-mobile={insight.hideOnMobile ? "true" : undefined} data-visibility={(insight as any).visibility || undefined}>
              {cardContent}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

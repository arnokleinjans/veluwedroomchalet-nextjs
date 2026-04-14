"use client";

import Link from "next/link";
import { useBooking } from "../../context/BookingContext";
import { parseTemplateString } from "../../utils/templateParser";

export const dynamic = "force-dynamic";

export default function Home() {
  const { booking, appData } = useBooking();

  return (
    <div className="tab-content active" id="home-tab">
      <style>{`
        @media (max-width: 767px) {
          [data-hide-mobile="true"] {
            display: none !important;
          }
        }
      `}</style>
      <div className="md:-mt-16 mt-[-2rem] relative z-30 space-y-8 md:space-y-12">
        <div id="insights-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appData.insights.map((insight: { icon: string, title: string, subtitle: string, action: string, detailContent?: string, widgetCode?: string, hideOnMobile?: boolean }, index: number) => {
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
                href={`/b/${booking?.id}/info/home/${index}`}
                className="card card-glass clickable h-full m-0"
                data-hide-mobile={insight.hideOnMobile ? "true" : undefined}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={index} className="card card-glass h-full m-0" data-hide-mobile={insight.hideOnMobile ? "true" : undefined}>
              {cardContent}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

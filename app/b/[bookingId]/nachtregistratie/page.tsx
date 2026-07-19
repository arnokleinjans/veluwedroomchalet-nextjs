"use client";

import Link from "next/link";
import { useBooking } from "../../../context/BookingContext";
import NachtregistratieForm from "../../../components/NachtregistratieForm";

export default function NachtregistratiePage() {
    const { booking } = useBooking();

    return (
        <div className="md:-mt-16 mt-[-2rem] relative z-30" style={{ paddingBottom: "40px" }}>
            <div style={{ maxWidth: "560px", margin: "0 auto 12px" }}>
                <Link
                    href={`/b/${booking.id}`}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--primary-color)",
                        textDecoration: "none",
                        fontSize: "0.95rem",
                        fontWeight: "bold",
                    }}
                >
                    ← Terug
                </Link>
            </div>
            <NachtregistratieForm
                bookingId={booking.id}
                guestName={booking.guestName}
                checkIn={booking.checkIn}
                checkOut={booking.checkOut}
                lang={booking.language || "nl"}
                registratie={booking.nachtregistratie || null}
            />
        </div>
    );
}

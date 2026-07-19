"use client";

import { useBooking } from "../../../context/BookingContext";
import NachtregistratieForm from "../../../components/NachtregistratieForm";

export default function NachtregistratiePage() {
    const { booking } = useBooking();

    return (
        <div className="md:-mt-16 mt-[-2rem] relative z-30" style={{ paddingBottom: "40px" }}>
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

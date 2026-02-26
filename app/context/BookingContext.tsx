"use client";

import { createContext, useContext, ReactNode } from "react";

export type BookingInfo = {
    id: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
};

const BookingContext = createContext<{ booking: BookingInfo, appData: any } | null>(null);

export const useBooking = () => {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error("useBooking must be used within a BookingProvider");
    }
    return context;
}

export const BookingProvider = ({ children, booking, appData }: { children: ReactNode, booking: BookingInfo, appData: any }) => {
    return (
        <BookingContext.Provider value={{ booking, appData }}>
            {children}
        </BookingContext.Provider>
    );
};

"use client";

import { createContext, useContext, ReactNode } from "react";

export type NachtregistratieData = {
    status: 'ingevuld' | 'verstuurd';
    betaalwijze: 'receptie' | 'overmaken';
    huurderNaam: string;
    adres: string;
    telefoon: string;
    email: string;
    aantalPersonen: number;
    aankomst: string;
    vertrek: string;
    bedrag: number;
    opmerkingen?: string;
    ingevuldOp?: string;
    verstuurdOp?: string;
};

export type BookingInfo = {
    id: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    language: string;
    keyCode?: string;
    nachtregistratie?: NachtregistratieData;
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

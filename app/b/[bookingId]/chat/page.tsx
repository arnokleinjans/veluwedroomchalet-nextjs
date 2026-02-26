"use client";

import { useState, useRef, useEffect } from "react";
import { appData } from "../../../utils/mockData";
import { useBooking } from "../../../context/BookingContext";

export default function ChatPage() {
    const booking = useBooking();
    const [messages, setMessages] = useState<{ role: "user" | "bot", text: string }[]>(
        [{ role: "bot", text: `Hoi ${booking.guestName}! Ik ben de digitale conciërge van ${appData.property.name}. Hoe kan ik je vandaag helpen?` }]
    );
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: "user", text: userText }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userText,
                    history: messages.map(m => ({ role: m.role === "bot" ? "model" : "user", parts: [{ text: m.text }] })),
                    guestContext: {
                        name: booking.guestName,
                        checkIn: booking.checkIn,
                        checkOut: booking.checkOut
                    }
                }),
            });

            if (!response.ok) throw new Error("Netwerkfout bij ophalen antwoord");

            const data = await response.json();
            setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                { role: "bot", text: "Oei, er ging iets mis met de verbinding. Probeer het straks nog eens, of neem even contact op met Arno via WhatsApp." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="tab-content active" id="contact-tab">
            <div id="chat-window" style={{ height: "350px", overflowY: "auto", padding: "10px", backgroundColor: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        backgroundColor: msg.role === "user" ? "var(--primary-color)" : "#f1f1f1",
                        color: msg.role === "user" ? "white" : "var(--text-primary)",
                        padding: "10px 14px",
                        borderRadius: "16px",
                        maxWidth: "85%",
                        borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                        borderBottomLeftRadius: msg.role === "bot" ? "4px" : "16px",
                        fontSize: "0.95rem"
                    }}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div style={{ alignSelf: "flex-start", backgroundColor: "#f1f1f1", padding: "10px 14px", borderRadius: "16px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                        Aan het typen...
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Stel je vraag..."
                    style={{ flex: 1, padding: "12px", borderRadius: "24px", border: "1px solid var(--border-color)", outline: "none" }}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    style={{ backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "50%", width: "45px", height: "45px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}>
                    {/* @ts-ignore */}
                    <ion-icon name="send-outline" style={{ fontSize: "1.2rem" }}></ion-icon>
                </button>
            </div>

            <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px" }}>Komt de conciërge er niet uit?</p>
                <a href={`https://wa.me/${appData.property.host.phone.replace('+', '')}?text=Hoi%20${appData.property.host.name},%20ik%20heb%20een%20vraag%20die%20de%20app%20niet%20kan%20beantwoorden.`} className="btn btn-whatsapp" style={{ textDecoration: "none", fontSize: "1rem", padding: "10px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    {/* @ts-ignore */}
                    <ion-icon name="logo-whatsapp"></ion-icon> App {appData.property.host.name}
                </a>
            </div>
        </div>
    );
}

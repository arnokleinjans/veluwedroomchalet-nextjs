"use client";

import { useState, useEffect } from "react";
import { updatePropertyInfo, updateWifi, updateRules, addBooking, removeBooking, fetchAdminData } from "../actions/adminActions";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // Form states
    const [propName, setPropName] = useState("");
    const [hostName, setHostName] = useState("");
    const [phone, setPhone] = useState("");
    const [wifiNetwork, setWifiNetwork] = useState("");
    const [wifiPass, setWifiPass] = useState("");
    const [rules, setRules] = useState<{ title: string, desc: string }[]>([]);

    // Bookings states
    const [bookings, setBookings] = useState<{ id: string, guestName: string, checkIn: string, checkOut: string }[]>([]);
    const [newGuestName, setNewGuestName] = useState("");
    const [newCheckIn, setNewCheckIn] = useState("");
    const [newCheckOut, setNewCheckOut] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    useEffect(() => {
        // Init auth
        const auth = localStorage.getItem("veluwe_admin_auth");
        if (auth === "true") setIsAuthenticated(true);

        // Fetch live database metrics via secure server action
        fetchAdminData().then(data => {
            setPropName(data.property.name);
            setHostName(data.property.host.name);
            setPhone(data.property.host.phone);
            setWifiNetwork(data.property.wifi.network);
            setWifiPass(data.property.wifi.password);
            setRules(data.rules || []);
            setBookings(data.bookings || []);
        });
    }, []);

    const handleLogin = () => {
        if (pin === "2026") {
            setIsAuthenticated(true);
            localStorage.setItem("veluwe_admin_auth", "true");
            setError(false);
        } else {
            setError(true);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem("veluwe_admin_auth");
        setPin("");
    };

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        setSaveMessage("");
        const res = await updatePropertyInfo(propName, hostName, phone);
        setIsSaving(false);
        if (res.success) setSaveMessage("✅ Algemene info succesvol opgeslagen!");
        else setSaveMessage("❌ " + res.error);
    };

    const handleSaveWifi = async () => {
        setIsSaving(true);
        setSaveMessage("");
        const res = await updateWifi(wifiNetwork, wifiPass);
        setIsSaving(false);
        if (res.success) setSaveMessage("✅ WiFi succesvol opgeslagen!");
        else setSaveMessage("❌ " + res.error);
    };

    const handleSaveRules = async () => {
        setIsSaving(true);
        setSaveMessage("");
        const res = await updateRules(rules);
        setIsSaving(false);
        if (res.success) setSaveMessage("✅ Huisregels succesvol opgeslagen!");
        else setSaveMessage("❌ " + res.error);
    };

    const handleAddBooking = async () => {
        if (!newGuestName || !newCheckIn || !newCheckOut) {
            setSaveMessage("❌ Vul alle verplichte boeking velden in.");
            return;
        }
        setIsSaving(true);
        setSaveMessage("");
        const res = await addBooking(newGuestName, newCheckIn, newCheckOut);
        setIsSaving(false);
        if (res.success) {
            setSaveMessage("✅ Boeking toegevoegd! Kopiëer de link hieronder.");
            // Reload page smoothly to fetch new data
            window.location.reload();
        } else {
            setSaveMessage("❌ " + res.error);
        }
    };

    const handleRemoveBooking = async (id: string) => {
        if (!confirm("Boeking definitief verwijderen?")) return;
        setIsSaving(true);
        const res = await removeBooking(id);
        setIsSaving(false);
        if (res.success) window.location.reload();
        else setSaveMessage("❌ " + res.error);
    };

    const handleRuleChange = (index: number, field: 'title' | 'desc', value: string) => {
        const newRules = [...rules];
        newRules[index][field] = value;
        setRules(newRules);
    };

    const addRule = () => setRules([...rules, { title: "Nieuwe Regel", desc: "Uitleg..." }]);
    const removeRule = (idx: number) => setRules(rules.filter((_, i) => i !== idx));

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Link gekopieerd: " + text);
    };

    if (!isAuthenticated) {
        return (
            <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f4" }}>
                <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", textAlign: "center", maxWidth: "400px" }}>
                    <h1 style={{ color: "#333", marginBottom: "10px", fontSize: "1.5rem" }}>Beheerderspaneel</h1>
                    <p style={{ color: "#666", marginBottom: "20px" }}>Voer uw geheime beheerder-PIN in.</p>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        style={{ padding: "12px", width: "100%", fontSize: "1.2rem", textAlign: "center", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "15px" }}
                        placeholder="PIN Code"
                    />
                    {error && <p style={{ color: "red", fontSize: "0.9rem", marginBottom: "15px" }}>Ongeldige PIN.</p>}
                    <button onClick={handleLogin} style={{ backgroundColor: "#4A5D23", color: "white", padding: "12px 24px", border: "none", borderRadius: "8px", cursor: "pointer", width: "100%", fontSize: "1.1rem" }}>Inloggen</button>
                    <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "#999" }}>Let op: Voor geautoriseerde hosts only.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: "#f9f9f9", minHeight: "100vh", padding: "40px 20px" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", backgroundColor: "white", borderRadius: "16px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#4A5D23", padding: "30px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "2rem", fontFamily: "'Lora', serif" }}>Geheim Beheer</h1>
                        <p style={{ margin: "5px 0 0", opacity: 0.9 }}>Pas direct app-teksten aan. (Opgeslagen via Vercel KV)</p>
                    </div>
                    <button onClick={handleLogout} style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", color: "white", padding: "8px 16px", cursor: "pointer", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                        Uitloggen
                    </button>
                </div>

                <div style={{ padding: "30px" }}>
                    {saveMessage && (
                        <div style={{ padding: "15px", marginBottom: "20px", backgroundColor: saveMessage.includes("❌") ? "#fee" : "#efe", color: saveMessage.includes("❌") ? "#c00" : "#270", borderRadius: "8px", border: saveMessage.includes("❌") ? "1px solid #ecc" : "1px solid #cec", fontWeight: "bold" }}>
                            {saveMessage}
                        </div>
                    )}

                    <div style={{ display: "grid", gap: "30px" }}>
                        {/* Sectie: Boekingen / Gasten Links */}
                        <div style={{ border: "1px solid #4A5D23", borderRadius: "12px", padding: "20px", backgroundColor: "#fcfefc" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#4A5D23", borderBottom: "2px solid #e5ebe5", paddingBottom: "10px" }}>✨ Gepersonaliseerde Gasten Links</h2>
                            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>Genereer unieke links voor elke boeking zodat gasten direct begroet worden met hun eigen vertrekdata.</p>

                            <div style={{ marginBottom: "20px", backgroundColor: "white", padding: "15px", borderRadius: "8px", border: "1px solid #ccc" }}>
                                <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "#333" }}>Nieuwe Link Aanmaken</h3>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 200px" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Naam Gast (zoals: Jan & Mien)</label>
                                        <input type="text" value={newGuestName} onChange={e => setNewGuestName(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Verplicht" />
                                    </div>
                                    <div style={{ flex: "1 1 120px" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Aankomst</label>
                                        <input type="date" value={newCheckIn} onChange={e => setNewCheckIn(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                    </div>
                                    <div style={{ flex: "1 1 120px" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Vertrek</label>
                                        <input type="date" value={newCheckOut} onChange={e => setNewCheckOut(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                    </div>
                                </div>
                                <button onClick={handleAddBooking} disabled={isSaving} style={{ marginTop: "15px", backgroundColor: "#4A5D23", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Genereer Link</button>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {bookings.map((booking) => {
                                    const shareUrl = `${window.location.origin}/b/${booking.id}`;
                                    return (
                                        <div key={booking.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #eee" }}>
                                            <div>
                                                <strong style={{ color: "#333", display: "block" }}>{booking.guestName}</strong>
                                                <span style={{ fontSize: "0.85rem", color: "#777" }}>{booking.checkIn} t/m {booking.checkOut} • ID: {booking.id}</span>
                                                <div style={{ fontSize: "0.85rem", color: "#4A5D23", marginTop: "4px", wordBreak: "break-all" }}>{shareUrl}</div>
                                            </div>
                                            <div style={{ display: "flex", gap: "10px" }}>
                                                <button onClick={() => copyToClipboard(shareUrl)} style={{ backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>Kopieer Link</button>
                                                <button onClick={() => handleRemoveBooking(booking.id)} style={{ backgroundColor: "#fee", color: "#c00", border: "1px solid #ecc", borderRadius: "4px", padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Verwijder</button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {bookings.length === 0 && <p style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>Geen actieve boekingen gevonden.</p>}
                            </div>
                        </div>

                        {/* Sectie: Algemeen */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>🏡 Algemene Informatie</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Naam Huisje</label>
                                    <input type="text" value={propName} onChange={e => setPropName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Naam Host(s)</label>
                                        <input type="text" value={hostName} onChange={e => setHostName(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>WhatsApp Nummer</label>
                                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                    </div>
                                </div>
                                <button onClick={handleSaveGeneral} disabled={isSaving} style={{ alignSelf: "flex-start", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                            </div>
                        </div>

                        {/* Sectie: WiFi */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>📶 WiFi Instellingen</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Netwerknaam (SSID)</label>
                                    <input type="text" value={wifiNetwork} onChange={e => setWifiNetwork(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Wachtwoord</label>
                                    <input type="text" value={wifiPass} onChange={e => setWifiPass(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                </div>
                                <button onClick={handleSaveWifi} disabled={isSaving} style={{ marginTop: "5px", alignSelf: "flex-start", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>WiFi Opslaan</button>
                            </div>
                        </div>

                        {/* Sectie: Huisregels */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>📜 Huisregels</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                {rules.map((rule, idx) => (
                                    <div key={idx} style={{ padding: "15px", backgroundColor: "#f4f4f4", borderRadius: "8px", position: "relative" }}>
                                        <button onClick={() => removeRule(idx)} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>Verwijder</button>
                                        <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Titel (bijv. Afval)</label>
                                        <input type="text" value={rule.title} onChange={e => handleRuleChange(idx, 'title', e.target.value)} style={{ width: "calc(100% - 80px)", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "10px", display: "block" }} />
                                        <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Beschrijving</label>
                                        <textarea value={rule.desc} onChange={e => handleRuleChange(idx, 'desc', e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px", fontFamily: "inherit" }} />
                                    </div>
                                ))}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={addRule} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Nieuwe Regel Toevoegen</button>
                                    <button onClick={handleSaveRules} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Alle Regels Opslaan</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

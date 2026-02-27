"use client";

import { useState, useEffect } from "react";
import {
    updatePropertyInfo, updateWifi, addBooking, removeBooking, fetchAdminData,
    updateHeaderImage, updateInsights, updateVideos, updateRestaurants,
    updateChatbotContext
} from "../actions/adminActions";
import { fetchAvailableHeaderImages, fetchAvailableIcons, fetchAvailableThumbnails } from "../actions/assetActions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ padding: "15px", backgroundColor: "#f4f4f4", borderRadius: "8px", position: "relative" as const }}>
                <div {...attributes} {...listeners} style={{ position: "absolute" as const, top: "12px", left: "10px", cursor: "grab", fontSize: "1.2rem", color: "#999", touchAction: "none", userSelect: "none" }} title="Sleep om te herordenen">
                    ☰
                </div>
                <div style={{ marginLeft: "30px" }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    // Dropdown assets
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [availableIcons, setAvailableIcons] = useState<string[]>([]);
    const [availableThumbnails, setAvailableThumbnails] = useState<string[]>([]);

    // Form states
    const [propName, setPropName] = useState("");
    const [hostName, setHostName] = useState("");
    const [phone, setPhone] = useState("");
    const [headerImage, setHeaderImage] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [wifiNetwork, setWifiNetwork] = useState("");
    const [wifiPass, setWifiPass] = useState("");

    // Dynamic Arrays
    const [insights, setInsights] = useState<{ icon: string, title: string, subtitle: string, action: string }[]>([]);
    const [videos, setVideos] = useState<{ title: string, thumb: string, url: string }[]>([]);
    const [restaurants, setRestaurants] = useState<{ name: string, desc: string, url: string }[]>([]);
    const [chatbotContext, setChatbotContext] = useState("");

    // Bookings states
    const [bookings, setBookings] = useState<{ id: string, guestName: string, checkIn: string, checkOut: string }[]>([]);
    const [newGuestName, setNewGuestName] = useState("");
    const [newCheckIn, setNewCheckIn] = useState("");
    const [newCheckOut, setNewCheckOut] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    useEffect(() => {
        const auth = localStorage.getItem("veluwe_admin_auth");
        if (auth === "true") setIsAuthenticated(true);

        fetchAvailableHeaderImages().then(setAvailableImages);
        fetchAvailableIcons().then(setAvailableIcons);
        fetchAvailableThumbnails().then(setAvailableThumbnails);

        fetchAdminData().then(data => {
            setPropName(data.property.name);
            setHostName(data.property.host.name);
            setPhone(data.property.host.phone);
            setHeaderImage(data.property.headerImage || "");
            setSubtitle(data.property.subtitle || "Welkom terug");

            setWifiNetwork(data.property.wifi.network);
            setWifiPass(data.property.wifi.password);

            setInsights(data.insights || []);
            setVideos(data.videos || []);
            setRestaurants(data.restaurants || []);
            setBookings(data.bookings || []);
            setChatbotContext(data.chatbotContext || "");
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

    const runSaveAction = async (actionFn: () => Promise<any>, successMsg: string) => {
        setIsSaving(true);
        setSaveMessage("");
        const res = await actionFn();
        setIsSaving(false);
        if (res.success) setSaveMessage("✅ " + successMsg);
        else setSaveMessage("❌ " + res.error);
    };

    const handleSaveGeneral = () => runSaveAction(async () => {
        await updateHeaderImage(headerImage);
        return await updatePropertyInfo(propName, hostName, phone, subtitle);
    }, "Algemene info succesvol opgeslagen!");

    const handleSaveWifi = () => runSaveAction(() => updateWifi(wifiNetwork, wifiPass), "WiFi succesvol opgeslagen!");
    const handleSaveInsights = () => runSaveAction(() => updateInsights(insights), "Home Items succesvol opgeslagen!");
    const handleSaveVideos = () => runSaveAction(() => updateVideos(videos), "Videoinstructies succesvol opgeslagen!");
    const handleSaveRestaurants = () => runSaveAction(() => updateRestaurants(restaurants), "Omgeving succesvol opgeslagen!");
    const handleSaveChatbotContext = () => runSaveAction(() => updateChatbotContext(chatbotContext), "Chatbot context succesvol opgeslagen!");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function makeDragEnd<T>(items: T[], setItems: (items: T[]) => void) {
        return (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id);
                const newIndex = items.findIndex((_, i) => `item-${i}` === over.id);
                setItems(arrayMove(items, oldIndex, newIndex));
            }
        };
    }

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
                        {/* Sectie: Boekingen */}
                        <div style={{ border: "1px solid #4A5D23", borderRadius: "12px", padding: "20px", backgroundColor: "#fcfefc" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#4A5D23", borderBottom: "2px solid #e5ebe5", paddingBottom: "10px" }}>✨ Gepersonaliseerde Gasten Links</h2>
                            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>Genereer unieke links voor elke boeking zodat gasten direct begroet worden met hun eigen vertrekdata.</p>

                            <div style={{ marginBottom: "20px", backgroundColor: "white", padding: "15px", borderRadius: "8px", border: "1px solid #ccc" }}>
                                <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "#333" }}>Nieuwe Link Aanmaken</h3>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 200px" }}>
                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Naam Gast</label>
                                        <input type="text" value={newGuestName} onChange={e => setNewGuestName(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Bijv: Jan & Mien" />
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
                                                <span style={{ fontSize: "0.85rem", color: "#777" }}>{booking.checkIn} t/m {booking.checkOut}</span>
                                                <div style={{ fontSize: "0.85rem", color: "#4A5D23", marginTop: "4px", wordBreak: "break-all" }}>{shareUrl}</div>
                                            </div>
                                            <div style={{ display: "flex", gap: "10px" }}>
                                                <button onClick={() => copyToClipboard(shareUrl)} style={{ backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>Kopieer</button>
                                                <button onClick={() => handleRemoveBooking(booking.id)} style={{ backgroundColor: "#fee", color: "#c00", border: "1px solid #ecc", borderRadius: "4px", padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Verwijder</button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {bookings.length === 0 && <p style={{ fontSize: "0.9rem", color: "#888", fontStyle: "italic" }}>Geen boekingen gevonden.</p>}
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
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Header Afbeelding (bovenaan de app)</label>
                                    <select value={headerImage} onChange={e => setHeaderImage(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                        <option value="">-- Geen afbeelding --</option>
                                        {availableImages.map((img, i) => (
                                            <option key={i} value={img}>{img}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Subtitel (boven de naam, bijv. "Welkom terug")</label>
                                    <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                </div>
                                <button onClick={handleSaveGeneral} disabled={isSaving} style={{ alignSelf: "flex-end", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                            </div>
                        </div>

                        {/* Sectie: Home Items */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>📱 Home Pagina Items (Uw verblijf)</h2>
                            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>Variabelen: <code>@aankomst</code>, <code>@vertrek</code>, <code>@naamgast</code>.</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(insights, setInsights)}>
                                    <SortableContext items={insights.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                        {insights.map((item, idx) => (
                                            <SortableItem key={`insight-${idx}`} id={`item-${idx}`}>
                                                <button onClick={() => setInsights(insights.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>

                                                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", marginTop: "5px" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Titel</label>
                                                        <input type="text" value={item.title} onChange={e => { const n = [...insights]; n[idx].title = e.target.value; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Icoon (uit map `/public/icons`)</label>
                                                        <select value={item.icon} onChange={e => { const n = [...insights]; n[idx].icon = e.target.value; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                            <option value={item.icon}>{item.icon} (huidig)</option>
                                                            {availableIcons.map((ic, i) => <option key={i} value={ic}>{ic}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Bodytekst</label>
                                                <textarea value={item.subtitle} onChange={e => { const n = [...insights]; n[idx].subtitle = e.target.value; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px", fontFamily: "inherit" }} />
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={() => setInsights([...insights, { title: "Nieuw", subtitle: "", icon: "icons/default.png", action: "none" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Item Toevoegen</button>
                                    <button onClick={handleSaveInsights} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                </div>
                            </div>
                        </div>

                        {/* Sectie: Videoinstructies */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>🎥 Videoinstructies</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(videos, setVideos)}>
                                    <SortableContext items={videos.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                        {videos.map((vid, idx) => (
                                            <SortableItem key={`vid-${idx}`} id={`item-${idx}`}>
                                                <button onClick={() => setVideos(videos.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>

                                                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", marginTop: "5px" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Naam Video</label>
                                                        <input type="text" value={vid.title} onChange={e => { const n = [...videos]; n[idx].title = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Thumbnail (uit `/public/thumbnails`)</label>
                                                        <select value={vid.thumb} onChange={e => { const n = [...videos]; n[idx].thumb = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                            <option value={vid.thumb}>{vid.thumb} (huidig)</option>
                                                            {availableThumbnails.map((ic, i) => <option key={i} value={ic}>{ic}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>YouTube URL</label>
                                                <input type="text" value={vid.url} onChange={e => { const n = [...videos]; n[idx].url = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="https://youtube.com/..." />
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={() => setVideos([...videos, { title: "Nieuwe Video", thumb: "thumbnails/default.jpg", url: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Video Toevoegen</button>
                                    <button onClick={handleSaveVideos} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                </div>
                            </div>
                        </div>

                        {/* Sectie: Omgeving */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>🌲 Omgeving TIPS</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(restaurants, setRestaurants)}>
                                    <SortableContext items={restaurants.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                        {restaurants.map((rest, idx) => (
                                            <SortableItem key={`rest-${idx}`} id={`item-${idx}`}>
                                                <button onClick={() => setRestaurants(restaurants.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>

                                                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", marginTop: "5px" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Titel (bijv. Restaurant de Koperen Pot)</label>
                                                        <input type="text" value={rest.name} onChange={e => { const n = [...restaurants]; n[idx].name = e.target.value; setRestaurants(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Website URL</label>
                                                        <input type="text" value={rest.url} onChange={e => { const n = [...restaurants]; n[idx].url = e.target.value; setRestaurants(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="https://..." />
                                                    </div>
                                                </div>

                                                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Bodytekst / Omschrijving</label>
                                                <textarea value={rest.desc} onChange={e => { const n = [...restaurants]; n[idx].desc = e.target.value; setRestaurants(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px", fontFamily: "inherit" }} />
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={() => setRestaurants([...restaurants, { name: "Nieuwe Tip", desc: "", url: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Tip Toevoegen</button>
                                    <button onClick={handleSaveRestaurants} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                </div>
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
                                <button onClick={handleSaveWifi} disabled={isSaving} style={{ marginTop: "5px", alignSelf: "flex-end", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>WiFi Opslaan</button>
                            </div>
                        </div>

                        {/* Sectie: Chatbot Context */}
                        <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>🤖 Chatbot Kennisbank</h2>
                            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>Alles wat je hier invoert wordt als extra context meegegeven aan de Digitale Conciërge. Hoe meer detail, hoe beter de chatbot kan antwoorden.</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <textarea
                                    value={chatbotContext}
                                    onChange={e => setChatbotContext(e.target.value)}
                                    style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "200px", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: "1.5" }}
                                    placeholder="Bijv: De sauna mag alleen aan tussen 16:00 en 22:00. De sleutel van het schuurtje zit onder de bloempot. Dekens en kussens liggen in de gang-kast..."
                                />
                                <button onClick={handleSaveChatbotContext} disabled={isSaving} style={{ alignSelf: "flex-end", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
    updatePropertyInfo, addBooking, removeBooking, fetchAdminData,
    updateHeaderImage, updateInsights, updateVideos, updateOmgeving,
    updateChatbotContext, updateAiSettings
} from "../actions/adminActions";
import { fetchAvailableHeaderImages, fetchAvailableIcons, fetchAvailableThumbnails } from "../actions/assetActions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "../components/RichTextEditor";

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

    // Dynamic Arrays
    const [insights, setInsights] = useState<{ icon: string, title: string, subtitle: string, action: string, detailContent?: string }[]>([]);
    const [videos, setVideos] = useState<{ title: string, thumb: string, url: string }[]>([]);
    const [omgeving, setOmgeving] = useState<{ name: string, desc: string, image: string, url: string, adres: string }[]>([]);
    const [chatbotContext, setChatbotContext] = useState("");
    const [aiPrompt, setAiPrompt] = useState(`Je bent een assistent die websites samenvat voor een vakantie-app. Maak een aantrekkelijke, beknopte samenvatting in HTML-opmaak geschikt voor vakantiegasten.

Gebruik deze HTML-elementen:
- <h3> voor kopjes
- <p> voor alinea's
- <ul><li> voor opsommingen
- <strong> voor belangrijke woorden
- <em> voor sfeervolle beschrijvingen

Houd het kort (max 200 woorden), uitnodigend en informatief. Schrijf in het Nederlands.`);
    const [summarizingIndex, setSummarizingIndex] = useState<number | null>(null);
    const [aiMaxChars, setAiMaxChars] = useState(4000);

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

            setInsights((data.insights || []).map((item: any) => ({ ...item, detailContent: item.detailContent || "" })));

            setVideos(data.videos || []);
            setOmgeving((data as any).omgeving || (data as any).restaurants || []);
            setBookings(data.bookings || []);
            setChatbotContext(data.chatbotContext || "");
            if ((data as any).aiPrompt) setAiPrompt((data as any).aiPrompt);
            if ((data as any).aiMaxChars) setAiMaxChars((data as any).aiMaxChars);
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

    const handleSaveInsights = () => runSaveAction(() => updateInsights(insights), "Home Items succesvol opgeslagen!");
    const handleSaveVideos = () => runSaveAction(() => updateVideos(videos), "Videoinstructies succesvol opgeslagen!");
    const handleSaveOmgeving = () => runSaveAction(async () => {
        await updateOmgeving(omgeving);
        return await updateAiSettings(aiPrompt, aiMaxChars);
    }, "Omgeving succesvol opgeslagen!");
    const handleSaveChatbotContext = () => runSaveAction(() => updateChatbotContext(chatbotContext), "Chatbot context succesvol opgeslagen!");

    const handleAiSummary = async (idx: number) => {
        const tip = omgeving[idx];
        if (!tip.url) return;
        setSummarizingIndex(idx);
        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: tip.url, prompt: aiPrompt, maxChars: aiMaxChars }),
            });
            const data = await res.json();
            if (data.error) {
                alert('❌ ' + data.error);
            } else {
                const n = [...omgeving];
                n[idx].desc = data.summary;
                setOmgeving(n);
            }
        } catch (e) {
            alert('❌ Er ging iets mis bij het ophalen.');
        }
        setSummarizingIndex(null);
    };

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
                        <details style={{ border: "1px solid #4A5D23", borderRadius: "12px", padding: "20px", backgroundColor: "#fcfefc" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#4A5D23", borderBottom: "2px solid #e5ebe5", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>✨ Gepersonaliseerde Gasten Links</summary>
                            <div style={{ marginTop: "15px" }}>
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
                        </details>

                        {/* Sectie: Algemeen */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🏡 Algemene Informatie</summary>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
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
                        </details>

                        {/* Sectie: Home Items */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>📱 Home Pagina Items (Uw verblijf)</summary>
                            <div style={{ marginTop: "15px" }}>
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

                                                    <details style={{ marginTop: "10px", backgroundColor: "#f8f7f2", borderRadius: "8px", padding: "12px" }}>
                                                        <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", color: "#4A5D23" }}>📄 Detailpagina (klik om te bewerken)</summary>
                                                        <p style={{ fontSize: "0.75rem", color: "#888", margin: "8px 0" }}>Als je hier content invult, wordt het item klikbaar in de app en opent het een detailpagina.</p>
                                                        <RichTextEditor content={item.detailContent || ""} onChange={html => { const n = [...insights]; n[idx].detailContent = html; setInsights(n); }} images={availableImages} />
                                                    </details>
                                                </SortableItem>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <button onClick={() => setInsights([...insights, { title: "Nieuw", subtitle: "", icon: "icons/default.png", action: "none", detailContent: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Item Toevoegen</button>
                                        <button onClick={handleSaveInsights} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* Sectie: Videoinstructies */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🎥 Videoinstructies</summary>
                            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
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
                        </details>

                        {/* Sectie: Omgeving */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🌲 Omgeving TIPS</summary>
                            <div style={{ marginTop: "15px" }}>

                                {/* AI Prompt */}
                                <details style={{ marginBottom: "15px", backgroundColor: "#f8f7f2", borderRadius: "8px", padding: "12px" }}>
                                    <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", color: "#4A5D23" }}>🤖 AI Samenvatting Prompt (klik om aan te passen)</summary>
                                    <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", minHeight: "120px", fontFamily: "inherit", fontSize: "0.85rem", marginTop: "10px", lineHeight: "1.5" }} />
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                                        <label style={{ fontSize: "0.85rem", color: "#555", whiteSpace: "nowrap" }}>Max tekens van website:</label>
                                        <input type="number" value={aiMaxChars} onChange={e => setAiMaxChars(Math.max(500, parseInt(e.target.value) || 4000))} min={500} max={15000} step={500} style={{ width: "100px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" }} />
                                        <span style={{ fontSize: "0.75rem", color: "#999" }}>Minder = sneller & goedkoper, meer = uitgebreider</span>
                                    </div>
                                    <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "5px" }}>Deze prompt wordt gebruikt wanneer je op "✨ AI Samenvatting" klikt bij een tip. De AI leest de website en maakt een samenvatting op basis van deze instructie.</p>
                                </details>

                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(omgeving, setOmgeving)}>
                                        <SortableContext items={omgeving.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                            {omgeving.map((tip, idx) => (
                                                <SortableItem key={`omg-${idx}`} id={`item-${idx}`}>
                                                    <button onClick={() => setOmgeving(omgeving.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>

                                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", marginTop: "5px" }}>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Titel</label>
                                                            <input type="text" value={tip.name} onChange={e => { const n = [...omgeving]; n[idx].name = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                                        </div>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Afbeelding</label>
                                                            <select value={tip.image || ""} onChange={e => { const n = [...omgeving]; n[idx].image = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}>
                                                                <option value="">-- Kies een afbeelding --</option>
                                                                {availableImages.map(img => <option key={img} value={img}>{img.split('/').pop()}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Website link (optioneel)</label>
                                                            <input type="text" value={tip.url || ""} onChange={e => { const n = [...omgeving]; n[idx].url = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="https://..." />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>📍 Adres (optioneel)</label>
                                                            <input type="text" value={tip.adres || ""} onChange={e => { const n = [...omgeving]; n[idx].adres = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Straat 1, Plaatsnaam" />
                                                        </div>
                                                    </div>

                                                    <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Bodytekst / Omschrijving</label>
                                                    {tip.url && tip.url.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAiSummary(idx)}
                                                            disabled={summarizingIndex !== null}
                                                            style={{
                                                                marginBottom: "8px",
                                                                padding: "6px 14px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #4A5D23",
                                                                backgroundColor: summarizingIndex === idx ? "#4A5D23" : "#f8f7f2",
                                                                color: summarizingIndex === idx ? "white" : "#4A5D23",
                                                                cursor: summarizingIndex !== null ? "wait" : "pointer",
                                                                fontWeight: "bold",
                                                                fontSize: "0.8rem",
                                                            }}
                                                        >
                                                            {summarizingIndex === idx ? "⏳ Bezig met samenvatten..." : "✨ AI Samenvatting"}
                                                        </button>
                                                    )}
                                                    <RichTextEditor content={tip.desc} onChange={html => { const n = [...omgeving]; n[idx].desc = html; setOmgeving(n); }} />
                                                </SortableItem>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <button onClick={() => setOmgeving([...omgeving, { name: "Nieuwe Tip", desc: "", image: "", url: "", adres: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Tip Toevoegen</button>
                                        <button onClick={handleSaveOmgeving} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                    </div>
                                </div>
                            </div>
                        </details>


                        {/* Sectie: Chatbot Context */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🤖 Chatbot Kennisbank</summary>
                            <div style={{ marginTop: "15px" }}>
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
                        </details>

                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
    updateGeneralInfo, addBooking, updateBooking, removeBooking, fetchAdminData,
    updateInsights, updateVideos, updateOmgevingWithAi,
    updateChatbotContext, updateTranslations, updateExpiredPageContent, updateGames,
    verifyAdminPin
} from "../actions/adminActions";
import NachtregistratieAdminPanel from "../components/NachtregistratieAdminPanel";
import { formatDatumNL } from "../utils/toeristenbelasting";
import { fetchAvailableHeaderImages, fetchAvailableIcons, fetchAvailableThumbnails } from "../actions/assetActions";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "../components/RichTextEditor";

const VISIBILITY_ACCENT: Record<string, { bg: string; border: string; label: string }> = {
    checkin:  { bg: "#eff8ff", border: "#3b82f6", label: "🏠 T/m aankomstdag" },
    checkout: { bg: "#fff7ed", border: "#f97316", label: "🧳 Vertrekdag" },
    nachtregistratie: { bg: "#fdecea", border: "#b3362a", label: "📋 Nachtregistratieformulier" },
};

function SortableItem({ id, children, accent }: { id: string, children: React.ReactNode, accent?: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const accentStyle = accent && VISIBILITY_ACCENT[accent];
    return (
        <div ref={setNodeRef} style={style}>
            <div style={{
                padding: "15px",
                backgroundColor: accentStyle ? accentStyle.bg : "#f4f4f4",
                borderRadius: "8px",
                position: "relative" as const,
                borderLeft: accentStyle ? `4px solid ${accentStyle.border}` : "4px solid transparent",
                boxShadow: accentStyle ? `0 2px 8px ${accentStyle.border}22` : undefined,
            }}>
                {accentStyle && (
                    <span style={{ position: "absolute", top: "10px", left: "22px", fontSize: "0.68rem", fontWeight: "bold", color: accentStyle.border, letterSpacing: "0.3px", pointerEvents: "none" }}>
                        {accentStyle.label}
                    </span>
                )}
                <div {...attributes} {...listeners} style={{ position: "absolute" as const, top: accentStyle ? "28px" : "12px", left: "10px", cursor: "grab", fontSize: "1.2rem", color: "#999", touchAction: "none", userSelect: "none" }} title="Sleep om te herordenen">
                    ☰
                </div>
                <div style={{ marginLeft: "30px", marginTop: accentStyle ? "18px" : "0" }}>
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
    const [keyCode, setKeyCode] = useState("");

    // Dynamic Arrays
    const [games, setGames] = useState<{ id: string, title: string, src: string }[]>([]);
    const [insights, setInsights] = useState<{ icon: string, title: string, subtitle: string, action: string, detailContent?: string, image?: string, widgetCode?: string, hideOnMobile?: boolean, visibility?: string }[]>([]);
    const [videos, setVideos] = useState<{ title: string, thumb: string, url: string, subtitle?: string, leafStyle?: string, leafRotate?: number, leafScale?: number, leafTranslateX?: number, leafTranslateY?: number }[]>([]);
    const [omgeving, setOmgeving] = useState<{ name: string, desc: string, image: string, url: string, adres: string, widgetCode?: string, distance?: string, walkTime?: string, bikeTime?: string, carTime?: string }[]>([]);
    const [chatbotContext, setChatbotContext] = useState("");
    const [expiredPageContent, setExpiredPageContent] = useState("");
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
    const [bookings, setBookings] = useState<{ id: string, guestName: string, checkIn: string, checkOut: string, language?: string, nachtregistratie?: any }[]>([]);
    const [newGuestName, setNewGuestName] = useState("");
    const [newCheckIn, setNewCheckIn] = useState("");
    const [newCheckOut, setNewCheckOut] = useState("");
    const [newLanguage, setNewLanguage] = useState("nl");
    const [newBookingNumber, setNewBookingNumber] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ checkIn: string, checkOut: string, language: string, bookingNumber: string }>({ checkIn: "", checkOut: "", language: "nl", bookingNumber: "" });
    const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
    const [bookingFilter, setBookingFilter] = useState<"nieuw" | "verlopen" | "alle">("nieuw");
    const [bookingSearch, setBookingSearch] = useState("");
    const [staanplaats, setStaanplaats] = useState("");
    const [campingEmail, setCampingEmail] = useState("");

    // CSV import
    const [csvRows, setCsvRows] = useState<{ name: string, checkIn: string, checkOut: string, language: string, isDuplicate?: boolean, overrideDuplicate?: boolean }[]>([]);
    const [importProgress, setImportProgress] = useState<{ done: number, total: number } | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
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
            setKeyCode((data.property as any).keyCode || "");

            setGames((data as any).games || []);
            setInsights((data.insights || []).map((item: any) => ({ ...item, detailContent: item.detailContent || "", widgetCode: item.widgetCode || "" })));

            setVideos(data.videos || []);
            setOmgeving(((data as any).omgeving || (data as any).restaurants || []).map((tip: any) => ({ ...tip, widgetCode: tip.widgetCode || "" })));
            setBookings(data.bookings || []);
            setStaanplaats((data.property as any).staanplaats || "");
            setCampingEmail((data.property as any).campingEmail || "");
            setChatbotContext(data.chatbotContext || "");
            setExpiredPageContent((data as any).expiredPageContent || "");
            if ((data as any).aiPrompt) setAiPrompt((data as any).aiPrompt);
            if ((data as any).aiMaxChars) setAiMaxChars((data as any).aiMaxChars);
        });
    }, []);

    const handleLogin = async () => {
        const ok = await verifyAdminPin(pin);
        if (ok) {
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
        setSaveMessage("⏳ Aan het opslaan...");
        const res = await actionFn();
        setIsSaving(false);
        if (res.success) {
            setSaveMessage("✅ " + successMsg);
            setTimeout(() => setSaveMessage(""), 3500);
        } else {
            setSaveMessage("❌ " + res.error);
            setTimeout(() => setSaveMessage(""), 5000);
        }
    };

    const handleTranslateAll = async () => {
        setIsTranslating(true);
        setSaveMessage("⏳ Bezig met vertalen naar Engels en Duits... (Dit kan 10-30s duren)");
        try {
            const payload = {
                property: { name: propName, subtitle, host: { name: hostName, phone } },
                insights, videos, omgeving, expiredPageContent
                // We omit chatgptContext or bookings
            };
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) {
                setSaveMessage("❌ Vertaalfout: " + data.error);
            } else if (data.en && data.de) {
                const saveRes = await updateTranslations({ en: data.en, de: data.de });
                if (saveRes.success) {
                    setSaveMessage("✅ Succesvol vertaald en gereed voor EN/DE weergave!");
                    setTimeout(() => setSaveMessage(""), 4000);
                } else {
                    setSaveMessage("❌ Opslaan van vertalingen mislukt.");
                    setTimeout(() => setSaveMessage(""), 5000);
                }
            } else {
                setSaveMessage("❌ Ongeldige response van vertaalservice.");
                setTimeout(() => setSaveMessage(""), 5000);
            }
        } catch (e: any) {
            setSaveMessage("❌ Fout: " + e.message);
            setTimeout(() => setSaveMessage(""), 5000);
        }
        setIsTranslating(false);
    };

    const handleSaveGeneral = () => runSaveAction(
        () => updateGeneralInfo(propName, hostName, phone, subtitle, headerImage, keyCode, staanplaats, campingEmail),
        "Algemene info succesvol opgeslagen!"
    );

    const handleSaveGames = () => runSaveAction(() => updateGames(games), "Gameroom succesvol opgeslagen!");
    const handleSaveInsights = () => runSaveAction(() => updateInsights(insights), "Home Items succesvol opgeslagen!");
    const handleSaveVideos = () => runSaveAction(() => updateVideos(videos), "Videoinstructies succesvol opgeslagen!");
    const handleSaveOmgeving = () => runSaveAction(
        () => updateOmgevingWithAi(omgeving, aiPrompt, aiMaxChars),
        "Omgeving succesvol opgeslagen!"
    );
    const handleSaveChatbotContext = () => runSaveAction(() => updateChatbotContext(chatbotContext), "Chatbot context succesvol opgeslagen!");
    const handleSaveExpiredPage = () => runSaveAction(() => updateExpiredPageContent(expiredPageContent), "Verlopen pagina succesvol opgeslagen!");

    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveMessage("⏳ Alles aan het opslaan...");
        const results = await Promise.all([
            updateGeneralInfo(propName, hostName, phone, subtitle, headerImage, keyCode, staanplaats, campingEmail),
            updateGames(games),
            updateInsights(insights),
            updateVideos(videos),
            updateOmgevingWithAi(omgeving, aiPrompt, aiMaxChars),
            updateChatbotContext(chatbotContext),
            updateExpiredPageContent(expiredPageContent)
        ]);
        setIsSaving(false);
        if (results.every(r => r.success)) {
            setSaveMessage("✅ Alle wijzigingen zijn succesvol opgeslagen!");
            setTimeout(() => setSaveMessage(""), 4000);
        } else {
            setSaveMessage("❌ Er is iets misgegaan bij het opslaan van één of meerdere velden.");
            setTimeout(() => setSaveMessage(""), 5000);
        }
    };

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

    const parseDutchDate = (raw: string): string => {
        const s = raw.trim().replace(/\//g, '-');
        const parts = s.split('-');
        if (parts.length !== 3) return '';
        const [a, b, c] = parts;
        // If first part is 4 digits: yyyy-mm-dd already
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        // Otherwise: d-m-yyyy
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            const parsed: typeof csvRows = [];
            for (const line of lines) {
                const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
                const name = cols[0];
                if (!name) continue;

                let checkIn = '', checkOut = '';
                const dateCol = cols[1] || '';

                if (dateCol.includes(' - ')) {
                    // Format: "8-5-2026 - 10-5-2026"
                    const [from, to] = dateCol.split(' - ');
                    checkIn = parseDutchDate(from);
                    checkOut = parseDutchDate(to);
                } else {
                    // Separate columns: cols[1] = checkIn, cols[2] = checkOut
                    checkIn = parseDutchDate(dateCol);
                    checkOut = parseDutchDate(cols[2] || '');
                }

                if (!checkIn || !checkOut) continue;
                // Voorkom dubbele boekingen op basis van gastnaam + aankomstdatum (ongeacht hoofdletters/spaties)
                const isDuplicate = bookings.some(b => b.guestName.trim().toLowerCase() === name.trim().toLowerCase() && b.checkIn === checkIn);

                parsed.push({
                    name,
                    checkIn,
                    checkOut,
                    language: cols[3]?.trim() || 'nl',
                    isDuplicate
                });
            }
            setCsvRows(parsed);
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    const handleImportAll = async () => {
        const validRows = csvRows.filter(r => !r.isDuplicate || r.overrideDuplicate);
        if (!validRows.length) return;
        setImportProgress({ done: 0, total: validRows.length });
        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            await addBooking(row.name, row.checkIn, row.checkOut, row.language);
            setImportProgress({ done: i + 1, total: validRows.length });
        }
        setCsvRows([]);
        setImportProgress(null);
        await refreshBookings();
        const validRowsCount = csvRows.filter(r => !r.isDuplicate || r.overrideDuplicate).length;
        setSaveMessage(`✅ ${validRowsCount} boekingen geïmporteerd!`);
        setTimeout(() => setSaveMessage(""), 4000);
    };

    const refreshBookings = async () => {
        const data = await fetchAdminData();
        setBookings(data.bookings || []);
    };

    const handleAddBooking = async () => {
        if (!newGuestName || !newCheckIn || !newCheckOut) {
            setSaveMessage("❌ Vul alle verplichte boeking velden in.");
            return;
        }
        setIsSaving(true);
        setSaveMessage("⏳ Bezig met toevoegen...");
        const res = await addBooking(newGuestName, newCheckIn, newCheckOut, newLanguage, newBookingNumber);
        setIsSaving(false);
        if (res.success) {
            setSaveMessage("✅ Boeking toegevoegd!");
            setNewGuestName(""); setNewCheckIn(""); setNewCheckOut(""); setNewBookingNumber("");
            await refreshBookings();
            setTimeout(() => setSaveMessage(""), 3000);
        } else {
            setSaveMessage("❌ " + res.error);
            setTimeout(() => setSaveMessage(""), 5000);
        }
    };

    const handleSaveBooking = async () => {
        if (!editingId) return;
        setIsSaving(true);
        setSaveMessage("⏳ Opslaan...");
        const res = await updateBooking(editingId, editValues.checkIn, editValues.checkOut, editValues.language, editValues.bookingNumber);
        setIsSaving(false);
        if (res.success) {
            setSaveMessage("✅ Opgeslagen!");
            setEditingId(null);
            await refreshBookings();
            setTimeout(() => setSaveMessage(""), 3000);
        } else {
            setSaveMessage("❌ " + res.error);
            setTimeout(() => setSaveMessage(""), 5000);
        }
    };

    const handleRemoveBooking = async (id: string) => {
        if (!confirm("Boeking definitief verwijderen?")) return;
        setIsSaving(true);
        setSaveMessage("⏳ Aan het verwijderen...");
        const res = await removeBooking(id);
        setIsSaving(false);
        if (res.success) {
            await refreshBookings();
            setTimeout(() => setSaveMessage(""), 2000);
        } else {
            setSaveMessage("❌ " + res.error);
            setTimeout(() => setSaveMessage(""), 5000);
        }
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
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
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleTranslateAll} disabled={isTranslating} style={{ backgroundColor: "#ffb400", border: "none", borderRadius: "6px", color: "#333", padding: "8px 16px", cursor: isTranslating ? "wait" : "pointer", fontWeight: "bold", opacity: isTranslating ? 0.7 : 1 }}>
                            {isTranslating ? "⏳ Vertalen..." : "🌟 Vertaal"}
                        </button>
                        <button onClick={handleLogout} style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", color: "white", padding: "8px 16px", cursor: "pointer", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                            Uitloggen
                        </button>
                    </div>
                </div>

                <div style={{ padding: "30px" }}>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes toastSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        @keyframes toastFade { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
                    `}} />
                    {saveMessage && (
                        <div style={{
                            position: "fixed",
                            bottom: "40px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 99999,
                            backgroundColor: saveMessage.includes("❌") ? "rgba(220, 38, 38, 0.9)" : "rgba(40, 40, 40, 0.85)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            color: "white",
                            padding: "14px 28px",
                            borderRadius: "50px",
                            fontWeight: "bold",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            animation: "toastFade 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
                        }}>
                            {saveMessage.includes("⏳") && (
                                <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "toastSpin 1s linear infinite" }} />
                            )}
                            <span style={{ fontSize: "1rem", letterSpacing: "0.2px" }}>{saveMessage.replace("⏳ ", "")}</span>
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
                                        <div style={{ flex: "1 1 140px" }}>
                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Boekingsnummer</label>
                                            <input type="text" value={newBookingNumber} onChange={e => setNewBookingNumber(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Voyando-nr" />
                                        </div>
                                        <div style={{ flex: "1 1 120px" }}>
                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Aankomst</label>
                                            <input type="date" value={newCheckIn} onChange={e => setNewCheckIn(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                        </div>
                                        <div style={{ flex: "1 1 120px" }}>
                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Vertrek</label>
                                            <input type="date" value={newCheckOut} onChange={e => setNewCheckOut(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                        </div>
                                        <div style={{ flex: "1 1 120px" }}>
                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Weergavetaal</label>
                                            <select value={newLanguage} onChange={e => setNewLanguage(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "white" }}>
                                                <option value="nl">🇳🇱 Nederlands</option>
                                                <option value="en">🇬🇧 Engels</option>
                                                <option value="de">🇩🇪 Duits</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={handleAddBooking} disabled={isSaving} style={{ marginTop: "15px", backgroundColor: "#4A5D23", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Genereer Link</button>
                                </div>

                                {/* CSV Import */}
                                <div style={{ marginBottom: "20px", backgroundColor: "white", padding: "15px", borderRadius: "8px", border: "1px dashed #bbb" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                                        <div>
                                            <strong style={{ fontSize: "0.95rem", color: "#333" }}>📂 Importeer uit CSV</strong>
                                            <p style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px" }}>Kolommen (puntkomma): <strong>Naam;d-m-jjjj - d-m-jjjj</strong> · ook los per kolom ondersteund · optioneel: taal</p>
                                        </div>
                                        <label style={{ backgroundColor: "#f0f0f0", color: "#333", padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", whiteSpace: "nowrap" }}>
                                            Kies CSV-bestand
                                            <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} style={{ display: "none" }} />
                                        </label>
                                    </div>

                                    {csvRows.length > 0 && (
                                        <div style={{ marginTop: "12px" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                                                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Naam</th>
                                                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Aankomst</th>
                                                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Vertrek</th>
                                                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Taal</th>
                                                        <th style={{ padding: "6px 8px", borderBottom: "1px solid #ddd" }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvRows.map((row, i) => {
                                                        const isIgnored = row.isDuplicate && !row.overrideDuplicate;
                                                        return (
                                                            <tr key={i} style={{ borderBottom: "1px solid #eee", backgroundColor: isIgnored ? "#fafafa" : "transparent" }}>
                                                                <td style={{ padding: "8px 0", color: isIgnored ? "#aaa" : "#333", textDecoration: isIgnored ? "line-through" : "none" }}>
                                                                    {row.name} 
                                                                    {row.isDuplicate && (
                                                                        <button 
                                                                            onClick={() => { const n = [...csvRows]; n[i].overrideDuplicate = !n[i].overrideDuplicate; setCsvRows(n); }}
                                                                            style={{ fontSize: "0.7rem", backgroundColor: row.overrideDuplicate ? "#e8f5e9" : "#f0f0f0", color: row.overrideDuplicate ? "#2e7d32" : "#999", padding: "2px 6px", borderRadius: "8px", marginLeft: "4px", border: `1px solid ${row.overrideDuplicate ? "#c8e6c9" : "#e0e0e0"}`, cursor: "pointer", outline: "none" }}
                                                                        >
                                                                            {row.overrideDuplicate ? "Dubbel, toch toevoegen" : "Dubbel"}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: "8px 0", color: isIgnored ? "#aaa" : "#666" }}>{formatDatumNL(row.checkIn)} - {formatDatumNL(row.checkOut)}</td>
                                                                <td style={{ padding: "8px 0", color: isIgnored ? "#aaa" : "#666" }}>{row.language.toUpperCase()}</td>
                                                                <td style={{ padding: "8px", textAlign: "right" }}>
                                                                    <button onClick={() => setCsvRows(r => r.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: "0.85rem", opacity: isIgnored ? 0.5 : 1 }}>✕</button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                                                {importProgress ? (
                                                    <span style={{ fontSize: "0.85rem", color: "#4A5D23" }}>⏳ {importProgress.done} / {importProgress.total} aangemaakt…</span>
                                                ) : (
                                                    <>
                                                        <button onClick={handleImportAll} style={{ backgroundColor: "#4A5D23", color: "white", padding: "8px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                                                            + Genereer {csvRows.filter(r => !r.isDuplicate || r.overrideDuplicate).length} links
                                                        </button>
                                                        <button onClick={() => setCsvRows([])} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "0.85rem" }}>Annuleer</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Filter: nieuw / verlopen / alle */}
                                <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                    {(["nieuw", "verlopen", "alle"] as const).map(f => {
                                        const count = f === "alle" ? bookings.length : bookings.filter(b => (new Date(b.checkOut + "T12:00:00") < new Date()) === (f === "verlopen")).length;
                                        return (
                                            <button key={f} onClick={() => setBookingFilter(f)} style={{ padding: "6px 14px", borderRadius: "20px", border: bookingFilter === f ? "1px solid #4A5D23" : "1px solid #ddd", backgroundColor: bookingFilter === f ? "#4A5D23" : "white", color: bookingFilter === f ? "white" : "#666", fontSize: "0.82rem", fontWeight: "bold", cursor: "pointer" }}>
                                                {f === "nieuw" ? "Nieuw" : f === "verlopen" ? "Verlopen" : "Alle"} ({count})
                                            </button>
                                        );
                                    })}
                                    <input type="text" value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} placeholder="🔍 Zoek op naam..." style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid #ddd", fontSize: "0.82rem", flex: "1 1 160px", minWidth: "140px" }} />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {[...bookings].sort((a, b) => a.checkOut.localeCompare(b.checkOut)).filter(b => bookingFilter === "alle" || (new Date(b.checkOut + "T12:00:00") < new Date()) === (bookingFilter === "verlopen")).filter(b => b.guestName.toLowerCase().includes(bookingSearch.trim().toLowerCase())).map((booking) => {
                                        const shareUrl = `${window.location.origin}/b/${booking.id}`;
                                        const isEditing = editingId === booking.id;
                                        const isExpired = new Date(booking.checkOut + "T12:00:00") < new Date();
                                        const reg = (booking as any).nachtregistratie;
                                        const regStatus: "leeg" | "ingevuld" | "verstuurd" = !reg ? "leeg" : reg.status;
                                        const regBadge = {
                                            leeg: { label: "Formulier leeg", bg: "#f0f0f0", color: "#888" },
                                            ingevuld: { label: "Ingevuld", bg: "#fef3c7", color: "#92400e" },
                                            verstuurd: { label: "Verstuurd ✓", bg: "#dcfce7", color: "#166534" },
                                        }[regStatus];
                                        const isRegExpanded = expandedRegId === booking.id;
                                        return (
                                            <div key={booking.id} style={{ padding: "12px", backgroundColor: isExpired && !isEditing ? "#fafafa" : "white", borderRadius: "8px", border: isEditing ? "1px solid #4A5D23" : isExpired ? "1px solid #e0e0e0" : "1px solid #eee", opacity: isExpired && !isEditing ? 0.75 : 1, transition: "opacity 0.2s" }}>
                                                {/* Header: naam + actieknoppen */}
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isEditing ? "12px" : "4px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                        <button onClick={() => setExpandedRegId(isRegExpanded ? null : booking.id)} title="Nachtregistratieformulier" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "#4A5D23", padding: "0 2px", transform: isRegExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</button>
                                                        <strong style={{ color: isExpired ? "#999" : "#333" }}>{booking.guestName}</strong>
                                                        <span style={{ fontSize: "0.7rem", backgroundColor: regBadge.bg, color: regBadge.color, padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>{regBadge.label}</span>
                                                        {isExpired && !isEditing && <span style={{ fontSize: "0.7rem", backgroundColor: "#f0f0f0", color: "#999", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>Verlopen</span>}
                                                    </div>
                                                    <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "10px" }}>
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={handleSaveBooking} disabled={isSaving} style={{ backgroundColor: "#4A5D23", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}>Opslaan</button>
                                                                <button onClick={() => setEditingId(null)} style={{ backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Annuleer</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setEditingId(booking.id); setEditValues({ checkIn: booking.checkIn, checkOut: booking.checkOut, language: booking.language || "nl", bookingNumber: booking.id }); }} style={{ backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Bewerk</button>
                                                                <button onClick={() => !isExpired && copyToClipboard(shareUrl, booking.id)} disabled={isExpired} style={{ backgroundColor: isExpired ? "#f0f0f0" : copiedId === booking.id ? "#4A5D23" : "#e0e0e0", color: isExpired ? "#bbb" : copiedId === booking.id ? "white" : "#333", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: isExpired ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: "bold", transition: "all 0.2s" }}>{copiedId === booking.id ? "✓ Gekopieerd" : "Kopieer"}</button>
                                                                <button onClick={() => handleRemoveBooking(booking.id)} style={{ backgroundColor: "#fee", color: "#c00", border: "1px solid #ecc", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "0.85rem" }}>Verwijder</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isEditing ? (
                                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                                        <div style={{ flex: "1 1 130px" }}>
                                                            <label style={{ display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" }}>Boekingsnummer</label>
                                                            <input type="text" value={editValues.bookingNumber} onChange={e => setEditValues(v => ({ ...v, bookingNumber: e.target.value }))} placeholder="Bijv: 12345 (Voyando)" style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" }} />
                                                        </div>
                                                        <div style={{ flex: "1 1 130px" }}>
                                                            <label style={{ display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" }}>Aankomst</label>
                                                            <input type="date" value={editValues.checkIn} onChange={e => setEditValues(v => ({ ...v, checkIn: e.target.value }))} style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" }} />
                                                        </div>
                                                        <div style={{ flex: "1 1 130px" }}>
                                                            <label style={{ display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" }}>Vertrek</label>
                                                            <input type="date" value={editValues.checkOut} onChange={e => setEditValues(v => ({ ...v, checkOut: e.target.value }))} style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.85rem" }} />
                                                        </div>
                                                        <div style={{ flex: "1 1 130px" }}>
                                                            <label style={{ display: "block", fontSize: "0.78rem", color: "#555", marginBottom: "4px" }}>Taal</label>
                                                            <select value={editValues.language} onChange={e => setEditValues(v => ({ ...v, language: e.target.value }))} style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "white", fontSize: "0.85rem" }}>
                                                                <option value="nl">🇳🇱 Nederlands</option>
                                                                <option value="en">🇬🇧 Engels</option>
                                                                <option value="de">🇩🇪 Duits</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span style={{ fontSize: "0.85rem", color: isExpired ? "#aaa" : "#777" }}>{formatDatumNL(booking.checkIn)} t/m {formatDatumNL(booking.checkOut)}</span>
                                                        {booking.language && booking.language !== "nl" && <span style={{ fontSize: "0.8rem", color: "#888", marginLeft: "10px" }}>{booking.language === "en" ? "🇬🇧" : "🇩🇪"}</span>}
                                                        <div style={{ fontSize: "0.85rem", color: isExpired ? "#bbb" : "#4A5D23", marginTop: "4px", wordBreak: "break-all", textDecoration: isExpired ? "line-through" : "none" }}>{shareUrl}</div>
                                                    </div>
                                                )}
                                                {isRegExpanded && (
                                                    <NachtregistratieAdminPanel
                                                        key={`${booking.id}-${regStatus}`}
                                                        booking={booking as any}
                                                        onSaved={refreshBookings}
                                                        setToast={setSaveMessage}
                                                    />
                                                )}
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
                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                        {headerImage && (
                                            <img src={`/${headerImage}`} alt="Preview" style={{ width: "120px", height: "120px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                                        )}
                                        <select value={headerImage} onChange={e => setHeaderImage(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                            <option value="">-- Geen afbeelding --</option>
                                            {availableImages.map((img, i) => (
                                                <option key={i} value={img}>{img}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Subtitel (boven de naam, bijv. "Welkom terug")</label>
                                    <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Sleutelcode <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: "normal" }}>(beschikbaar als <code>@sleutelcode</code>)</span></label>
                                    <input type="text" value={keyCode} onChange={e => setKeyCode(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Bijv: 1234#" />
                                </div>
                                <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "15px" }}>
                                    <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>📋 Voor het nachtregistratieformulier van 't Veluws Hof: Naam Huisje en WhatsApp Nummer hierboven gaan ook mee als verhuurdergegevens in de PDF naar de camping.</p>
                                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                        <div style={{ flex: "1 1 220px" }}>
                                            <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>Staanplaats accommodatie</label>
                                            <input type="text" value={staanplaats} onChange={e => setStaanplaats(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                        </div>
                                        <div style={{ flex: "1 1 220px" }}>
                                            <label style={{ display: "block", fontSize: "0.9rem", color: "#555", marginBottom: "5px" }}>E-mailadres camping (ontvanger nachtregistratie)</label>
                                            <input type="email" value={campingEmail} onChange={e => setCampingEmail(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSaveGeneral} disabled={isSaving} style={{ alignSelf: "flex-end", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                            </div>
                        </details>

                        {/* Sectie: Home Items */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>📱 Home Pagina Items (Uw verblijf)</summary>
                            <div style={{ marginTop: "15px" }}>
                                <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>Variabelen: <code>@aankomst</code>, <code>@vertrek</code>, <code>@naamgast</code>, <code>@sleutelcode</code>.</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(insights, setInsights)}>
                                        <SortableContext items={insights.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                            {insights.map((item, idx) => (
                                                <SortableItem key={`insight-${idx}`} id={`item-${idx}`} accent={item.visibility && item.visibility !== "always" ? item.visibility : undefined}>
                                                    <button onClick={() => setInsights(insights.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>

                                                    <div style={{ position: "absolute", top: "10px", right: "115px", display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: item.hideOnMobile ? "#c0392b" : "#999", cursor: "pointer", userSelect: "none" }}>
                                                            <input type="checkbox" checked={!!item.hideOnMobile} onChange={e => { const n = [...insights]; n[idx] = { ...n[idx], hideOnMobile: e.target.checked }; setInsights(n); }} style={{ accentColor: "#c0392b" }} />
                                                            Verberg op mobiel
                                                        </label>
                                                        <select
                                                            value={item.visibility || "always"}
                                                            onChange={e => {
                                                                const n = [...insights];
                                                                const nieuweVisibility = e.target.value;
                                                                const iconNogNietGezet = !n[idx].icon || n[idx].icon === "icons/default.png";
                                                                n[idx] = {
                                                                    ...n[idx],
                                                                    visibility: nieuweVisibility,
                                                                    icon: nieuweVisibility === "nachtregistratie" && iconNogNietGezet ? "icons/clipboard.svg" : n[idx].icon,
                                                                };
                                                                setInsights(n);
                                                            }}
                                                            style={{ padding: "3px 6px", borderRadius: "4px", border: `1px solid ${item.visibility && item.visibility !== "always" ? "#4A5D23" : "#ccc"}`, fontSize: "0.75rem", color: item.visibility && item.visibility !== "always" ? "#4A5D23" : "#888", backgroundColor: item.visibility && item.visibility !== "always" ? "#f6faf0" : "white", cursor: "pointer" }}
                                                            title="Wanneer zichtbaar?"
                                                        >
                                                            <option value="always">👁 Altijd</option>
                                                            <option value="checkin">🏠 T/m aankomstdag</option>
                                                            <option value="checkout">🧳 Vertrekdag (+ avond ervoor)</option>
                                                            <option value="nachtregistratie">📋 Nachtregistratieformulier</option>
                                                        </select>
                                                    </div>

                                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", marginTop: "5px" }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Titel</label>
                                                            <input type="text" value={item.title} onChange={e => { const n = [...insights]; n[idx].title = e.target.value; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Icoon</label>
                                                            <select value={item.icon} onChange={e => { const n = [...insights]; n[idx].icon = e.target.value; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                                <option value={item.icon}>{item.icon} (huidig)</option>
                                                                {availableIcons.map((ic, i) => <option key={i} value={ic}>{ic}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: "10px" }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Afbeelding</label>
                                                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                            {item.image && (
                                                                <img src={`/${item.image}`} alt="Preview" style={{ width: "120px", height: "120px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                                                            )}
                                                            <select value={item.image || ""} onChange={e => { const n = [...insights]; n[idx] = { ...n[idx], image: e.target.value }; setInsights(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                                <option value="">-- Geen afbeelding --</option>
                                                                {availableImages.map((img, i) => {
                                                                    const name = img.split('/').pop() || '';
                                                                    const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
                                                                    return <option key={i} value={img}>{nameWithoutExt}</option>;
                                                                })}
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
                                        <button onClick={() => setInsights([...insights, { title: "Nieuw", subtitle: "", icon: "icons/default.png", action: "none", detailContent: "", image: "", widgetCode: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Item Toevoegen</button>
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
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Korte Beschrijving (Optioneel)</label>
                                                        <input type="text" value={vid.subtitle || ""} onChange={e => { const n = [...videos]; n[idx].subtitle = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="Verdere uitleg over de video" />
                                                    </div>
                                                    <div style={{ flex: 0.8 }}>
                                                        <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Blad Decoratie</label>
                                                        <select value={vid.leafStyle || ['leaf-oak', 'leaf-maple', 'leaf-monstera', 'leaf-birch', 'leaf-chestnut', 'leaf-beech'][idx % 6]} onChange={e => { const n = [...videos]; n[idx].leafStyle = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                            <option value="leaf-oak">🍂 Eikenblad (Herfst Bruin)</option>
                                                            <option value="leaf-maple">🍁 Esdoornblad (Warm Oranje)</option>
                                                            <option value="leaf-monstera">🌿 Monstera (Diepgroen)</option>
                                                            <option value="leaf-birch">🍃 Berkenblad (Zomer Groen)</option>
                                                            <option value="leaf-chestnut">🌰 Kastanjeblad (Zomer Groen)</option>
                                                            <option value="leaf-beech">🍁 Beukenblad (Diep Rood/Paars)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <details style={{ marginBottom: "10px", backgroundColor: "#f9f9f9", padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}>
                                                    <summary style={{ fontSize: "0.85rem", color: "#555", cursor: "pointer", fontWeight: "bold", outline: "none" }}>🎛️ Blad Positie (Geavanceerd)</summary>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                                                        {(() => {
                                                            const s = vid.leafStyle || ['leaf-oak', 'leaf-maple', 'leaf-monstera', 'leaf-birch', 'leaf-chestnut', 'leaf-beech'][idx % 6];
                                                            const defs = s === 'leaf-oak' ? { r: 200, s: 1, tx: -30, ty: 15 }
                                                                : s === 'leaf-birch' ? { r: 290, s: 1.2, tx: 0, ty: 15 }
                                                                    : s === 'leaf-beech' ? { r: 290, s: 1.2, tx: 0, ty: 15 }
                                                                        : { r: 0, s: 1, tx: 0, ty: 0 };
                                                            return (
                                                                <>
                                                                    <div>
                                                                        <label style={{ display: "block", fontSize: "0.75rem", color: "#666" }}>Rotatie: {vid.leafRotate ?? defs.r}°</label>
                                                                        <input type="range" min="0" max="360" value={vid.leafRotate ?? defs.r} onChange={e => { const n = [...videos]; n[idx].leafRotate = parseInt(e.target.value); setVideos(n); }} style={{ width: "100%", margin: "0" }} />
                                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#999" }}><span>↶ Links</span><span>Rechts ↷</span></div>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: "block", fontSize: "0.75rem", color: "#666" }}>Grootte: {vid.leafScale ?? defs.s}</label>
                                                                        <input type="range" min="0.5" max="2.5" step="0.1" value={vid.leafScale ?? defs.s} onChange={e => { const n = [...videos]; n[idx].leafScale = parseFloat(e.target.value); setVideos(n); }} style={{ width: "100%", margin: "0" }} />
                                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#999" }}><span>Klein</span><span>Groot</span></div>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: "block", fontSize: "0.75rem", color: "#666" }}>Horizontaal: {vid.leafTranslateX ?? defs.tx}%</label>
                                                                        <input type="range" min="-100" max="100" value={vid.leafTranslateX ?? defs.tx} onChange={e => { const n = [...videos]; n[idx].leafTranslateX = parseInt(e.target.value); setVideos(n); }} style={{ width: "100%", margin: "0" }} />
                                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#999" }}><span>← Links</span><span>Rechts →</span></div>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: "block", fontSize: "0.75rem", color: "#666" }}>Verticaal: {vid.leafTranslateY ?? defs.ty}%</label>
                                                                        <input type="range" min="-100" max="100" value={vid.leafTranslateY ?? defs.ty} onChange={e => { const n = [...videos]; n[idx].leafTranslateY = parseInt(e.target.value); setVideos(n); }} style={{ width: "100%", margin: "0" }} />
                                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#999" }}><span>↑ Boven</span><span>Onder ↓</span></div>
                                                                    </div>
                                                                    <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
                                                                        {(vid.leafRotate !== undefined || vid.leafScale !== undefined || vid.leafTranslateX !== undefined || vid.leafTranslateY !== undefined) &&
                                                                            <button onClick={() => { const n = [...videos]; delete n[idx].leafRotate; delete n[idx].leafScale; delete n[idx].leafTranslateX; delete n[idx].leafTranslateY; setVideos(n); }} style={{ fontSize: "0.7rem", backgroundColor: "#fff", border: "1px solid #ccc", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>↺ Reset naar standaard</button>
                                                                        }
                                                                    </div>
                                                                </>
                                                            )
                                                        })()}
                                                    </div>
                                                </details>

                                                <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>YouTube URL</label>
                                                <input type="text" value={vid.url} onChange={e => { const n = [...videos]; n[idx].url = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "10px" }} placeholder="https://youtube.com/..." />

                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Thumbnail (uit `/public/images`)</label>
                                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                        {vid.thumb && (
                                                            <img src={`/${vid.thumb}`} alt="Preview" style={{ width: "80px", height: "80px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                                                        )}
                                                        <select value={vid.thumb} onChange={e => { const n = [...videos]; n[idx].thumb = e.target.value; setVideos(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", outline: "none" }}>
                                                            <option value="">-- Geen thumbnail --</option>
                                                            {availableImages.map((img, i) => {
                                                                const name = img.split('/').pop() || '';
                                                                const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
                                                                return <option key={i} value={img}>{nameWithoutExt}</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            </SortableItem>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <button onClick={() => setVideos([...videos, { title: "Nieuwe Video", subtitle: "", thumb: "images/default.jpg", url: "", leafStyle: "leaf-oak" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Video Toevoegen</button>
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
                                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                                {tip.image && (
                                                                    <img src={`/${tip.image}`} alt="Preview" style={{ width: "120px", height: "120px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                                                                )}
                                                                <select value={tip.image || ""} onChange={e => { const n = [...omgeving]; n[idx].image = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}>
                                                                    <option value="">-- Geen afbeelding --</option>
                                                                    {availableImages.map(img => {
                                                                        const name = img.split('/').pop() || '';
                                                                        const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
                                                                        return <option key={img} value={img}>{nameWithoutExt}</option>;
                                                                    })}
                                                                </select>
                                                            </div>
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

                                                    <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                                                        <div style={{ flex: 1, minWidth: "120px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>🧭 Afstand (bijv: 1,3)</label>
                                                            <input type="text" value={tip.distance || ""} onChange={e => { const n = [...omgeving]; n[idx].distance = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="1,3" />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: "120px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>🚶 Lopen (min)</label>
                                                            <input type="text" value={tip.walkTime || ""} onChange={e => { const n = [...omgeving]; n[idx].walkTime = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="15" />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: "120px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>🚲 Fiets (min)</label>
                                                            <input type="text" value={tip.bikeTime || ""} onChange={e => { const n = [...omgeving]; n[idx].bikeTime = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="6" />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: "120px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>🚗 Auto (min)</label>
                                                            <input type="text" value={tip.carTime || ""} onChange={e => { const n = [...omgeving]; n[idx].carTime = e.target.value; setOmgeving(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="4" />
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
                                        <button onClick={() => setOmgeving([...omgeving, { name: "Nieuwe Tip", desc: "", image: "", url: "", adres: "", widgetCode: "", distance: "", walkTime: "", bikeTime: "", carTime: "" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Tip Toevoegen</button>
                                        <button onClick={handleSaveOmgeving} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                    </div>
                                </div>
                            </div>
                        </details>


                        {/* Sectie: Verlopen Boeking Pagina */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>⏰ Verlopen Boeking Pagina</summary>
                            <div style={{ marginTop: "15px" }}>
                                <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>Deze pagina wordt getoond wanneer een gast zijn/haar link opent nadat de vertrekdatum is verstreken. Gebruik de editor om een persoonlijke boodschap samen te stellen.</p>
                                <RichTextEditor content={expiredPageContent} onChange={setExpiredPageContent} images={availableImages} />
                                <button onClick={handleSaveExpiredPage} disabled={isSaving} style={{ marginTop: "10px", alignSelf: "flex-end", backgroundColor: "#333", color: "white", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                            </div>
                        </details>


                        {/* Sectie: Gameroom */}
                        <details style={{ border: "1px solid #eee", borderRadius: "12px", padding: "20px" }}>
                            <summary style={{ fontSize: "1.3rem", color: "#333", borderBottom: "2px solid #eee", paddingBottom: "10px", cursor: "pointer", fontWeight: "bold", listStylePosition: "inside", outline: "none" }}>🎮 Gameroom</summary>
                            <div style={{ marginTop: "15px" }}>
                                <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px" }}>Beheer de spellen in de gameroom. De ID wordt gebruikt in de URL (bijv. <code>tetris</code> → <code>/gameroom/tetris</code>). Het pad verwijst naar het HTML-bestand in <code>/public</code>.</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragEnd(games, setGames)}>
                                        <SortableContext items={games.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
                                            {games.map((game, idx) => (
                                                <SortableItem key={`game-${idx}`} id={`item-${idx}`}>
                                                    <button onClick={() => setGames(games.filter((_, i) => i !== idx))} style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#d9534f", color: "white", border: "none", borderRadius: "4px", padding: "5px 10px", cursor: "pointer", fontSize: "0.8rem" }}>X Verwijder</button>
                                                    <div style={{ display: "flex", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
                                                        <div style={{ flex: "1 1 120px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>ID (URL-slug)</label>
                                                            <input type="text" value={game.id} onChange={e => { const n = [...games]; n[idx] = { ...n[idx], id: e.target.value.toLowerCase().replace(/\s+/g, '-') }; setGames(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "monospace" }} placeholder="bijv: tetris" />
                                                        </div>
                                                        <div style={{ flex: "1 1 150px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Naam</label>
                                                            <input type="text" value={game.title} onChange={e => { const n = [...games]; n[idx] = { ...n[idx], title: e.target.value }; setGames(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }} placeholder="bijv: Tetris" />
                                                        </div>
                                                        <div style={{ flex: "2 1 250px" }}>
                                                            <label style={{ display: "block", fontSize: "0.85rem", color: "#555", marginBottom: "5px" }}>Pad naar HTML-bestand</label>
                                                            <input type="text" value={game.src} onChange={e => { const n = [...games]; n[idx] = { ...n[idx], src: e.target.value }; setGames(n); }} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "monospace" }} placeholder="/Gameroom/tetris/index.html" />
                                                        </div>
                                                    </div>
                                                </SortableItem>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <button onClick={() => setGames([...games, { id: "", title: "Nieuw Spel", src: "/Gameroom//index.html" }])} style={{ backgroundColor: "#e0e0e0", color: "#333", padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>+ Spel Toevoegen</button>
                                        <button onClick={handleSaveGames} disabled={isSaving} style={{ backgroundColor: "#333", color: "white", padding: "10px 30px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Opslaan</button>
                                    </div>
                                </div>
                            </div>
                        </details>

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

            {/* Zwevende Alle Wijzigingen Opslaan Knop */}
            <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="hover:scale-105 transition-transform"
                style={{
                    position: "fixed",
                    bottom: "40px",
                    right: "30px",
                    backgroundColor: "#4A5D23",
                    color: "white",
                    padding: "16px 28px",
                    borderRadius: "50px",
                    border: "3px solid rgba(255,255,255,0.2)",
                    cursor: isSaving ? "wait" : "pointer",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    boxShadow: "0 10px 25px rgba(74, 93, 35, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    zIndex: 9998,
                    opacity: isSaving ? 0.7 : 1
                }}
            >
                {/* @ts-ignore */}
                <ion-icon name="save-outline" style={{ fontSize: "1.4rem" }}></ion-icon>
                Alles Opslaan
            </button>
        </div>
    );
}

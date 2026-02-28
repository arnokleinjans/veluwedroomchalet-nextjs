"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { useEffect } from "react";

const btn = (active: boolean) => ({
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: active ? "#4A5D23" : "#fff",
    color: active ? "#fff" : "#333",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "bold" as const,
    minWidth: "28px",
});

const sep = { width: "1px", height: "20px", backgroundColor: "#ddd", margin: "0 4px" };

const COLORS = [
    { label: "Zwart", value: "#000000" },
    { label: "Groen", value: "#4A5D23" },
    { label: "Bruin", value: "#8B5A2B" },
    { label: "Rood", value: "#c0392b" },
    { label: "Blauw", value: "#2980b9" },
    { label: "Grijs", value: "#7f8c8d" },
];

const HIGHLIGHTS = [
    { label: "Geel", value: "#fef9c3" },
    { label: "Groen", value: "#dcfce7" },
    { label: "Blauw", value: "#dbeafe" },
    { label: "Roze", value: "#fce7f3" },
];

function Toolbar({ editor }: { editor: any }) {
    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt("URL invoeren:");
        if (url) {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
    };

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", padding: "8px", borderBottom: "1px solid #ddd", alignItems: "center" }}>
            {/* Undo / Redo */}
            <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} style={{ ...btn(false), opacity: editor.can().undo() ? 1 : 0.4 }}>↩️</button>
            <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} style={{ ...btn(false), opacity: editor.can().redo() ? 1 : 0.4 }}>↪️</button>

            <div style={sep} />

            {/* Tekst opmaak */}
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive("bold"))}>B</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive("italic"))}>I</button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btn(editor.isActive("strike"))}>S̶</button>

            <div style={sep} />

            {/* Kopjes */}
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btn(editor.isActive("heading", { level: 3 }))}>H3</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} style={btn(editor.isActive("heading", { level: 4 }))}>H4</button>

            <div style={sep} />

            {/* Lijsten */}
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive("bulletList"))}>• Lijst</button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive("orderedList"))}>1. Lijst</button>
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btn(editor.isActive("blockquote"))}>❝ Citaat</button>

            <div style={sep} />

            {/* Uitlijning */}
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} style={btn(editor.isActive({ textAlign: "left" }))}>⬅</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} style={btn(editor.isActive({ textAlign: "center" }))}>⬛</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} style={btn(editor.isActive({ textAlign: "right" }))}>➡</button>

            <div style={sep} />

            {/* Kleur */}
            <select
                onChange={e => { if (e.target.value === "reset") { editor.chain().focus().unsetColor().run(); } else { editor.chain().focus().setColor(e.target.value).run(); } e.target.value = ""; }}
                style={{ padding: "4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.8rem", cursor: "pointer" }}
                defaultValue=""
            >
                <option value="" disabled>🎨 Kleur</option>
                {COLORS.map(c => <option key={c.value} value={c.value} style={{ color: c.value }}>● {c.label}</option>)}
                <option value="reset">✕ Geen kleur</option>
            </select>

            {/* Markering */}
            <select
                onChange={e => { if (e.target.value === "reset") { editor.chain().focus().unsetHighlight().run(); } else { editor.chain().focus().toggleHighlight({ color: e.target.value }).run(); } e.target.value = ""; }}
                style={{ padding: "4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.8rem", cursor: "pointer" }}
                defaultValue=""
            >
                <option value="" disabled>🖍️ Markeer</option>
                {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>■ {h.label}</option>)}
                <option value="reset">✕ Geen markering</option>
            </select>

            <div style={sep} />

            {/* Link */}
            <button type="button" onClick={addLink} style={btn(editor.isActive("link"))}>🔗 Link</button>
            {editor.isActive("link") && (
                <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} style={btn(false)}>❌</button>
            )}

            {/* Horizontale lijn */}
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} style={btn(false)}>— Lijn</button>

            <div style={sep} />

            {/* Tabel */}
            <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} style={btn(false)}>📊 Tabel</button>
            {editor.isActive("table") && (
                <>
                    <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} style={btn(false)}>+ Kolom</button>
                    <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} style={btn(false)}>− Kolom</button>
                    <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} style={btn(false)}>+ Rij</button>
                    <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} style={btn(false)}>− Rij</button>
                    <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} style={{ ...btn(false), borderColor: "#d9534f", color: "#d9534f" }}>🗑️ Tabel</button>
                </>
            )}
        </div>
    );
}

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (html: string) => void }) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
        ],
        content: content || "",
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync external content changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || "");
        }
    }, [content]);

    return (
        <div style={{ border: "1px solid #ccc", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}>
            <Toolbar editor={editor} />
            <EditorContent
                editor={editor}
                style={{ padding: "12px", minHeight: "150px" }}
            />
            <style>{`
                .tiptap { outline: none; }
                .tiptap h3 { font-size: 1.1rem !important; color: #4A5D23 !important; margin: 8px 0 4px !important; font-weight: bold !important; }
                .tiptap h4 { font-size: 1rem !important; color: #555 !important; margin: 8px 0 4px !important; font-weight: bold !important; }
                .tiptap p { margin: 4px 0 !important; line-height: 1.6 !important; }
                .tiptap ul { padding-left: 20px !important; margin: 4px 0 !important; list-style-type: disc !important; }
                .tiptap ol { padding-left: 20px !important; margin: 4px 0 !important; list-style-type: decimal !important; }
                .tiptap li { display: list-item !important; }
                .tiptap li p { display: inline !important; }
                .tiptap a { color: #4A5D23 !important; text-decoration: underline !important; }
                .tiptap blockquote { border-left: 3px solid #4A5D23 !important; padding-left: 12px !important; margin: 8px 0 !important; color: #555 !important; font-style: italic !important; }
                .tiptap hr { border: none !important; border-top: 2px solid #ddd !important; margin: 12px 0 !important; }
                .tiptap mark { border-radius: 3px; padding: 1px 3px; }
                .tiptap table { border-collapse: collapse !important; width: 100% !important; margin: 8px 0 !important; display: table !important; }
                .tiptap thead { display: table-header-group !important; }
                .tiptap tbody { display: table-row-group !important; }
                .tiptap tr { display: table-row !important; }
                .tiptap th, .tiptap td { border: 1px solid #ccc !important; padding: 6px 10px !important; text-align: left !important; display: table-cell !important; }
                .tiptap th { background-color: #f0efe8 !important; font-weight: bold !important; }
            `}</style>
        </div>
    );
}

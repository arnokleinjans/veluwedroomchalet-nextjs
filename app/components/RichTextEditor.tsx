"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Node, mergeAttributes, Extension } from "@tiptap/core";
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
import { Image } from "@tiptap/extension-image";
import { useEffect, useState, useMemo } from "react";

// Custom extension to add fontSize attribute to TextStyle
const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
        return [{
            types: ['textStyle'],
            attributes: {
                fontSize: {
                    default: null,
                    parseHTML: element => element.style.fontSize || null,
                    renderHTML: attributes => {
                        if (!attributes.fontSize) return {};
                        return { style: `font-size: ${attributes.fontSize}` };
                    },
                },
            },
        }];
    },
});

// Extended Image with width support
const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: element => element.getAttribute('width') || element.style.width || null,
                renderHTML: attributes => {
                    if (!attributes.width) return {};
                    return { width: attributes.width, style: `width: ${attributes.width}` };
                },
            },
        };
    },
});

export const RawScriptNode = Node.create({
    name: "script",
    group: "block",
    atom: true, // atomic, cannot edit text inside it
    addAttributes() {
        return {
            src: { default: null },
            type: { default: null },
            async: { default: null },
            defer: { default: null },
            innerHTML: { default: null }
        };
    },
    parseHTML() {
        return [
            {
                tag: "script",
                getAttrs: (node) => ({
                    innerHTML: (node as HTMLElement).innerHTML || ""
                }),
            },
            {
                tag: "custom-script",
                getAttrs: (node) => ({
                    innerHTML: (node as HTMLElement).innerHTML || ""
                }),
            }
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const { innerHTML, ...attrs } = HTMLAttributes;
        return ["custom-script", attrs, innerHTML || ""];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props) => (
            <NodeViewWrapper style={{ padding: "10px", backgroundColor: "#ffebee", border: "1px dashed #d32f2f", borderRadius: "5px", color: "#d32f2f", fontFamily: "monospace", fontSize: "0.8rem", margin: "10px 0" }}>
                ⚠️ {props.node.attrs.src ? `Widget Script geladen (${props.node.attrs.src})` : "Custom Widget Script Injected"}
            </NodeViewWrapper>
        ));
    },
});

export const WidgetDivNode = Node.create({
    name: "widgetDiv",
    group: "block",
    atom: true,
    addAttributes() {
        return {
            "data-reservation-widget-id": { default: null },
            "data-widget": { default: null },
            id: { default: null },
            class: { default: null },
            style: { default: null }
        };
    },
    parseHTML() {
        return [
            { tag: "div[data-reservation-widget-id]" },
            { tag: "div[data-widget]" },
            { tag: "custom-widget" },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ["custom-widget", mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props) => (
            <NodeViewWrapper style={{ padding: "10px", backgroundColor: "#e3f2fd", border: "1px dashed #1976d2", borderRadius: "5px", color: "#1976d2", fontFamily: "monospace", fontSize: "0.8rem", margin: "10px 0" }}>
                📅 Widget Container (ID: {props.node.attrs["data-reservation-widget-id"] || "Aangepaste Widget"})
            </NodeViewWrapper>
        ));
    },
});

export const IframeNode = Node.create({
    name: "iframe",
    group: "block",
    atom: true,
    addAttributes() {
        return {
            src: { default: null },
            width: { default: null },
            height: { default: null },
            style: { default: null },
            frameborder: { default: null },
            allowfullscreen: { default: null },
            allow: { default: null },
            title: { default: null }
        };
    },
    parseHTML() {
        return [{ tag: "iframe" }];
    },
    renderHTML({ HTMLAttributes }) {
        return ["iframe", mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props) => (
            <NodeViewWrapper style={{ padding: "10px", backgroundColor: "#e8f5e9", border: "1px dashed #388e3c", borderRadius: "5px", color: "#388e3c", fontFamily: "monospace", fontSize: "0.8rem", margin: "10px 0" }}>
                🎞️ Video / Iframe Embed ({props.node.attrs.src})
            </NodeViewWrapper>
        ));
    }
});

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

const FONT_SIZES = [
    { label: "Klein", value: "0.8rem" },
    { label: "Normaal", value: "1rem" },
    { label: "Medium", value: "1.15rem" },
    { label: "Groot", value: "1.35rem" },
    { label: "XL", value: "1.6rem" },
    { label: "XXL", value: "2rem" },
];

const IMAGE_WIDTHS = [
    { label: "25%", value: "25%" },
    { label: "50%", value: "50%" },
    { label: "75%", value: "75%" },
    { label: "100%", value: "100%" },
];

function Toolbar({ editor, images }: { editor: any, images?: string[] }) {
    const [snippetCode, setSnippetCode] = useState("");

    if (!editor) return null;

    const addLink = () => {
        const current = editor.getAttributes("link").href || "";
        const url = window.prompt("URL invoeren:", current);
        if (url === null) return; // cancelled
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        const href = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    };

    return (
        <div style={{ padding: "8px", borderBottom: "1px solid #ddd", backgroundColor: "#fdfcf9" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", alignItems: "center" }}>
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

                {/* Tekstgrootte */}
                <select
                    onChange={e => {
                        if (e.target.value === "reset") {
                            editor.chain().focus().unsetMark('textStyle').run();
                        } else {
                            editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run();
                        }
                        e.target.value = "";
                    }}
                    style={{ padding: "4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.8rem", cursor: "pointer" }}
                    defaultValue=""
                >
                    <option value="" disabled>Aa Grootte</option>
                    {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label} ({s.value})</option>)}
                    <option value="reset">✕ Standaard</option>
                </select>

                <div style={sep} />

                {/* Link */}
                <button type="button" onClick={addLink} style={btn(editor.isActive("link"))}>🔗 Link</button>
                {editor.isActive("link") && (
                    <>
                        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} style={btn(false)}>❌</button>
                        <span style={{ fontSize: "0.75rem", color: "#4A5D23", fontFamily: "monospace", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid #c5d9a0", borderRadius: "4px", padding: "3px 6px", backgroundColor: "#f6faf0", cursor: "pointer" }} title={editor.getAttributes("link").href} onClick={addLink}>
                            {editor.getAttributes("link").href}
                        </span>
                    </>
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

                {images && images.length > 0 && (
                    <>
                        <div style={sep} />
                        <select
                            onChange={e => { if (e.target.value) { editor.chain().focus().setImage({ src: `/${e.target.value}`, alt: e.target.value.split('/').pop() }).run(); e.target.value = ""; } }}
                            style={{ padding: "4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.8rem", cursor: "pointer" }}
                            defaultValue=""
                        >
                            <option value="" disabled>📷 Afbeelding</option>
                            {images.map(img => <option key={img} value={img}>{img.split('/').pop()}</option>)}
                        </select>
                    </>
                )}

                {/* Afbeelding schalen - toont alleen als een afbeelding geselecteerd is */}
                {editor.isActive("image") && (
                    <>
                        <div style={sep} />
                        <span style={{ fontSize: "0.75rem", color: "#888", marginRight: "2px" }}>📐</span>
                        {IMAGE_WIDTHS.map(w => (
                            <button
                                key={w.value}
                                type="button"
                                onClick={() => editor.chain().focus().updateAttributes('image', { width: w.value }).run()}
                                style={btn(false)}
                            >
                                {w.label}
                            </button>
                        ))}
                    </>
                )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
                <input
                    type="text"
                    value={snippetCode}
                    onChange={(e) => setSnippetCode(e.target.value)}
                    placeholder="Extra Code Snippet (HTML Widgets, Youtube Embeds, etc.)"
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: "0.8rem" }}
                />
                <button
                    type="button"
                    onClick={() => {
                        if (snippetCode) {
                            editor.chain().focus().insertContent(snippetCode).run();
                            setSnippetCode("");
                        }
                    }}
                    style={{ backgroundColor: "#4A5D23", color: "white", padding: "8px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                >
                    Voeg in
                </button>
            </div>
        </div>
    );
}

export default function RichTextEditor({ content, onChange, images }: { content: string, onChange: (html: string) => void, images?: string[] }) {
    const contentLinks = useMemo(() => {
        if (!content) return [];
        const regex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const matches = [...content.matchAll(regex)];
        return matches.map(m => ({
            href: m[1],
            text: m[2].replace(/<[^>]+>/g, '').trim() || m[1],
        }));
    }, [content]);

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
            TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
            ResizableImage.configure({ inline: false, allowBase64: false }),
            FontSize,
            RawScriptNode,
            WidgetDivNode,
            IframeNode,
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
            <Toolbar editor={editor} images={images} />
            <EditorContent
                editor={editor}
                style={{ padding: "12px", minHeight: "150px" }}
            />
            {contentLinks.length > 0 && (
                <div style={{ padding: "8px 12px", borderTop: "1px solid #eee", backgroundColor: "#f9faf6", fontSize: "0.78rem" }}>
                    <strong style={{ color: "#666", display: "block", marginBottom: "4px" }}>🔗 Links in dit document:</strong>
                    {contentLinks.map((link, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: "2px", flexWrap: "wrap" }}>
                            <span style={{ color: "#333", flexShrink: 0 }}>{link.text}</span>
                            <span style={{ color: "#4A5D23", fontFamily: "monospace", wordBreak: "break-all" }}>{link.href}</span>
                        </div>
                    ))}
                </div>
            )}
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
                .tiptap img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; }
                .tiptap img[style*="text-align: center"], .tiptap [style*="text-align: center"] img { display: block; margin-left: auto; margin-right: auto; }
                .tiptap img[style*="text-align: right"], .tiptap [style*="text-align: right"] img { display: block; margin-left: auto; margin-right: 0; }
            `}</style>
        </div>
    );
}

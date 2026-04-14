import WidgetEmbed from "./WidgetEmbed";
import { parseTemplateString } from "../utils/templateParser";

export default function ExpiredBookingPage({
    guestName,
    propertyName,
    content,
    booking,
}: {
    guestName: string;
    propertyName: string;
    content?: string;
    booking?: any;
}) {
    const hasContent = content && content.trim().length > 0
        && content.trim() !== '<p></p>'
        && content.trim() !== '<p><br></p>';

    const parsedContent = hasContent ? parseTemplateString(content!, booking) : "";

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f5f0e1 0%, #e8e0cc 50%, #d4cbb0 100%)",
            padding: "20px",
            fontFamily: "'Nunito', sans-serif",
        }}>
            <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "24px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                padding: "50px 40px",
                maxWidth: "520px",
                width: "100%",
                textAlign: "center",
            }}>

                {hasContent && (
                    <div className="rich-content" style={{ textAlign: "left" }}>
                        <WidgetEmbed code={parsedContent} />
                    </div>
                )}

            </div>
        </div>
    );
}

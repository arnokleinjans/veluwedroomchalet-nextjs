import { getAppData } from "../../../../utils/db";
import { parseTemplateString } from "../../../../utils/templateParser";
import CinemaPlayer from "./CinemaPlayer";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: { bookingId: string, videoIndex: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const videoIndex = parseInt(resolvedParams.videoIndex, 10);

    const appData = await getAppData();
    const booking = appData.bookings.find((b: any) => b.id === bookingId) || null;
    const videos = appData.videos || [];
    const video = videos[videoIndex];

    if (!video) {
        return (
            <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p>Video niet gevonden.</p>
            </div>
        );
    }

    // Convert YouTube URL to embed URL
    let embedUrl = video.url || "";
    if (embedUrl.includes("youtube.com/watch?v=")) {
        embedUrl = embedUrl.replace("watch?v=", "embed/");
    }
    // Add autoplay parameter
    embedUrl += (embedUrl.includes("?") ? "&" : "?") + "autoplay=1&rel=0";

    const title = parseTemplateString(video.title, booking);

    return <CinemaPlayer embedUrl={embedUrl} title={title} bookingId={bookingId} />;
}

import { getTranslatedAppData } from "../../../../utils/db";
import { findBooking } from "../../../../utils/findBooking";
import { parseTemplateString } from "../../../../utils/templateParser";
import { t } from "../../../../utils/translations";
import CinemaPlayer from "./CinemaPlayer";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: { bookingId: string, videoIndex: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const bookingId = (resolvedParams.bookingId || "").toUpperCase();
    const videoIndex = parseInt(resolvedParams.videoIndex, 10);

    const appData = await getTranslatedAppData(bookingId);
    const rawBooking = findBooking(appData.bookings, bookingId);
    const booking = rawBooking ? { ...rawBooking, keyCode: (appData?.property as any)?.keyCode || '' } : null;
    const videos = (appData as any).videos || [];
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

    // Build query params
    const lang = booking?.language || "nl";
    embedUrl += (embedUrl.includes("?") ? "&" : "?") + `autoplay=1&mute=1&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=${lang}&hl=${lang}`;

    const title = parseTemplateString(video.title, booking);
    const backText = t('back', booking?.language) || "Terug";

    return <CinemaPlayer embedUrl={embedUrl} title={title} bookingId={bookingId} backText={backText} />;
}

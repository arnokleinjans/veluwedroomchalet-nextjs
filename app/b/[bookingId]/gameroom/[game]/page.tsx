import { notFound } from "next/navigation";
import { getAppData } from "../../../../utils/db";
import GameFrame from "./GameFrame";

export default async function GamePage({
    params,
}: {
    params: Promise<{ bookingId: string; game: string }>;
}) {
    const { bookingId, game } = await params;
    const appData = await getAppData();
    const games: { id: string; title: string; src: string }[] = (appData as any).games || [];
    const gameInfo = games.find(g => g.id === game);

    if (!gameInfo) {
        notFound();
    }

    return <GameFrame title={gameInfo.title} src={gameInfo.src} bookingId={bookingId} />;
}

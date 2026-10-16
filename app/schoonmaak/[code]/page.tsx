import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { vindSchoonmakerOpCode } from "../../utils/schoonmaakStore";
import { haalMijnBeurten } from "../../actions/schoonmaakPortaalActions";
import SchoonmaakPortaal from "./SchoonmaakPortaal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Schoonmaak · Veluwe Droomchalet",
    robots: { index: false, follow: false },
};

export default async function SchoonmaakPagina({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const schoonmaker = await vindSchoonmakerOpCode(code);
    if (!schoonmaker || !schoonmaker.actief) notFound();

    const data = await haalMijnBeurten(code);
    return <SchoonmaakPortaal code={code} naam={schoonmaker.naam} data={data} />;
}

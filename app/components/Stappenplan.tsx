export type Stap = {
    image?: string;
    tekst?: string;
    volleBreedte?: boolean;
};

export default function Stappenplan({ stappen }: { stappen?: Stap[] }) {
    const items = (stappen || []).filter(s => (s.tekst && s.tekst.trim()) || (s.image && s.image.trim()));
    if (items.length === 0) return null;

    return (
        <div className="stappenplan">
            {items.map((stap, i) => {
                const beeld = stap.image ? `/${stap.image}` : "";
                return (
                    <div key={i} className={`stappenplan-kaart${stap.volleBreedte ? " stappenplan-breed" : ""}`}>
                        {beeld && (
                            <div className="stappenplan-beeld">
                                <img src={beeld} alt="" />
                            </div>
                        )}
                        <div className="stappenplan-kop">
                            <span className="stappenplan-nummer">{i + 1}</span>
                            {stap.tekst && <p className="stappenplan-tekst">{stap.tekst}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

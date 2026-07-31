export type Stap = {
    image?: string;
    tekst?: string;
    zonderNummer?: boolean;
};

export default function Stappenplan({ stappen }: { stappen?: Stap[] }) {
    const items = (stappen || []).filter(s => (s.tekst && s.tekst.trim()) || (s.image && s.image.trim()));
    if (items.length === 0) return null;

    let teller = 0;

    return (
        <div className="stappenplan">
            {items.map((stap, i) => {
                const beeld = stap.image ? `/${stap.image}` : "";

                if (stap.zonderNummer) {
                    return (
                        <div key={i} className="stappenplan-toelichting">
                            {beeld && <img src={beeld} alt="" />}
                            {stap.tekst && <p className="stappenplan-tekst">{stap.tekst}</p>}
                        </div>
                    );
                }

                teller += 1;
                return (
                    <div key={i} className="stappenplan-kaart">
                        {beeld && (
                            <div className="stappenplan-beeld">
                                <img src={beeld} alt="" />
                            </div>
                        )}
                        <div className="stappenplan-kop">
                            <span className="stappenplan-nummer">{teller}</span>
                            {stap.tekst && <p className="stappenplan-tekst">{stap.tekst}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

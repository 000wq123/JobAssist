import LegalLayout from "../components/ui/LegalLayout";

/** Static Austrian Impressum (legal notice) page as required by §5 ECG. */
export default function ImpressumPage() {
  const linkClass = "text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] hover:underline transition-colors";
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4";

  const rows = [
    { dt: "Name",                   dd: "Davor Radeski" },
    { dt: "Unternehmensgegenstand", dd: "IT-Dienstleistungen / Softwareentwicklung" },
    { dt: "Status",                 dd: "Nicht gewerblich registriert — privates Projekt" },
    { dt: "Anschrift",              dd: "Österreich" },
    { dt: "E-Mail",                 dd: "info@jobassist.tech" },
  ];

  return (
    <LegalLayout
      title={<><span className="font-display italic text-[var(--color-accent-300)]">Impressum</span></>}
      subtitle="Angaben gemäß § 5 E-Commerce-Gesetz (ECG) und § 25 Mediengesetz (MedienG)"
    >
      <div className="space-y-6 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
        <section className={sectionClass}>
          <h2 className={h2Class}>Unternehmensangaben</h2>
          <dl className="grid grid-cols-12 gap-y-3 gap-x-4 text-[14px]">
            {rows.map(({ dt, dd }) => (
              <div key={dt} className="col-span-12 grid grid-cols-12 gap-x-4">
                <dt className="col-span-12 sm:col-span-4 font-semibold text-[var(--color-fg)]">{dt}</dt>
                <dd className="col-span-12 sm:col-span-8 text-[var(--color-fg-muted)]">{dd}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Medieninhaber & Herausgeber</h2>
          <p>
            Medieninhaber und Herausgeber dieser Website ist die oben genannte Person. Grundlegende Richtung
            des Mediums: Information über das Produkt JobAssist und KI-gestützte Bewerbungshilfe für den
            österreichischen Arbeitsmarkt.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Haftungsausschluss</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
          <p className="mt-2">
            Die von der KI generierten Inhalte stellen keine Rechts-, Karriere- oder Finanzberatung dar.
            Die Nutzung erfolgt auf eigene Verantwortung.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Streitbeilegung</h2>
          <p>
            Online-Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO:{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className={linkClass}>
              https://ec.europa.eu/consumers/odr
            </a>
          </p>
          <p className="mt-2">
            Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}

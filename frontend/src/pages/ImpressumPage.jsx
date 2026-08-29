import LegalLayout from "../components/ui/LegalLayout";

/** Static Austrian Impressum (legal notice) page as required by §5 ECG. */
export default function ImpressumPage() {
  const sectionClass = "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7";
  const h2Class = "text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-4";

  const rows = [
    { dt: "Name",                   dd: "Davor Radeski" },
    { dt: "Unternehmensgegenstand", dd: "IT-Dienstleistungen / Softwareentwicklung" },
    { dt: "Status",                 dd: "Nicht gewerblich registriert — privates Projekt" },
    { dt: "Anschrift",              dd: "Österreich" },
    { dt: "E-Mail",                 dd: "hallo@jobassist.tech" },
  ];

  return (
    <LegalLayout
      title={<><span className="font-display italic text-[var(--app-brand)]">Impressum</span></>}
      subtitle="Angaben gemäß § 5 E-Commerce-Gesetz (ECG)"
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
            Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
          <p className="mt-2 text-[13px]">
            Hinweis: Die frühere EU-Plattform zur Online-Streitbeilegung (ODR-Plattform) wurde mit
            20. Juli 2025 eingestellt.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}

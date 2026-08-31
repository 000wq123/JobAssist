import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const fieldClass = "h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent-500)] focus:ring-2 focus:ring-[var(--color-accent-500)]/15";

function DemoForm() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] px-5 py-12">
      <main className="mx-auto max-w-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-500)] text-[12px] font-black text-white">JA</span>
          <div><p className="font-semibold">Beispiel GmbH</p><p className="text-[12px] text-[var(--color-fg-muted)]">Demo-Bewerbungsportal</p></div>
        </div>
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--color-accent-500)]">Testbewerbung</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Junior Projektassistenz</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
            Öffne jetzt das JobAssist-Erweiterungssymbol und wähle „Diese Seite ausfüllen“.
          </p>
          <form className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)]">Vorname<input className={fieldClass} name="firstName" autoComplete="given-name" /></label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)]">Nachname<input className={fieldClass} name="lastName" autoComplete="family-name" /></label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)] sm:col-span-2">E-Mail<input className={fieldClass} name="email" type="email" autoComplete="email" /></label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)] sm:col-span-2">Telefon<input className={fieldClass} name="phone" type="tel" autoComplete="tel" /></label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)] sm:col-span-2">Anschreiben<textarea className={`${fieldClass} min-h-28 py-3`} name="coverLetter" /></label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--color-fg-muted)] sm:col-span-2">Lebenslauf<input className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-[12px]" name="resume" type="file" accept="application/pdf" /></label>
            <button type="submit" className="mt-2 h-11 rounded-xl bg-[var(--color-fg)] text-[13px] font-semibold text-[var(--color-bg)] sm:col-span-2">Demo nicht absenden</button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function ExtensionDemoPage() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("form") === "1") return <DemoForm />;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-5 py-16 text-[var(--color-fg)]">
      <main className="mx-auto max-w-3xl">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-500)] text-[15px] font-black text-white">JA</span>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--color-accent-500)]">Sicherer Funktionstest</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Teste den Bewerbungshelfer ohne echte Bewerbung.</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
          Die nächste Seite ist ein reines Demo-Formular. Es werden keine Angaben versendet oder auf einem Server gespeichert.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] p-5"><ShieldCheck className="h-5 w-5 text-[var(--color-success)]" /><p className="mt-3 font-semibold">Nur lokaler Test</p><p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">Keine Bewerbung und kein Arbeitgeber erhält Daten.</p></div>
          <div className="rounded-2xl border border-[var(--color-border)] p-5"><CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" /><p className="mt-3 font-semibold">Volle Kontrolle</p><p className="mt-1 text-[12px] text-[var(--color-fg-muted)]">Die Erweiterung füllt nur nach deinem Klick.</p></div>
        </div>
        <a
          href="/extension-demo?form=1"
          target="_blank"
          rel="noopener noreferrer"
          data-jobassist-apply=""
          data-job-id="demo"
          data-job-title="Junior Projektassistenz"
          data-job-company="Beispiel GmbH"
          data-job-location="Wien"
          data-job-source="JobAssist Demo"
          data-job-assist-url="/extension-demo"
          data-cover-letter="Sehr geehrte Damen und Herren, ich interessiere mich für die Position als Junior Projektassistenz."
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--color-accent-500)] px-5 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-600)]"
        >
          Demo starten <ExternalLink className="h-4 w-4" />
        </a>
      </main>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bot, Send, Sparkles, FileText, Briefcase, GraduationCap,
  Euro, Lightbulb, Trash2, Lock, Plus, MessageSquare, Clock,
  ClipboardList, Search, ChevronDown, ChevronUp, Shield, X,
  Wand2, Zap, ArrowRight,
} from "lucide-react";
import { resumeApi } from "../services/api";
import { useStreamingChat } from "../hooks/useStreamingChat";
import useUsageGuard from "../hooks/useUsageGuard";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_HISTORY_KEY = "ai_chat_history";
const MAX_HISTORY = 30;

/**
 * Loads persisted conversation history from localStorage.
 * @returns {object[]}
 */
function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Persists conversation history to localStorage.
 * @param {object[]} history
 */
function saveHistory(history) {
  try { localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history)); } catch {}
}

/**
 * Reads cached resumes from localStorage for instant initialData.
 * @returns {object[]|undefined}
 */
function loadStoredResumes() {
  try {
    const raw = localStorage.getItem("resumes");
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

/**
 * Reads cached jobs from localStorage for instant initialData.
 * @returns {object[]}
 */
function loadStoredJobs() {
  try {
    const raw = localStorage.getItem("jobs");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Schnell-Aktionen ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: FileText,      label: "Lebenslauf verbessern",  sub: "Stärken und Entwicklungspotenzial erkennen",  prompt: "Wie kann ich meinen Lebenslauf verbessern? generate_document (Erstellt dein Dokument).", requiresResume: true, iconCls: "text-indigo-300",  iconBg: "bg-indigo-500/15",  cardBorder: "border-indigo-500/20",  cardBg: "bg-indigo-500/[0.07] hover:bg-indigo-500/[0.14]",  textCls: "text-indigo-200",  arrowCls: "text-indigo-500/40 group-hover:text-indigo-400",  glow: "0 0 18px rgba(99,102,241,0.15)" },
  { icon: Briefcase,     label: "Bewerbungsstrategie",    sub: "Gezielt und wirksam bewerben",       prompt: "Wie entwickle ich eine starke Bewerbungsstrategie?",                                             iconCls: "text-violet-300",  iconBg: "bg-violet-500/15",  cardBorder: "border-violet-500/20",  cardBg: "bg-violet-500/[0.07] hover:bg-violet-500/[0.14]",  textCls: "text-violet-200",  arrowCls: "text-violet-500/40 group-hover:text-violet-400",  glow: "0 0 18px rgba(139,92,246,0.15)" },
  { icon: GraduationCap, label: "Praktikum finden",       sub: "Als Student gezielt starten",         prompt: "Wie kann ich als Student ein gutes Praktikum finden?",                                           iconCls: "text-cyan-300",    iconBg: "bg-cyan-500/15",    cardBorder: "border-cyan-500/20",    cardBg: "bg-cyan-500/[0.07] hover:bg-cyan-500/[0.14]",    textCls: "text-cyan-200",    arrowCls: "text-cyan-500/40 group-hover:text-cyan-400",    glow: "0 0 18px rgba(6,182,212,0.15)" },
  { icon: Euro,          label: "Gehaltsauskunft",        sub: "Marktübliche Gehälter kennen",        prompt: "Was für ein Gehalt kann ich als Berufseinsteiger in Österreich erwarten?",                        iconCls: "text-emerald-300", iconBg: "bg-emerald-500/15", cardBorder: "border-emerald-500/20", cardBg: "bg-emerald-500/[0.07] hover:bg-emerald-500/[0.14]", textCls: "text-emerald-200", arrowCls: "text-emerald-500/40 group-hover:text-emerald-400", glow: "0 0 18px rgba(16,185,129,0.15)" },
  { icon: Lightbulb,     label: "Gesprächsvorbereitung",  sub: "Souverän auftreten",                  prompt: "Wie bereite ich mich am besten auf ein Vorstellungsgespräch vor?",                               iconCls: "text-amber-300",   iconBg: "bg-amber-500/15",   cardBorder: "border-amber-500/20",   cardBg: "bg-amber-500/[0.07] hover:bg-amber-500/[0.14]",   textCls: "text-amber-200",   arrowCls: "text-amber-500/40 group-hover:text-amber-400",   glow: "0 0 18px rgba(245,158,11,0.15)" },
  { icon: Wand2,         label: "Anschreiben erstellen",  sub: "Überzeugend und individuell",         prompt: "Kannst du mir ein überzeugendes Anschreiben erstellen? generate_document (Erstellt dein Dokument).", requiresResume: true, iconCls: "text-fuchsia-300", iconBg: "bg-fuchsia-500/15", cardBorder: "border-fuchsia-500/20", cardBg: "bg-fuchsia-500/[0.07] hover:bg-fuchsia-500/[0.14]", textCls: "text-fuchsia-200", arrowCls: "text-fuchsia-500/40 group-hover:text-fuchsia-400", glow: "0 0 18px rgba(217,70,239,0.15)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a short unique ID using timestamp + random base-36. @returns {string} */
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

/**
 * Derives a short conversation title from the first user message.
 * @param {object[]} messages
 * @returns {string}
 */
function makeTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Neues Gespräch";
  const text = first.content.replace(/\s*generate_document\s*\([^)]*\)\.?/g, "").trim().slice(0, 40);
  return text.length < first.content.length ? text + "…" : text;
}

/**
 * Returns a short German relative-time label (e.g. "Vor 3 Min.").
 * @param {number} ts - Unix timestamp in ms.
 * @returns {string}
 */
function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)  return "Gerade eben";
  if (diff < 3_600_000) return `Vor ${Math.floor(diff / 60_000)} Min.`;
  if (diff < 86_400_000) return `Vor ${Math.floor(diff / 3_600_000)} Std.`;
  return new Date(ts).toLocaleDateString("de-AT", { day: "numeric", month: "short" });
}

/**
 * Classifies a conversation into a category label + CSS class based on its first message.
 * @param {object} conv
 * @returns {{ label: string, cls: string }}
 */
function getConvCategory(conv) {
  const first = conv.messages.find((m) => m.role === "user")?.content || "";
  if (first.includes("Interview-Simulator")) return { label: "Simulation", cls: "bg-brand-500/10 text-brand-200" };
  if (first.includes("Karriere-Analyse") || first.includes("Assessment")) return { label: "Analyse", cls: "bg-brand-500/10 text-brand-200" };
  return { label: "Chat", cls: "bg-white/[0.04] text-slate-300" };
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

/**
 * Converts inline Markdown (**bold**, *italic*, `code`) to React elements.
 * @param {string} text
 * @returns {React.ReactNode[]}
 */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded bg-brand-500/15 text-xs font-mono text-brand-200 border border-brand-500/20">{part.slice(1, -1)}</code>;
    return part;
  });
}

/**
 * Renders a multi-line Markdown string (headings, lists, bold, code) as React JSX.
 * @param {object} props
 * @param {string} props.text
 */
function MarkdownMessage({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;
  let olStart = 1;

  const flushList = (key) => {
    if (!listItems.length) return;
    if (listType === "ul") {
      elements.push(
        <ul key={key} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">{olStart + j}</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    if (/^###\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h3 key={i} className="text-sm font-extrabold text-slate-100 mt-3 mb-0.5 tracking-tight">{renderInline(line.slice(4))}</h3>);
    } else if (/^##\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h2 key={i} className="text-base font-extrabold text-slate-100 mt-4 mb-1 tracking-tight">{renderInline(line.slice(3))}</h2>);
    } else if (/^#\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h1 key={i} className="text-lg font-extrabold text-slate-100 mt-4 mb-1 tracking-tight">{renderInline(line.slice(2))}</h1>);
    } else if (/^---+$/.test(line.trim())) {
      flushList(`fl${i}`);
      elements.push(<hr key={i} className="my-3 border-white/[0.06]" />);
    } else if (/^[-*]\s/.test(line)) {
      if (listType !== "ul") { flushList(`fl${i}`); listType = "ul"; }
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") {
        flushList(`fl${i}`);
        listType = "ol";
        olStart = parseInt(line.match(/^(\d+)/)[1], 10);
      }
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList(`fl${i}`);
      elements.push(<div key={i} className="h-2" />);
    } else {
      flushList(`fl${i}`);
      elements.push(<p key={i} className="text-sm leading-relaxed font-medium text-slate-200">{renderInline(line)}</p>);
    }
  });
  flushList("end");
  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Resume Dropdown ─────────────────────────────────────────────────────────

/**
 * Custom dropdown for selecting the active resume context for the AI chat.
 * @param {object} props
 * @param {object[]} props.resumes
 * @param {string|number|null} props.selectedId
 * @param {(id: string|number) => void} props.onSelect
 */
function ResumeDropdown({ resumes, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = resumes.find((r) => r.id === selectedId);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-slate-300 hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all max-w-[160px]"
      >
        <FileText className="w-3 h-3 text-brand-300 flex-shrink-0" />
        <span className="truncate flex-1 min-w-0">{selected ? selected.filename : "Kein Lebenslauf"}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-white/[0.08] bg-[#060b14]/95 backdrop-blur-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden py-1">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full px-3 py-2.5 text-left text-xs transition-colors ${!selectedId ? "text-indigo-300 bg-indigo-500/10" : "text-slate-400 hover:bg-white/[0.04]"}`}
          >
            Kein Lebenslauf
          </button>
          {resumes.map((r) => (
            <button
              key={r.id}
              onClick={() => { onSelect(r.id); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-xs truncate transition-colors ${selectedId === r.id ? "text-indigo-300 bg-indigo-500/10" : "text-slate-300 hover:bg-white/[0.04]"}`}
            >
              {r.filename || `Lebenslauf ${r.id}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mode Banner ─────────────────────────────────────────────────────────────

const MODE_BANNER_CLS = {
  indigo:  { wrap: "bg-indigo-500/10 border-b border-indigo-500/20",   text: "text-indigo-300",  btn: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20" },
  emerald: { wrap: "bg-emerald-500/10 border-b border-emerald-500/20", text: "text-emerald-300", btn: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" },
};

/**
 * Coloured dismissible banner shown above the chat input for special AI modes.
 * @param {object} props
 * @param {'indigo'|'emerald'} props.variant
 * @param {string} props.title
 * @param {string[]} props.actions
 * @param {(action: string) => void} props.onAction
 * @param {() => void} props.onClose
 */
function ModeBanner({ variant, title, actions, onAction, onClose }) {
  const cls = MODE_BANNER_CLS[variant];
  return (
    <div className={`flex-shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-1.5 ${cls.wrap} backdrop-blur-sm`}>
      <span className={`text-xs font-bold ${cls.text} pr-2`}>{title}</span>
      <div className="flex flex-wrap gap-1 ml-auto">
        {actions.map((action) => (
          <button key={action.label} onClick={() => onAction(action.prompt)}
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${cls.btn}`}>
            {action.label}
          </button>
        ))}
        <button onClick={onClose}
          className="rounded-full border border-white/[0.08] px-2 py-0.5 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Full AI career assistant page with persistent multi-conversation history,
 * resume context selection, streaming responses, and document-generation mode.
 */
export default function AIAssistantPage() {
  const [conversations, setConversations] = useState(() => loadHistory());
  const [activeId,      setActiveId]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [historySearch,  setHistorySearch]  = useState("");
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [activeTray, setActiveTray] = useState(null); // "wand" | null
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  const [verlaufCollapsed, setVerlaufCollapsed] = useState(() => loadHistory().length === 0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewState, setViewState] = useState("discovery"); // "discovery" | "exiting-discovery" | "conversation"

  const messagesEndRef    = useRef(null);
  const chatContainerRef  = useRef(null);
  const inputRef          = useRef(null);
  const { guardedRun, atLimit: chatAtLimit } = useUsageGuard("ai_chat");
  const [streamingMsg, setStreamingMsg] = useState(null);
  const [assessmentDisclaimerOpen, setAssessmentDisclaimerOpen] = useState(false);
  const streamingTextRef = useRef("");
  const { send: streamChat, isStreaming } = useStreamingChat();

  const { data: uploadedResumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      try { localStorage.setItem("resumes", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => loadStoredResumes(),
    staleTime: 1000 * 60 * 2,
  });


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (streamingMsg && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [streamingMsg]);

  useEffect(() => {
    if (messages.length === 0) return;
    setConversations((prev) => {
      const title = makeTitle(messages);
      if (activeId) {
        const updated = prev.map((c) =>
          c.id === activeId ? { ...c, messages, title, updatedAt: Date.now() } : c
        );
        saveHistory(updated);
        return updated;
      }
      const newConv = { id: makeId(), title, messages, createdAt: Date.now(), updatedAt: Date.now() };
      setActiveId(newConv.id);
      const updated = [newConv, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Discovery → Conversation view transition
  useEffect(() => {
    if (messages.length === 0) { setViewState("discovery"); return; }
    setViewState((prev) => prev === "discovery" ? "exiting-discovery" : prev);
  }, [messages.length]);

  useEffect(() => {
    if (viewState !== "exiting-discovery") return;
    setViewState("conversation");
    return undefined;
  }, [viewState]);

  const handleSend = useCallback((text) => {
    const message = (text ?? input).trim();
    if (!message) return;
    guardedRun(() => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setInput("");
      streamingTextRef.current = "";
      streamChat(
        {
          message,
          history: messages.slice(-10),
          ...(selectedResumeId ? { resume_id: selectedResumeId } : {}),
        },
        {
          onChunk: (chunk) => {
            streamingTextRef.current += chunk;
            setStreamingMsg({ shown: streamingTextRef.current });
          },
          onDone: () => {
            const finalText = streamingTextRef.current;
            streamingTextRef.current = "";
            setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
            setStreamingMsg(null);
          },
          onError: () => {
            streamingTextRef.current = "";
            setStreamingMsg(null);
            toast.error("Fehler bei der KI-Antwort");
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.", isError: true },
            ]);
          },
        }
      );
    });
  }, [input, messages, selectedResumeId, guardedRun, streamChat]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSimulationMode(false);
    setAssessmentMode(false);
    setSidebarOpen(false);
    setActiveTray(null);
    inputRef.current?.focus();
  };

  const handleSelectConversation = useCallback((conv) => {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
    const firstUser = conv.messages.find((m) => m.role === "user")?.content || "";
    setSimulationMode(firstUser.includes("Interview-Simulator"));
    setAssessmentMode(firstUser.includes("Karriere-Analyse"));
  }, []);

  const handleDeleteConversation = useCallback((e, id) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveHistory(updated);
      return updated;
    });
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
      setSimulationMode(false);
      setAssessmentMode(false);
    }
  }, [activeId]);

  const startSimulation = useCallback(() => {
    setSimulationMode(true);
    setAssessmentMode(false);
    handleSend("Starte bitte einen Interview-Simulator für mich. Stelle mir nacheinander präzise Fragen und warte jeweils auf meine Antwort.");
  }, [handleSend]);

  const startAssessment = useCallback(() => {
    setAssessmentMode(true);
    setSimulationMode(false);
    setAssessmentDisclaimerOpen(false);
    handleSend(
      "Starte bitte eine strukturierte, interaktive Karriere-Analyse für mich als 1-on-1-Dialog. " +
      "Stelle jeweils EINE Frage und warte auf meine Antwort, bevor du die nächste stellst.\n\n" +
      "Verbindliche Regeln für deine Fragen:\n" +
      "- KEINE Klischee-Fragen wie 'Was sind deine größten Schwächen?' — diese liefern keine verwertbaren Daten\n" +
      "- Frage stattdessen wachstumsorientiert: z. B. 'Welche fachlichen oder persönlichen Fähigkeiten möchtest du in deiner nächsten Rolle weiterentwickeln?'\n" +
      "- Fokussiere auf belegbare Erfahrungen: 'In welchen Arbeitssituationen leistest du nachweislich dein Bestes?'\n" +
      "- Erkunde berufliche Umfelder: 'In welchen Teamstrukturen oder Arbeitsweisen fühlst du dich am produktivsten?'\n" +
      "- Keine Persönlichkeits- oder Charaktereinschätzungen — nur textbasierte Evidenz aus meinen Antworten\n\n" +
      "Am Ende: Erstelle eine Analyse strategischer Entwicklungschancen mit konkreten, umsetzbaren Empfehlungen.\n\n" +
      "Beginne jetzt mit der ersten Frage."
    );
  }, [handleSend]);

  const simulatorActions = [
    { label: "Nächste Frage",  prompt: "Stelle mir bitte die nächste Interviewfrage für diese Simulation." },
    { label: "Feedback geben", prompt: "Gib mir bitte direktes Feedback auf meine letzte Antwort und sage mir, was ich verbessern soll." },
    { label: "Tipp anzeigen",  prompt: "Gib mir bitte einen kurzen Tipp, wie ich die aktuelle Interviewfrage stärker beantworten kann." },
  ];

  const assessmentActions = [
    { label: "Weiter",           prompt: "Fahre mit der nächsten Analyse-Frage fort." },
    { label: "Auswertung jetzt", prompt: "Gib mir jetzt schon eine Zwischenauswertung meines Bewerberprofils basierend auf dem bisherigen Gespräch." },
    { label: "Abschließen",      prompt: "Schließe das Assessment ab und gib mir eine vollständige Profilauswertung mit konkreten Empfehlungen." },
  ];

  const filteredConversations = useMemo(
    () => historySearch.trim()
      ? conversations.filter((c) => c.title.toLowerCase().includes(historySearch.toLowerCase()))
      : conversations,
    [conversations, historySearch]
  );

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeId),
    [conversations, activeId]
  );

  const savedJobs = useMemo(() => loadStoredJobs(), []);
  const contextJob = useMemo(
    () => savedJobs.find(j => j.status === "interviewing") || savedJobs.find(j => j.status === "applied") || savedJobs[0] || null,
    [savedJobs]
  );
  const contextResume = uploadedResumes[0] || null;

  const wandSuggestions = useMemo(() => [
    contextJob ? `Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.` : "Bereite mich auf mein nächstes Vorstellungsgespräch vor.",
    contextResume ? "Analysiere meinen Lebenslauf und nenne mir die 3 stärksten Punkte." : "Was sollte ein überzeugender Lebenslauf enthalten?",
    contextJob ? `Schreib ein Anschreiben für die Stelle "${contextJob.role}" bei ${contextJob.company}.` : "Wie schreibe ich ein überzeugendes Anschreiben?",
    "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?",
  ], [contextJob, contextResume]);

  // ── Shared: conversation list renderer ──────────────────────────────────────
  const renderConvList = useCallback(() => {
    if (filteredConversations.length === 0 && conversations.length > 0)
      return <p className="px-2 py-4 text-center text-xs text-slate-500">Keine Treffer</p>;
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    const weekAgo = today - 604800000;
    const groups = {
      today:     { label: "Heute",        convs: [] },
      yesterday: { label: "Gestern",      convs: [] },
      thisWeek:  { label: "Diese Woche",  convs: [] },
      older:     { label: "Älter",        convs: [] },
    };
    filteredConversations.forEach((conv) => {
      const d = new Date(conv.updatedAt).setHours(0, 0, 0, 0);
      if (d === today) groups.today.convs.push(conv);
      else if (d === yesterday) groups.yesterday.convs.push(conv);
      else if (conv.updatedAt > weekAgo) groups.thisWeek.convs.push(conv);
      else groups.older.convs.push(conv);
    });
    return Object.entries(groups).map(([key, group]) => {
      if (!group.convs.length) return null;
      return (
        <div key={key} className="mb-2">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">{group.label}</p>
          {group.convs.map((conv) => {
            const cat = getConvCategory(conv);
            return (
              <button
                key={conv.id}
                title={conv.title}
                onClick={() => handleSelectConversation(conv)}
                className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 mb-0.5
                  ${conv.id === activeId
                    ? "bg-indigo-500/15 border border-indigo-500/25"
                    : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                  }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${cat.cls}`}>{cat.label}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="truncate text-xs font-medium text-slate-300 leading-snug mb-1">{conv.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{relativeTime(conv.updatedAt)}</span>
                  <span className="opacity-40">·</span>
                  <span>{conv.messages.filter((m) => m.role === "user").length} Nachr.</span>
                </div>
              </button>
            );
          })}
        </div>
      );
    });
  }, [filteredConversations, conversations, activeId, handleSelectConversation, handleDeleteConversation]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    {/* Full-height container */}
    <div className="animate-slide-up flex flex-1 min-h-0 overflow-hidden bg-transparent relative">

      {/* ── Persistent Left Sidebar (desktop) ──────────────────────────────── */}
      <aside className={`hidden lg:flex sticky top-0 self-start h-screen flex-shrink-0 flex-col bg-[#030609] border-r border-white/[0.06] overflow-hidden transition-[width,border-width] duration-300 ease-in-out ${verlaufCollapsed ? "w-0 border-r-0" : "w-60"}`}>
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          {!verlaufCollapsed && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-200">Verlauf</span>
            </div>
          )}
          <div className={`flex items-center gap-1 ${verlaufCollapsed ? "mx-auto" : ""}`}>
            {!verlaufCollapsed && (
              <button onClick={handleNewChat} title="Neues Gespräch" className="p-1.5 rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-all">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setVerlaufCollapsed((v) => !v)}
              title={verlaufCollapsed ? "Verlauf anzeigen" : "Verlauf ausblenden"}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-all"
            >
              {verlaufCollapsed
                ? <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                : <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
              }
            </button>
          </div>
        </div>
        {!verlaufCollapsed && (
          <>
            {conversations.length > 0 && (
              <div className="flex-shrink-0 flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl mx-3 mt-2 px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Gespräche suchen…"
                  className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none min-w-0"
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 py-2 mt-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full">
              {conversations.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center h-full px-3 py-10 animate-fade-in">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-lg" />
                      <div className="relative w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center animate-float">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 text-center">Noch keine Gespräche</p>
                    <p className="text-[10px] text-slate-700 text-center mt-1 leading-relaxed">Starte ein neues Gespräch</p>
                  </div>
                )
                : renderConvList()
              }
            </div>
          </>
        )}
      </aside>

      {/* ── Main column ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 ease-in-out">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-2 border-b border-white/[0.06] bg-[#060b14]/85 backdrop-blur-2xl z-10">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title="Gesprächsverlauf"
          className="flex-shrink-0 lg:hidden p-1.5 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        {verlaufCollapsed && (
          <button
            onClick={() => setVerlaufCollapsed(false)}
            title="Verlauf anzeigen"
            className="hidden lg:flex flex-shrink-0 p-1.5 rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </button>
        )}

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
              style={{ boxShadow: "0 0 14px rgba(99,102,241,0.45)" }}
            >
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-none">KI-Assistent</p>
            <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">
              {activeConversation?.title || "Neues Gespräch"}
            </p>
          </div>
        </div>

        {uploadedResumes.length > 0 && (
          <ResumeDropdown resumes={uploadedResumes} selectedId={selectedResumeId} onSelect={setSelectedResumeId} />
        )}

        <button
          onClick={handleNewChat}
          title="Neues Gespräch"
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/[0.07] text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Neu</span>
        </button>
      </header>

      {simulationMode && !chatAtLimit && (
        <ModeBanner variant="indigo" title="Interview-Simulator aktiv" actions={simulatorActions} onAction={handleSend} onClose={() => setSimulationMode(false)} />
      )}
      {assessmentMode && (
        <ModeBanner variant="emerald" title="Stärkenanalyse aktiv" actions={assessmentActions} onAction={handleSend} onClose={() => setAssessmentMode(false)} />
      )}

      {/* ── Chat Stage — full width ─────────────────────────────────────────── */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto flex flex-col px-4 py-5 sm:px-6 sm:py-6">
        {viewState !== "conversation" ? (

          /* ── Discovery state ─────────────────────────────────────────────── */
          <div
            className="grid grid-cols-12 gap-y-6 gap-x-4 max-w-[880px] mx-auto pb-4 pt-8 my-auto w-full"
            style={viewState === "exiting-discovery" ? {
              transform: "translateY(-28px)",
              opacity: 0,
              transition: "transform 0.32s ease-in, opacity 0.28s ease-in",
              pointerEvents: "none",
            } : {}}
          >

            {/* ── Section header ────────────────────────────────────────────── */}
            <div className="col-span-12 flex flex-col items-center text-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] px-3.5 py-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold tracking-wide text-indigo-300">KI-Karriere-Assistent</span>
              </div>
              <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
                Wie kann ich dir helfen?
              </h1>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                Wähle eine Mission oder schreib direkt — ich kenne deinen Bewerbungsstand.
              </p>
            </div>

            {/* ── Context job CTA ───────────────────────────────────────────── */}
            {contextJob && (
              <div className="col-span-12">
                <div
                  className="relative overflow-hidden rounded-2xl border border-indigo-500/25 backdrop-blur-xl"
                  style={{
                    background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.16) 0%, rgba(139,92,246,0.06) 45%, transparent 70%), linear-gradient(160deg, rgba(15,20,35,0.95) 0%, rgba(5,6,10,0.98) 100%)",
                    boxShadow: "0 8px 40px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
                  <div className="relative flex items-center gap-4 px-4 sm:px-5 py-4">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600"
                      style={{ boxShadow: "0 4px 20px rgba(99,102,241,0.5)" }}
                    >
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">Nächste Aktion</p>
                      <p className="text-sm font-bold text-white truncate">Interview: {contextJob.role}</p>
                      <p className="text-xs text-slate-500 truncate">{contextJob.company}</p>
                    </div>
                    <button
                      onClick={() => handleSend(`Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.`)}
                      className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-95 transition-all"
                      style={{ boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
                    >
                      Starten
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Suggestion card grid ──────────────────────────────────────── */}
            <div className="col-span-12 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {SUGGESTIONS.map((s) => {
                const locked = s.requiresResume && uploadedResumes.length === 0;
                return (
                  <button
                    key={s.label}
                    onClick={() => {
                      if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; }
                      handleSend(s.prompt);
                    }}
                    className={`group flex flex-col gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ease-out ${
                      locked
                        ? "border-white/[0.05] bg-white/[0.02] cursor-not-allowed opacity-40"
                        : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.055] hover:border-white/[0.12] cursor-pointer active:scale-[0.98] hover:shadow-[0_6px_28px_rgba(0,0,0,0.4)]"
                    }`}
                    style={!locked ? { boxShadow: "0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                        {locked
                          ? <Lock className="w-4 h-4 text-slate-600" />
                          : <s.icon className={`w-4 h-4 ${s.iconCls}`} />
                        }
                      </div>
                      {!locked && (
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all duration-300 ease-out mt-0.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${locked ? "text-slate-500" : "text-slate-100"}`}>{s.label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

        ) : (

          /* ── Conversation state ──────────────────────────────────────────── */
          <div className={`${verlaufCollapsed ? "max-w-6xl mx-auto" : "max-w-5xl mr-auto ml-0"} w-full space-y-5`}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-0.5"
                    style={{ boxShadow: "0 0 18px rgba(99,102,241,0.5)" }}
                  >
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[92%] sm:max-w-[88%] lg:max-w-[84%] break-words flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl overflow-hidden
                      ${msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm text-sm leading-relaxed font-medium"
                        : msg.isError
                          ? "bg-red-500/10 border border-red-500/20 text-red-200 rounded-bl-sm text-sm leading-relaxed"
                          : "bg-white/[0.04] backdrop-blur-sm border border-white/[0.07] text-slate-200 rounded-bl-sm text-sm leading-relaxed"
                      }`}
                    style={msg.role === "user"
                      ? { boxShadow: "0 4px 24px rgba(99,102,241,0.45)" }
                      : !msg.isError
                        ? { boxShadow: "0 2px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)" }
                        : {}
                    }
                  >
                    {msg.role === "user" ? msg.content.replace(/\s*generate_document\s*\([^)]*\)\.?/g, "").trim() : <MarkdownMessage text={msg.content} />}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {isStreaming && !streamingMsg && (
              <div className="flex items-end gap-3 justify-start">
                <div
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
                  style={{ boxShadow: "0 0 18px rgba(99,102,241,0.5)" }}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div
                  className="bg-white/[0.04] backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 border border-white/[0.07]"
                  style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
                >
                  <div className="flex items-center gap-1.5">
                    {[0, 0, 0].map((delay, i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Streaming message */}
            {streamingMsg && (
              <div className="flex items-end gap-3 justify-start">
                <div
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-0.5"
                  style={{ boxShadow: "0 0 18px rgba(99,102,241,0.5)" }}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[92%] sm:max-w-[88%] lg:max-w-[84%] break-words">
                  <div
                    className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.07] text-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed overflow-hidden"
                    style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                  >
                    <MarkdownMessage text={streamingMsg.shown} />
                    <span className="inline-block w-0.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── EU AI Act micro-disclaimer ───────────────────────────────────────── */}
      {!disclaimerDismissed && (
        <div className="flex-shrink-0 px-3 mb-2">
        <div className={`${viewState !== "conversation" ? "max-w-[800px]" : verlaufCollapsed ? "" : "max-w-5xl"} mx-auto flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-3 py-1.5 overflow-hidden`}>
          <Shield className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <p className="flex-1 text-xs text-slate-500 leading-snug">
            <strong className="text-slate-400">KI-Transparenz</strong> · Dieses System arbeitet KI-gestützt. Hinweis gemäß Art. 50 EU AI Act.
          </p>
          <button onClick={() => setDisclaimerDismissed(true)} className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
        </div>
      )}

      {/* ── Wand context suggestions ─────────────────────────────────────────── */}
      {activeTray === "wand" && (
        <div className="flex-shrink-0 px-3 pb-2 pt-2 border-t border-white/[0.04] bg-[#060b14]/70 backdrop-blur-xl">
          <div className="flex flex-wrap gap-1.5">
            {wandSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); setActiveTray(null); inputRef.current?.focus(); }}
                className="rounded-xl border border-brand-500/20 bg-brand-500/[0.07] px-3 py-1.5 text-xs font-medium text-brand-200 hover:bg-brand-500/[0.14] transition-colors text-left leading-snug"
              >
                {s.length > 60 ? s.slice(0, 60) + "…" : s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sticky Input Bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 z-20 px-3 pb-4 pt-2.5 bg-[#060b14]/90 backdrop-blur-2xl border-t border-white/[0.05]">
        <div className="max-w-[900px] mx-auto">
        <div
          className="flex items-center sm:items-end gap-2 w-full rounded-2xl border border-white/[0.09] bg-white/[0.035] backdrop-blur-xl px-3 sm:px-4 py-2.5 sm:py-3 min-h-[48px] sm:min-h-[56px] transition-all duration-200 focus-within:border-indigo-500/50 shadow-[0_4px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:shadow-[0_0_0_2px_rgba(99,102,241,0.2),0_0_24px_rgba(99,102,241,0.12),0_4px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          {/* Icons inside field — left side */}
          <div className="flex items-center gap-0.5 flex-shrink-0 sm:pb-0.5">
            {/* Mobile: + opens dropdown */}
            <div className="relative flex sm:hidden">
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${mobileMenuOpen ? "bg-white/[0.08] text-slate-200" : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"}`}
              >
                <Plus className="h-4 w-4" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-2 z-20 flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-[#060b14]/98 backdrop-blur-xl shadow-xl p-1.5 min-w-[150px]">
                    <button
                      onClick={() => { setActionDrawerOpen(true); setMobileMenuOpen(false); }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      Aktionen
                    </button>
                    <button
                      onClick={() => { setActiveTray((v) => v === "wand" ? null : "wand"); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${activeTray === "wand" ? "text-brand-200 bg-brand-500/10" : "text-slate-200 hover:bg-white/[0.06]"}`}
                    >
                      <Wand2 className="w-4 h-4 text-brand-300 flex-shrink-0" />
                      Vorschläge
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Desktop: + opens drawer */}
            <button
              onClick={() => setActionDrawerOpen(true)}
              title="Aktionen"
              className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
            {/* Desktop: wand suggestions */}
            <button
              onClick={() => setActiveTray((v) => v === "wand" ? null : "wand")}
              title="Vorschläge"
              className={`hidden sm:flex h-7 w-7 items-center justify-center rounded-lg transition-all ${activeTray === "wand" ? "bg-brand-500/15 text-brand-200" : "text-slate-500 hover:bg-white/[0.06] hover:text-brand-200"}`}
            >
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag mich etwas zu deiner Karriere…"
            rows={1}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
            className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-[1rem] sm:text-[0.875rem] leading-relaxed overflow-y-auto text-slate-100 placeholder:text-slate-500 py-0.5 transition-[height] duration-150 ease-out"
            style={{ minHeight: "1.75rem", maxHeight: "200px" }}
          />
          {/* Send */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming || !!streamingMsg}
            title="Senden"
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all duration-200 hover:bg-indigo-500 active:scale-95 disabled:opacity-25 disabled:scale-90 disabled:cursor-not-allowed sm:mb-0.5"
            style={{ boxShadow: (!input.trim() || isStreaming || !!streamingMsg) ? 'none' : '0 0 18px rgba(99,102,241,0.5)' }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        </div>{/* end input spine container */}
      </div>

      </div>{/* end main column */}
    </div>{/* end outer container */}

    {/* ── History drawer (mobile only) ───────────────────────────────────────── */}
    {sidebarOpen && (
      <div className="fixed inset-0 z-40 flex">
        <aside className="w-[86vw] max-w-72 flex flex-col bg-[#050810]/95 backdrop-blur-2xl border-r border-white/[0.06] overflow-hidden shadow-2xl shadow-black/60">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-200">Gesprächsverlauf</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          {conversations.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl mx-3 mt-2 px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Gespräche suchen…"
                className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none min-w-0"
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 py-2 mt-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full">
            {conversations.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-full px-3 py-10 animate-fade-in">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-lg" />
                    <div className="relative w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center animate-float">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-500 text-center">Noch keine Gespräche</p>
                  <p className="text-[10px] text-slate-700 text-center mt-1 leading-relaxed">Starte ein neues Gespräch</p>
                </div>
              )
              : renderConvList()
            }
          </div>
        </aside>
        <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      </div>
    )}

    {/* ── Action BottomSheet Drawer ──────────────────────────────────────────── */}
    {actionDrawerOpen && (
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        onClick={() => setActionDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative rounded-t-2xl border-t border-white/[0.08] bg-[#060b14]/98 backdrop-blur-2xl shadow-2xl animate-slide-up"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/[0.12]" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-sm font-bold text-white">Aktionen</span>
            <button onClick={() => setActionDrawerOpen(false)} className="p-1.5 rounded-xl text-slate-500 hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 pb-6 space-y-1.5 overflow-y-auto max-h-[60vh]">
            {!chatAtLimit && (
              <button
                onClick={() => { startSimulation(); setActionDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] hover:bg-indigo-500/[0.14] text-left transition-all group"
                style={{ boxShadow: "0 0 18px rgba(99,102,241,0.18)" }}
              >
                <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-indigo-300">Interview-Simulation</p>
                  <p className="text-xs text-slate-600 mt-0.5">Realitätsnahe Übung</p>
                </div>
                <div className="hidden sm:flex h-9 w-12 items-end justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 overflow-hidden">
                  <span className="text-[10px] leading-none mb-1">👩‍💼💬</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500/40 ml-auto flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
              </button>
            )}
            <button
              onClick={() => { setAssessmentDisclaimerOpen(true); setActionDrawerOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.14] text-left transition-all group"
              style={{ boxShadow: "0 0 18px rgba(16,185,129,0.18)" }}
            >
              <ClipboardList className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-300">Stärkenanalyse</p>
                <p className="text-xs text-slate-600 mt-0.5">Potenziale erkennen</p>
              </div>
              <div className="hidden sm:flex h-9 w-12 items-end justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 overflow-hidden">
                <span className="text-[10px] leading-none mb-1">🧍‍♂️📋</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500/40 ml-auto flex-shrink-0 group-hover:text-emerald-400 transition-colors" />
            </button>
            {SUGGESTIONS.map((s) => {
              const locked = s.requiresResume && uploadedResumes.length === 0;
              return (
                <button
                  key={s.label}
                  onClick={() => {
                    if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; }
                    setActionDrawerOpen(false);
                    handleSend(s.prompt);
                  }}
                  disabled={chatAtLimit}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all group disabled:opacity-40 cursor-pointer ${locked ? "border-white/[0.06] bg-white/[0.02] cursor-not-allowed" : `${s.cardBorder} ${s.cardBg}`}`}
                  style={!locked ? { boxShadow: s.glow } : undefined}
                >
                  {locked
                    ? <Lock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    : <s.icon className={`w-4 h-4 flex-shrink-0 ${s.iconCls}`} />
                  }
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${locked ? "text-slate-500" : s.textCls}`}>{s.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{s.sub}</p>
                  </div>
                  {!locked && <ArrowRight className={`w-3.5 h-3.5 ml-auto flex-shrink-0 transition-colors ${s.arrowCls}`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* ── Assessment disclaimer modal ─────────────────────────────────────────── */}
    {assessmentDisclaimerOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setAssessmentDisclaimerOpen(false); }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#060b14]/95 backdrop-blur-2xl shadow-2xl"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/20">
                <Shield className="h-5 w-5 text-brand-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">KI-Transparenzhinweis</h2>
                <p className="text-xs text-slate-500">Hinweis gemäß Art. 50 EU AI Act</p>
              </div>
            </div>
            <button
              onClick={() => setAssessmentDisclaimerOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-semibold text-slate-100">
              Diese Analyse nutzt ein KI-System, um deine Eingaben strukturiert auszuwerten und berufliche Empfehlungen abzuleiten.
            </p>
            <ul className="space-y-2">
              {[
                "Deine Angaben werden ausschließlich für diese Karriere-Auswertung und zugehörige Empfehlungen verarbeitet.",
                "Es erfolgt keine automatisierte Endentscheidung über deine Eignung oder eine konkrete Einstellung.",
                "Die Auswertung dient als fachliche Orientierung und ersetzt keine verbindliche Karriere- oder Rechtsberatung.",
                "Bewertet werden ausschließlich textbasierte Angaben; verdeckte Persönlichkeitsprofile werden nicht abgeleitet.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-300/70" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.07] px-3 py-2.5 text-xs text-brand-100 leading-relaxed">
              <strong>Du interagierst mit einem KI-System.</strong> Prüfe wichtige Empfehlungen sorgfältig und ziehe bei verbindlichen Entscheidungen qualifizierte Beratung hinzu.
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
            <button
              onClick={() => setAssessmentDisclaimerOpen(false)}
              className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-white/[0.04] transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={startAssessment}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ boxShadow: "0 0 16px rgba(99,102,241,0.35)" }}
            >
              Stärkenanalyse starten
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

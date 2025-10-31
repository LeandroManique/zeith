"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Msg = { id: string; role: "user" | "ai"; text: string };
type LeadStage = "idle" | "collecting_name" | "collecting_email" | "submitting";

export default function ChatZeith() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [closed, setClosed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [leadStage, setLeadStage] = useState<LeadStage>("idle");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadScore, setLeadScore] = useState<number | "indeterminado" | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    if (isStreaming || closed) return;
    const text = value.trim();
    if (!text) return;

    // Lead: nome
    if (leadStage === "collecting_name") {
      setLeadName(text);
      const firstName = text.split(" ")[0] || text;
      setMessages((s) => [
        ...s,
        { id: "ai-" + Date.now(), role: "ai", text: `Perfeito, ${firstName} — e qual é o seu e-mail de contato?` },
      ]);
      setLeadStage("collecting_email");
      setValue("");
      return;
    }

    // Lead: email
    if (leadStage === "collecting_email") {
      setLeadEmail(text);
      setLeadStage("submitting");
      setLeadSubmitting(true);
      const convoText = messages.map((m) => `${m.role}:${m.text}`).join("\n") + "\nuser:" + text;
      const score = computeScore(convoText);
      setLeadScore(score);
      const note = extractNote(convoText);
      try {
        const resp = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: leadName || "", email: text, origin: "Landing ZEITH", score: score === "indeterminado" ? null : score, note }),
        });
        const respText = await safeText(resp);
        if (resp.ok) {
          setMessages((s) => [
            ...s,
            { id: "ai-" + Date.now(), role: "ai", text: "Contato registrado com sucesso. A equipe da ZEITH entrará em contato em breve." },
          ]);
        } else {
          setMessages((s) => [
            ...s,
            { id: "ai-err-" + Date.now(), role: "ai", text: "Ocorreu um erro ao registrar o contato: " + respText },
          ]);
        }
      } catch (err) {
        setMessages((s) => [
          ...s,
          { id: "ai-err-" + Date.now(), role: "ai", text: "Erro ao enviar os dados. Por favor, tente novamente mais tarde." },
        ]);
      } finally {
        setLeadSubmitting(false);
        setLeadStage("idle");
        setLeadName("");
        setLeadEmail("");
        setLeadScore(null);
      }
      setValue("");
      return;
    }

    // Análise contextual
    if (leadStage === "idle") {
      try {
        const bridgePayload = messages
          .concat({ id: "u-" + Date.now(), role: "user", text })
          .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
        const bRes = await fetch("/api/contextual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: bridgePayload }),
        });
        const analysis = await bRes.json();
        if (
          analysis?.estado === "decisao" &&
          ["branding_estrategico", "ia_automacao", "desenvolvimento_web"].includes(analysis?.tema)
        ) {
          await humanPause();
          const guideline = analysis?.direcao || "entrar em contato sobre seu projeto";
          setMessages((s) => [
            ...s,
            { id: "ai-" + Date.now(), role: "ai", text: `Entendi — seria útil ${guideline}. Posso anotar seu nome para que alguém da ZEITH entre em contato?` },
          ]);
          setIsTyping(false);
          setLeadStage("collecting_name");
          setValue("");
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    // Limite de mensagens
    const count = messages.length + 1;
    if (count >= 30) {
      setClosed(true);
      setMessages((s) => [
        ...s,
        { id: "ai-close", role: "ai", text: "Chegamos ao fim da consultoria gratuita. Posso encaminhar seus dados ao Leandro Manique para uma análise completa?" },
      ]);
      setValue("");
      return;
    }

    // Mensagem normal
    const userMsg: Msg = { id: "u-" + Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setValue("");
    await humanPause();
    setIsTyping(true);
    try {
      // Sempre use o estado mais recente das mensagens
      const currentMessages = [...messages, userMsg];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })) }),
      });
      if (res.ok) {
        const aiResponse = await res.json();
        const aiText = aiResponse.choices?.[0]?.message?.content || "Erro: resposta inesperada da IA.";
        setMessages((prev) => {
          // Só adiciona se a última mensagem não for igual
          if (prev[prev.length - 1]?.role === "ai" && prev[prev.length - 1]?.text === aiText) return prev;
          return [...prev, { id: "ai-" + Date.now(), role: "ai", text: aiText }];
        });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: "ai-err-" + Date.now(), role: "ai", text: "Erro ao conectar com a API." }]);
    } finally {
      setIsTyping(false);
    }
  }

  const displayIsTyping = isTyping || isStreaming || leadSubmitting;

  async function humanPause(min = 600, max = 1800) {
    setIsTyping(true);
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  function computeScore(text: string): number | "indeterminado" {
    const t = text.toLowerCase();
    const high = /(contrat|quero contratar|marcar reuni|agendar|decis[oã]o|c-level|cto|ceo|diretor|contrata)/;
    const medium = /(interess|consultoria|consulta|or[çc]amento|pre[çc]o|demo)/;
    const low = /(curios|apenas|s[oó] curioso|só olhando|só dando uma olhada|apenas curioso)/;
    if (high.test(t)) return 10;
    if (medium.test(t)) return 7;
    if (low.test(t)) return 4;
    return "indeterminado";
  }

  function extractNote(convo: string) {
    return convo.slice(-200);
  }

  async function safeText(resp: Response) {
    try {
      const ct = resp.headers.get("content-type") || "";
      return ct.includes("application/json") ? JSON.stringify(await resp.json()) : await resp.text();
    } catch (e) {
      return String(e);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.5 }}
      className="z-10 flex justify-center"
    >
  <div className="w-[90vw] max-w-[520px] h-[80vh] my-8 flex flex-col rounded-xl overflow-hidden border border-neutral-800 bg-[#18130E]/60 backdrop-blur-md shadow-lg">
        {/* Main Title & Header inside scrollable area */}
        <div className="flex flex-col items-center pt-6 pb-2 bg-transparent">
          <span className="text-base font-normal text-center text-neutral-400 tracking-wide">Consciência é poder.</span>
          <span className="text-lg font-bold text-[#00FF9C] mt-2">ZEITH Experience IA</span>
        </div>
        {/* Main message list */}
        <main
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-3 py-3"
          ref={scrollRef}
          aria-live="polite"
          role="list"
        >
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                role="listitem"
              >
                <div
                  className={
                    m.role === "user"
                      ? "self-end max-w-[88%] rounded-2xl bg-[#00FF9C]/10 backdrop-blur-md px-4 py-2 text-[#00FF9C] text-sm leading-relaxed shadow-[0_0_10px_rgba(0,255,156,0.08)]"
                      : "self-start max-w-[88%] rounded-2xl bg-neutral-900/40 backdrop-blur-md px-4 py-2 text-neutral-200 text-sm leading-relaxed border border-neutral-800 shadow-[0_0_12px_rgba(0,0,0,0.25)]"
                  }
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
            {displayIsTyping && (
              <div className="flex items-center justify-start gap-2 text-neutral-500 italic px-4 py-2">
                <span className="h-2 w-2 bg-[#00FF9C]/70 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 bg-[#00FF9C]/70 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 bg-[#00FF9C]/70 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
        </main>
        {/* Footer / Input always visible at bottom */}
        <footer className="safe-pad safe-pad-x border-t border-neutral-800 bg-[#18130E]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 py-2">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Escreva algo…"
              inputMode="text"
              autoComplete="off"
              autoCorrect="on"
              aria-label="Campo de mensagem"
              className="flex-1 bg-neutral-900/50 backdrop-blur-sm text-neutral-200 placeholder-neutral-500 px-4 py-3 rounded-full border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#00FF9C]/40 min-h-[44px] max-h-[120px] resize-none"
              disabled={closed}
              rows={1}
              maxLength={500}
            />
            <button
              onClick={() => void sendMessage()}
              className="min-w-[44px] min-h-[44px] p-3 rounded-full bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 active:scale-95"
              aria-label="Enviar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#00FF9C]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

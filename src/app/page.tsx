"use client";

import React, { useState, useRef } from "react";
import TicketPreview from "@/components/TicketPreview";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    ticketType: "Early Bird",
    addonPin: false,
    size: "M",
    bib: Math.floor(1000 + Math.random() * 9000).toString(),
    refNo: Math.random().toString(36).substring(2, 10).toUpperCase(),
    date: "30.05.2026",
    time: "06.00 AM",
    price: "185.000",
  });

  const ticketRef = useRef<HTMLDivElement>(null);
  const ticketPage2Ref = useRef<HTMLDivElement>(null);

  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Helper to temporarily bypass html2canvas stylesheet parser crash for CSS Color level 4 functions (lab, oklch, oklab)
  const sanitizeStylesheets = () => {
    const revertedRules: { sheet: CSSStyleSheet; index: number; ruleText: string }[] = [];
    const revertedSheets: CSSStyleSheet[] = [];

    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        if (!sheet.cssRules) continue;
        for (let j = sheet.cssRules.length - 1; j >= 0; j--) {
          const ruleText = sheet.cssRules[j].cssText;
          if (
            ruleText.includes("lab(") ||
            ruleText.includes("oklab(") ||
            ruleText.includes("oklch(")
          ) {
            revertedRules.push({ sheet, index: j, ruleText });
            sheet.deleteRule(j);
          }
        }
      } catch (e) {
        // Fallback for CORS cross-origin stylesheets (Google Fonts, etc.)
        try {
          sheet.disabled = true;
          revertedSheets.push(sheet);
        } catch (err) {}
      }
    }

    return () => {
      // Restore rules in reverse order to maintain indices
      revertedRules.forEach(({ sheet, index, ruleText }) => {
        try {
          sheet.insertRule(ruleText, index);
        } catch (err) {}
      });
      // Restore disabled sheets
      revertedSheets.forEach((sheet) => {
        try {
          sheet.disabled = false;
        } catch (err) {}
      });
    };
  };

  const generatePDF = async (
    elementRef: React.RefObject<HTMLDivElement | null>,
    page2Ref: React.RefObject<HTMLDivElement | null> | null,
    fileName: string,
    setGeneratingState: (state: boolean) => void,
    orientation: "portrait" | "landscape" = "portrait"
  ) => {
    if (!elementRef.current) return;
    setGeneratingState(true);
    let restoreStyles: (() => void) | null = null;

    try {
      restoreStyles = sanitizeStylesheets();
      const element = elementRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas dimensions invalid. HTML2Canvas failed to render.");
      }
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [canvas.width * 0.75, canvas.height * 0.75],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width * 0.75, canvas.height * 0.75);

      // Jika terdapat halaman kedua statis
      if (page2Ref && page2Ref.current) {
        const canvas2 = await html2canvas(page2Ref.current, { scale: 2, useCORS: true, logging: false });
        const imgData2 = canvas2.toDataURL("image/png");
        pdf.addPage([canvas2.width * 0.75, canvas2.height * 0.75], orientation);
        pdf.addImage(imgData2, "PNG", 0, 0, canvas2.width * 0.75, canvas2.height * 0.75);
      }

      pdf.save(fileName);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error?.message || error}`);
    } finally {
      if (restoreStyles) {
        restoreStyles();
      }
      setGeneratingState(false);
    }
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmail = async () => {
    if (!ticketRef.current) return;
    if (!formData.email) {
      alert("Harap masukkan alamat email pelari terlebih dahulu.");
      return;
    }

    setIsSendingEmail(true);
    let restoreStyles: (() => void) | null = null;

    try {
      restoreStyles = sanitizeStylesheets();
      // Generate Ticket Page 1 Base64
      const ticketCanvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true, logging: false });
      const ticketImg = ticketCanvas.toDataURL("image/png");
      const ticketPdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [ticketCanvas.width * 0.75, ticketCanvas.height * 0.75] });
      ticketPdf.addImage(ticketImg, "PNG", 0, 0, ticketCanvas.width * 0.75, ticketCanvas.height * 0.75);

      // Generate Ticket Page 2 Base64 if Page 2 Ref exists
      if (ticketPage2Ref.current) {
        const canvas2 = await html2canvas(ticketPage2Ref.current, { scale: 2, useCORS: true, logging: false });
        const imgData2 = canvas2.toDataURL("image/png");
        ticketPdf.addPage([canvas2.width * 0.75, canvas2.height * 0.75], "landscape");
        ticketPdf.addImage(imgData2, "PNG", 0, 0, canvas2.width * 0.75, canvas2.height * 0.75);
      }

      const ticketBase64 = ticketPdf.output('datauristring');

      const response = await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          ticketBase64,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert("Pendaftaran dan lampiran tiket berhasil dikirim ke email!");
      } else {
        throw new Error(result.error || "Gagal memanggil API email.");
      }
    } catch (error: any) {
      console.error("Send email error:", error);
      alert(`Gagal mengirim email: ${error?.message || error}`);
    } finally {
      if (restoreStyles) {
        restoreStyles();
      }
      setIsSendingEmail(false);
    }
  };

  return (
    <main className="mx-auto p-4 flex flex-col lg:flex-row gap-6 items-start w-full min-h-screen text-xs bg-slate-100">
      {/* Left Column: Data Entry Grid (Professional ERP / Data-Dense Style) */}
      <div className="w-full lg:w-1/3 bg-white border border-slate-300 shadow-sm rounded-sm overflow-hidden flex flex-col">

        {/* Professional Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-300">
          <h2 className="text-white font-bold text-[13px] tracking-wide uppercase">DIV REGISTRASI GACOR</h2>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">Pendaftaran Breathe 5K</p>
        </div>

        {/* Data Grid Section */}
        <div className="p-0 bg-slate-50 flex-1">
          <div className="bg-slate-200 px-3 py-1.5 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Detail Data
          </div>

          <form className="w-full" onSubmit={(e) => e.preventDefault()}>
            <table className="w-full text-left" cellSpacing="0" cellPadding="0">
              <tbody>
                {/* Name Row */}
                <tr className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                  <td className="w-2/5 py-2.5 px-3 font-semibold text-slate-700 bg-slate-100/50 border-r border-slate-200">Nama Pelari</td>
                  <td className="w-3/5 py-1 px-2">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-sm text-slate-800"
                    />
                  </td>
                </tr>

                {/* Category Row */}
                <tr className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                  <td className="w-2/5 py-2.5 px-3 font-semibold text-slate-700 bg-slate-100/50 border-r border-slate-200">Kategori Tiket</td>
                  <td className="w-3/5 py-1 px-2">
                    <select
                      name="ticketType"
                      value={formData.ticketType}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-sm text-slate-800"
                    >
                      <option>Early Bird</option>
                      <option>Normal</option>
                    </select>
                  </td>
                </tr>

                {/* Pin Add-on Row */}
                <tr className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                  <td className="w-2/5 py-2.5 px-3 font-semibold text-slate-700 bg-slate-100/50 border-r border-slate-200">Add-on (Pin)</td>
                  <td className="w-3/5 py-1 px-2">
                    <select
                      name="addonPin"
                      value={formData.addonPin ? "true" : "false"}
                      onChange={(e) => setFormData(prev => ({ ...prev, addonPin: e.target.value === "true" }))}
                      className="w-full bg-white border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-sm text-slate-800"
                    >
                      <option value="false">Tidak</option>
                      <option value="true">Ya (+30k)</option>
                    </select>
                  </td>
                </tr>

                {/* Size Row */}
                <tr className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                  <td className="w-2/5 py-2.5 px-3 font-semibold text-slate-700 bg-slate-100/50 border-r border-slate-200">Ukuran Pakaian</td>
                  <td className="w-3/5 py-1 px-2">
                    <select
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-slate-300 px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-sm text-slate-800"
                    >
                      <option>S</option>
                      <option>M</option>
                      <option>L</option>
                      <option>XL</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </form>

          <div className="bg-slate-100 border-t border-slate-200 p-3 flex flex-col sm:flex-row justify-end gap-2 flex-wrap">
            <button
              type="button"
              disabled={isGeneratingTicket || !formData.name}
              onClick={() => generatePDF(ticketRef, ticketPage2Ref, `${formData.name.replace(/\s+/g, '_')}_Ticket.pdf`, setIsGeneratingTicket, "landscape")}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-600 px-4 py-2 font-semibold min-w-24 disabled:opacity-50 disabled:cursor-not-allowed rounded-sm shadow-sm transition-colors flex items-center justify-center text-[10px] uppercase tracking-wider"
            >
              {isGeneratingTicket ? "Memproses..." : "⬇ Download E-Tiket"}
            </button>
          </div>
        </div>

      </div>

      {/* Right Column: Previews wrapped in a technical border but maintaining Outfit font */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6 overflow-x-auto pb-8">
        <div className="bg-white border border-slate-300 shadow-sm rounded-sm p-4">
          <h3 className="text-slate-700 text-[11px] font-bold uppercase mb-4">Pratinjau E-Tiket</h3>

          <div className="bg-slate-100 border border-slate-300 rounded-sm p-6 w-fit overflow-auto mx-auto max-w-full">
            {/* Force the preview payload to use its required Outfit font */}
            <div className="w-fit font-[family-name:var(--font-ticket)]" ref={ticketRef}>
              <TicketPreview data={formData} />
            </div>
          </div>
        </div>
      </div>

      {/* Headless Off-Screen Render for Page 2 (Hidden from UI, but captured by html2canvas for PDF) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div 
          ref={ticketPage2Ref}
          className="relative overflow-hidden select-none"
          style={{
            width: "1200px",
            height: "600px",
            backgroundImage: "url('/ticket-page2.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    </main>
  );
}

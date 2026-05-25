import React from "react";

interface TicketProps {
  name: string;
  ticketType: string;
  addonPin: boolean;
  size: string;
  bib: string;
  refNo: string;
  receiptNo: string;
  date: string;
  time: string;
  price: string;
}

export default function TicketPreview({ data }: { data: TicketProps }) {
  return (
    <div 
      className="relative overflow-hidden rounded-xl shadow-2xl select-none font-[family-name:var(--font-outfit)]"
      style={{
        // Menggunakan dimensi asli Canva 1200x600px untuk presisi piksel 2:1 sempurna tanpa pemotongan (cropping)
        width: "1200px",
        height: "600px",
        backgroundImage: "url('/ticket-template.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dynamic Overlay Container */}
      <div className="absolute inset-0 w-full h-full" style={{ color: "#1e293b" }}>
        
        {/* 1. NAMA PESERTA */}
        <div 
          className="absolute left-[45px] top-[260px] w-[590px] h-[44px] flex items-center justify-start text-left px-8"
          // Tepat berada di tengah kotak putih input nama peserta, rata kiri dengan padding
        >
          <span className="text-2xl font-black tracking-wide uppercase" style={{ color: '#3e9bd2' }}>
            {data.name || "NAMA LENGKAP PESERTA"}
          </span>
        </div>

        {/* 2. UKURAN JERSEY */}
        <div 
          className="absolute left-[45px] top-[342px] w-[590px] h-[44px] flex items-center justify-start text-left px-8"
          // Tepat berada di tengah kotak putih input ukuran jersey, rata kiri dengan padding
        >
          <span className="text-2xl font-black tracking-wide" style={{ color: '#3e9bd2' }}>
            {data.size || "."}
          </span>
        </div>

        {/* 3. DENGAN PIN */}
        <div 
          className="absolute left-[45px] top-[419px] w-[590px] h-[44px] flex items-center justify-start text-left px-8"
          // Tepat berada di tengah kotak putih input dengan pin, rata kiri dengan padding
        >
          <span className="text-2xl font-black tracking-wide" style={{ color: '#3e9bd2' }}>
            {data.addonPin ? "YA" : "TIDAK"}
          </span>
        </div>

      </div>
    </div>
  );
}

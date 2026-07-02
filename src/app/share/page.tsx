"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCard, BusinessCard, saveCardToWallet, DEFAULT_CARD } from "@/lib/db";
import { QRCodeSVG } from "qrcode.react";
import { 
  Phone, 
  Mail, 
  Building, 
  BookmarkPlus, 
  BookmarkCheck,
  QrCode, 
  Copy, 
  Check, 
  ChevronDown, 
  ArrowLeft,
  Share2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { getGradientContrastColor, getContrastTextColor } from "@/lib/colorUtils";

function CardViewerContent() {
  const searchParams = useSearchParams();
  const cardId = searchParams.get("id") || "demo";

  const [card, setCard] = useState<BusinessCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadCard() {
      try {
        const fetchedCard = await getCard(cardId);
        if (fetchedCard) {
          setCard(fetchedCard);
        } else if (cardId === "demo") {
          setCard(DEFAULT_CARD);
        }
      } catch (error) {
        console.error("Error loading card:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCard();
  }, [cardId]);

  // Check if this card is already saved in local wallet
  useEffect(() => {
    if (!card) return;
    const wallet = localStorage.getItem("saved-cards");
    if (wallet) {
      try {
        const list = JSON.parse(wallet) as BusinessCard[];
        setIsSaved(list.some((c) => c.id === card.id));
      } catch (e) {
        console.error(e);
      }
    }
  }, [card]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveToWallet = () => {
    if (!card) return;
    saveCardToWallet(card);
    setIsSaved(true);
  };

  const handleShareLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f12] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-serenity border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">명함을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f12] text-foreground px-4 text-center">
        <h2 className="text-2xl font-bold text-rose-quartz mb-2">명함을 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-6">존재하지 않거나 삭제된 명함 링크입니다.</p>
        <Link href="/" className="px-5 py-2.5 rounded-full bg-card-bg border border-card-border hover:bg-white/5 transition text-sm">
          홈으로 가기
        </Link>
      </div>
    );
  }

  const getGradientString = (c: BusinessCard) => {
    if (c.gradientType === "radial") {
      return `radial-gradient(circle, ${c.gradientStart} 0%, ${c.gradientEnd} 100%)`;
    }
    const angle = c.gradientAngle ?? 135;
    return `linear-gradient(${angle}deg, ${c.gradientStart} 0%, ${c.gradientEnd} 100%)`;
  };



  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen w-full bg-[#0d0f12] text-foreground font-sans selection:bg-serenity/30 overflow-y-auto pb-24">
      {/* Top Header Floating Utility */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#0d0f12]/90 to-transparent backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition bg-[#0d0f12]/40 px-3 py-1.5 rounded-full border border-card-border">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>에디터</span>
        </Link>
        <div className="flex gap-2">
          <button 
            onClick={handleShareLink}
            className="flex items-center gap-1.5 text-xs bg-[#0d0f12]/40 hover:bg-[#0d0f12]/80 transition px-3 py-1.5 rounded-full border border-card-border cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-serenity" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "링크 복사됨" : "공유"}</span>
          </button>
          <button 
            onClick={() => setShowQr(!showQr)}
            className="flex items-center gap-1.5 text-xs bg-[#0d0f12]/40 hover:bg-[#0d0f12]/80 transition px-3 py-1.5 rounded-full border border-card-border cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR코드</span>
          </button>
        </div>
      </header>

      {/* SECTION 1: Business Card Front View (Full Viewport Height) */}
      <section className="relative flex flex-col items-center justify-center w-full min-h-screen px-4 py-20 snap-start">
        {/* Dynamic Glowing Background Effect */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[350px] h-[250px] sm:h-[350px] rounded-full blur-[100px] opacity-15 pointer-events-none"
          style={{
            background: card.bgType === "solid" ? card.bgColor : getGradientString(card)
          }}
        />

        {/* Outer Premium Frame */}
        <div 
          className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[1.586/1] rounded-2xl p-[1.5px] shadow-2xl transition duration-500 hover:scale-[1.02]"
          style={{
            background: card.bgType === "solid" ? card.bgColor : getGradientString(card)
          }}
        >
          {/* Card Content Wrapper */}
          <div 
            className="w-full h-full bg-[#13171f]/95 rounded-[15px] relative overflow-hidden transition-all duration-300"
            style={{
              ...(card.bgType === "image" && card.bgImageUrl ? {
                backgroundImage: `url(${card.bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              } : card.bgType === "solid" && card.bgColor ? {
                backgroundColor: card.bgColor
              } : card.bgType === "gradient" ? {
                background: getGradientString(card)
              } : {
                backgroundColor: "#13171f"
              })
            }}
          >
            {/* Dynamic SVG background support */}
            {card.bgType === "svg" && card.bgSvgContent && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-80"
                dangerouslySetInnerHTML={{ __html: card.bgSvgContent }}
              />
            )}

            {/* 기본 테두리 및 프로필 레이아웃 템플릿 적용 여부 */}
            {card.useDefaultTemplate && (
              <div 
                className="absolute inset-0 w-full h-full z-0 p-5 flex flex-col justify-between pointer-events-none border rounded-[15px]"
                style={{ borderColor: card.textColor ? `${card.textColor}26` : "rgba(255, 255, 255, 0.1)" }}
              >
                
                {/* Top Row: Info badge & Avatar */}
                <div className="flex justify-between items-start w-full">
                  <div className="flex flex-col gap-1.5 items-start">
                    <span 
                      className="text-[9px] uppercase tracking-wider font-semibold"
                      style={{ color: card.textColor || "#ffffff", opacity: 0.7 }}
                    >
                      PREVIEW CARD
                    </span>
                    {card.company && (
                      <span 
                        className="text-[10px] font-medium px-3 py-1 rounded-full border backdrop-blur-md"
                        style={{
                          color: card.textColor || "#ffffff",
                          borderColor: card.textColor ? `${card.textColor}33` : "rgba(255, 255, 255, 0.2)",
                          backgroundColor: card.textColor === "#0f172a" ? "rgba(255, 255, 255, 0.3)" : "rgba(13, 23, 31, 0.6)"
                        }}
                      >
                        {card.company}
                      </span>
                    )}
                  </div>
                  
                  {/* 둥근 프로필 아바타 프레임 */}
                  <div 
                    className="w-14 h-14 rounded-full p-[1.5px]"
                    style={{
                      background: card.bgType === "solid" ? card.bgColor : getGradientString(card)
                    }}
                  >
                    {card.avatarUrl ? (
                      <div className="w-full h-full rounded-full overflow-hidden relative pointer-events-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={card.avatarUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover bg-neutral-800 origin-center select-none"
                          style={{
                            transform: `scale(${card.avatarZoom ?? 1}) translate(${(card.avatarX ?? 0) / (card.avatarZoom ?? 1)}%, ${(card.avatarY ?? 0) / (card.avatarZoom ?? 1)}%)`
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full h-full rounded-full bg-neutral-900/40 flex items-center justify-center text-[10px] font-bold"
                        style={{ color: card.textColor || "#ffffff", opacity: 0.7 }}
                      >
                        IMG
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Name Block */}
                <div className="flex flex-col gap-0.5 items-start mt-auto">
                  <div className="flex items-baseline gap-1.5">
                    <h1 
                      className="text-xl font-bold tracking-tight"
                      style={{ color: card.textColor || "#ffffff" }}
                    >
                      {card.name || "이름"}
                    </h1>
                    {card.engName && (
                      <span 
                        className="text-xs font-light italic"
                        style={{ color: card.textColor || "#ffffff", opacity: 0.7 }}
                      >
                        {card.engName}
                      </span>
                    )}
                  </div>
                  {card.phone && (
                    <span 
                      className="text-[11px] font-mono tracking-wide"
                      style={{ color: card.textColor || "#ffffff", opacity: 0.8 }}
                    >
                      {card.phone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Render dynamically created shapes (Figma elements) */}
            {!card.useDefaultTemplate && (card.shapes || []).map((shape) => {
              const shapeStyle: React.CSSProperties = {
                position: "absolute",
                left: `${shape.x}%`,
                top: `${shape.y}%`,
                width: `${shape.width}%`,
                height: `${shape.height}%`,
                zIndex: 10
              };

              if (shape.type === "rect") {
                return (
                  <div
                    key={shape.id}
                    style={{
                      ...shapeStyle,
                      backgroundColor: shape.color,
                      borderRadius: "2px"
                    }}
                  />
                );
              }

              if (shape.type === "circle") {
                return (
                  <div
                    key={shape.id}
                    style={{
                      ...shapeStyle,
                      backgroundColor: shape.color,
                      borderRadius: "9999px"
                    }}
                  />
                );
              }

              if (shape.type === "text") {
                // 실시간 데이터 바인딩 렌더링
                const textToShow = shape.bindField 
                  ? (card[shape.bindField] || "") 
                  : (shape.text || "");

                return (
                  <div
                    key={shape.id}
                    className={`flex items-center overflow-hidden leading-none ${
                      shape.fontWeight === "bold" ? "font-bold" : "font-normal"
                    }`}
                    style={{
                      ...shapeStyle,
                      color: shape.color,
                      fontSize: `${(shape.fontSize || 14) * 0.9}px`,
                    }}
                  >
                    {textToShow}
                  </div>
                );
              }

              return null;
            })}

            {/* Fallback layout if no shapes are present */}
            {!card.useDefaultTemplate && (!card.shapes || card.shapes.length === 0) && (
              <div className="w-full h-full p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">MYEONGHAM</span>
                  <div className="w-12 h-12 rounded-full bg-neutral-800" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{card.name}</h1>
                  <span className="text-xs text-muted-foreground">{card.company}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator Micro-animation */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1.5 animate-bounce text-muted-foreground text-[10px] tracking-widest uppercase">
          <span>신상 정보 스크롤</span>
          <ChevronDown className="w-4 h-4 text-serenity" />
        </div>
      </section>

      {/* SECTION 2: Personal Details & Contact */}
      <section className="w-full max-w-[450px] px-6 py-12 flex flex-col gap-8 snap-start border-t border-card-border/50">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-serenity">CONTACT DETAILS</span>
          <h2 className="text-xl font-semibold">신상 정보</h2>
        </div>

        <div className="flex flex-col rounded-2xl bg-card-bg border border-card-border overflow-hidden backdrop-blur-md">
          {card.phone && (
            <div className="flex items-center justify-between p-4 border-b border-card-border group hover:bg-white/1 transition duration-300">
              <a href={`tel:${card.phone}`} className="flex items-center gap-3.5 flex-1 select-none">
                <div className="p-2.5 rounded-xl bg-serenity/10 text-serenity border border-serenity/20 group-hover:scale-105 transition">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">휴대전화</span>
                  <span className="text-sm font-medium tracking-wide font-mono">{card.phone}</span>
                </div>
              </a>
              <button 
                onClick={() => handleCopy(card.phone!, "phone")}
                className="p-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition"
              >
                {copiedField === "phone" ? <Check className="w-4 h-4 text-serenity" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {card.companyPhone && (
            <div className="flex items-center justify-between p-4 border-b border-card-border group hover:bg-white/1 transition duration-300">
              <a href={`tel:${card.companyPhone}`} className="flex items-center gap-3.5 flex-1 select-none">
                <div className="p-2.5 rounded-xl bg-rose-quartz/10 text-rose-quartz border border-rose-quartz/20 group-hover:scale-105 transition">
                  <Building className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">회사 번호</span>
                  <span className="text-sm font-medium tracking-wide font-mono">{card.companyPhone}</span>
                </div>
              </a>
              <button 
                onClick={() => handleCopy(card.companyPhone!, "companyPhone")}
                className="p-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition"
              >
                {copiedField === "companyPhone" ? <Check className="w-4 h-4 text-serenity" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {card.email && (
            <div className="flex items-center justify-between p-4 group hover:bg-white/1 transition duration-300">
              <a href={`mailto:${card.email}`} className="flex items-center gap-3.5 flex-1 select-none">
                <div className="p-2.5 rounded-xl bg-serenity/10 text-serenity border border-serenity/20 group-hover:scale-105 transition">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">이메일 주소</span>
                  <span className="text-sm font-medium tracking-wide">{card.email}</span>
                </div>
              </a>
              <button 
                onClick={() => handleCopy(card.email!, "email")}
                className="p-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-white/5 transition"
              >
                {copiedField === "email" ? <Check className="w-4 h-4 text-serenity" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: Bio / Introduction */}
      {card.bio && (
        <section className="w-full max-w-[450px] px-6 py-12 flex flex-col gap-6 snap-start border-t border-card-border/50">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-quartz">INTRODUCTION</span>
            <h2 className="text-xl font-semibold">자기 소개</h2>
          </div>
          
          <div className="p-6 rounded-2xl bg-card-bg border border-card-border backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-serenity to-rose-quartz" />
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line pl-2">
              {card.bio}
            </p>
          </div>
        </section>
      )}

      {/* SECTION 4: Social & Portfolio Links */}
      {card.links && card.links.length > 0 && (
        <section className="w-full max-w-[450px] px-6 py-12 flex flex-col gap-6 snap-start border-t border-card-border/50">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-serenity">PORTFOLIOS & SNS</span>
            <h2 className="text-xl font-semibold">프로필 링크</h2>
          </div>

          <div className="flex flex-col gap-3">
            {card.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-2xl bg-card-bg border border-card-border backdrop-blur-md group hover:bg-white/5 transition duration-300 cursor-pointer"
              >
                <div className="flex items-center flex-1">
                  {/* 왼쪽 사진/아이콘 */}
                  {link.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={link.iconUrl}
                      alt={link.title}
                      className="w-11 h-11 rounded-xl object-cover border border-card-border bg-neutral-900 mr-3.5 group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl border border-card-border bg-neutral-900/60 flex items-center justify-center mr-3.5 text-muted-foreground text-xs font-bold uppercase">
                      LINK
                    </div>
                  )}

                  {/* 가운데 글 */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-serenity transition">
                      {link.title || "링크 바로가기"}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[200px]">
                      {link.url}
                    </span>
                  </div>
                </div>

                {/* 오른쪽 얇은 색깔 선 */}
                <div 
                  className="w-[3px] h-9 rounded-full ml-3"
                  style={{ backgroundColor: link.borderColor || "#92a8d1" }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Floating Wallet / Save Button */}
      <footer className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6 pointer-events-none">
        <button
          onClick={handleSaveToWallet}
          disabled={isSaved}
          className={`pointer-events-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer ${
            isSaved 
              ? "bg-[#13171f] text-muted-foreground border border-card-border" 
              : "bg-gradient-to-r from-serenity to-rose-quartz text-slate-900 border-none"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-4 h-4 text-serenity" />
              <span>명함첩에 저장됨</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="w-4 h-4" />
              <span>내 명함첩에 추가</span>
            </>
          )}
        </button>
      </footer>

      {/* QR Code Modal Overlay */}
      {showQr && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setShowQr(false)}
        >
          <div 
            className="w-full max-w-[320px] bg-[#13171f] border border-card-border rounded-3xl p-6 flex flex-col items-center gap-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <h3 className="text-lg font-bold text-foreground">명함 QR코드</h3>
              <p className="text-xs text-muted-foreground">이 QR코드를 스캔하면 명함을 즉시 확인할 수 있습니다.</p>
            </div>
            
            <div className="p-4 bg-white rounded-2xl shadow-inner flex items-center justify-center">
              <QRCodeSVG 
                value={typeof window !== "undefined" ? window.location.href : ""}
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
              />
            </div>

            <button 
              onClick={() => setShowQr(false)}
              className="w-full py-2.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 transition border border-card-border text-foreground cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShareCardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f12] text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-serenity border-t-transparent"></div>
      </div>
    }>
      <CardViewerContent />
    </Suspense>
  );
}

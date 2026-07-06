"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BusinessCard,
  CardShape,
  DEFAULT_CARD,
  saveCard,
  getSavedCards,
  removeCardFromWallet,
  getCard
} from "@/lib/db";
import { getGradientContrastColor, getContrastTextColor, hashPassword, copyToClipboard } from "@/lib/colorUtils";
import { QRCodeSVG } from "qrcode.react";
import {
  Settings,
  User,
  Phone,
  Mail,
  Building,
  FileText,
  Palette,
  Save,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FolderOpen,
  Plus,
  Sparkles,
  Type,
  Square,
  Circle as CircleIcon,
  Layers,
  ArrowRight,
  Bold,
  Image as ImageIcon,
  Code,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Preferences } from "@capacitor/preferences";

export default function AppDashboard() {
  const router = useRouter();
  // My Card State
  const [myCard, setMyCard] = useState<BusinessCard>(DEFAULT_CARD);
  const [walletCards, setWalletCards] = useState<BusinessCard[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "wallet">("edit");
  const [publishStatus, setPublishStatus] = useState<"idle" | "saving" | "success">("idle");
  const [copiedLink, setCopiedLink] = useState(false);
  const [customCardId, setCustomCardId] = useState("my-first-card");

  // Password-related States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalType, setPasswordModalType] = useState<"set" | "verify">("set");
  const [inputPassword, setInputPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingCard, setPendingCard] = useState<BusinessCard | null>(null);

  // Profile Avatar Dragging States
  const [isAvatarDragging, setIsAvatarDragging] = useState(false);
  const avatarDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Figma Canvas Editing States
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; shapeX: number; shapeY: number } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; shapeW: number; shapeH: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Load my saved card and wallet from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMyCard = localStorage.getItem("my-business-card");
      if (savedMyCard) {
        try {
          const parsed = JSON.parse(savedMyCard) as BusinessCard;
          // Ensure new fields exist
          if (!parsed.shapes) parsed.shapes = DEFAULT_CARD.shapes;
          if (!parsed.bgType) parsed.bgType = "gradient";
          if (parsed.bgSvgContent === undefined) parsed.bgSvgContent = "";
          if (parsed.bgImageUrl === undefined) parsed.bgImageUrl = "";
          if (parsed.useDefaultTemplate === undefined) parsed.useDefaultTemplate = true;
          setMyCard(parsed);
        } catch (e) {
          console.error(e);
        }
      }
      setWalletCards(getSavedCards());
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMyCard((prev) => {
      const updated = { ...prev, [name]: value };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  const handleStyleChange = (name: string, value: string | number | boolean) => {
    setMyCard((prev) => {
      let updated = { ...prev, [name]: value };

      // Automatically recalculate optimal textColor on background-related changes
      if (["gradientStart", "gradientEnd", "bgColor", "bgType", "gradientType"].includes(name)) {
        const bgType = updated.bgType;
        const contrastColorClass = bgType === "gradient"
          ? getGradientContrastColor(updated.gradientStart, updated.gradientEnd)
          : bgType === "solid" && updated.bgColor
            ? getContrastTextColor(updated.bgColor)
            : "text-white";

        updated.textColor = contrastColorClass === "text-slate-900" ? "#0f172a" : "#ffffff";
      }

      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  // Canvas shapes modifier
  const updateShapes = (newShapes: CardShape[]) => {
    setMyCard((prev) => {
      const updated = { ...prev, shapes: newShapes };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  // Add Shape
  const addShape = (type: "rect" | "circle" | "text") => {
    const newShape: CardShape = {
      id: `sh-${Date.now()}`,
      type,
      x: 35,
      y: 35,
      width: type === "text" ? 35 : 12,
      height: type === "text" ? 6 : 12,
      color: type === "text" ? "#ffffff" : (type === "rect" ? "#92a8d1" : "#f7caca"),
      text: type === "text" ? "텍스트 문구" : undefined,
      fontSize: type === "text" ? 14 : undefined,
      fontWeight: type === "text" ? "normal" : undefined,
    };
    const updated = [...myCard.shapes, newShape];
    updateShapes(updated);
    setSelectedShapeId(newShape.id);
  };

  // Delete Selected Shape
  const deleteSelectedShape = () => {
    if (!selectedShapeId) return;
    const updated = myCard.shapes.filter((s) => s.id !== selectedShapeId);
    updateShapes(updated);
    setSelectedShapeId(null);
  };

  // Modify Active Shape properties
  const handleShapePropChange = (prop: keyof CardShape, value: string | number | boolean | null) => {
    if (!selectedShapeId) return;
    const updated = myCard.shapes.map((shape) => {
      if (shape.id === selectedShapeId) {
        if (value === null) {
          const { [prop]: _, ...rest } = shape;
          return rest as CardShape;
        }
        return { ...shape, [prop]: value };
      }
      return shape;
    });
    updateShapes(updated);
  };

  // Interactive Drag handler (Move element)
  const handlePointerDown = (e: React.PointerEvent, shapeId: string) => {
    e.stopPropagation();
    setSelectedShapeId(shapeId);

    const shape = myCard.shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      shapeX: shape.x,
      shapeY: shape.y
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, shapeId: string) => {
    if (!isDragging || !dragStartRef.current || !canvasRef.current) return;
    e.stopPropagation();

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const dragStart = dragStartRef.current;

    const deltaX = e.clientX - dragStart.mouseX;
    const deltaY = e.clientY - dragStart.mouseY;

    const deltaPctX = (deltaX / canvasRect.width) * 100;
    const deltaPctY = (deltaY / canvasRect.height) * 100;

    const shape = myCard.shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const nextX = Math.max(0, Math.min(100 - shape.width, Math.round(dragStart.shapeX + deltaPctX)));
    const nextY = Math.max(0, Math.min(100 - shape.height, Math.round(dragStart.shapeY + deltaPctY)));

    const updated = myCard.shapes.map((s) => {
      if (s.id === shapeId) {
        return { ...s, x: nextX, y: nextY };
      }
      return s;
    });
    updateShapes(updated);
  };

  // Resizing Handler (Resize element via bottom-right handle)
  const handleResizePointerDown = (e: React.PointerEvent, shapeId: string) => {
    e.stopPropagation();
    setSelectedShapeId(shapeId);

    const shape = myCard.shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      shapeW: shape.width,
      shapeH: shape.height
    };
    setIsResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent, shapeId: string) => {
    if (!isResizing || !resizeStartRef.current || !canvasRef.current) return;
    e.stopPropagation();

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const resizeStart = resizeStartRef.current;

    const deltaX = e.clientX - resizeStart.mouseX;
    const deltaY = e.clientY - resizeStart.mouseY;

    const deltaPctX = (deltaX / canvasRect.width) * 100;
    const deltaPctY = (deltaY / canvasRect.height) * 100;

    const shape = myCard.shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    const nextW = Math.max(5, Math.min(100 - shape.x, Math.round(resizeStart.shapeW + deltaPctX)));
    const nextH = Math.max(3, Math.min(100 - shape.y, Math.round(resizeStart.shapeH + deltaPctY)));

    const updated = myCard.shapes.map((s) => {
      if (s.id === shapeId) {
        return { ...s, width: nextW, height: nextH };
      }
      return s;
    });
    updateShapes(updated);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
    if (isResizing) {
      setIsResizing(false);
      resizeStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }
  };

  const handleAvatarPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsAvatarDragging(true);
    avatarDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: myCard.avatarX || 0,
      startY: myCard.avatarY || 0
    };
  };

  const handleAvatarPointerMove = (e: React.PointerEvent) => {
    if (!isAvatarDragging || !avatarDragStartRef.current) return;
    e.stopPropagation();
    const dragStart = avatarDragStartRef.current;
    const deltaX = e.clientX - dragStart.mouseX;
    const deltaY = e.clientY - dragStart.mouseY;

    // 감도 및 줌에 비례한 이동 비율 가감
    const zoom = myCard.avatarZoom || 1;
    const scaleFactor = 0.5;
    const nextX = dragStart.startX + deltaX * scaleFactor;
    const nextY = dragStart.startY + deltaY * scaleFactor;

    const clampedX = Math.max(-150, Math.min(150, nextX));
    const clampedY = Math.max(-150, Math.min(150, nextY));

    setMyCard((prev) => {
      const updated = {
        ...prev,
        avatarX: clampedX,
        avatarY: clampedY
      };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAvatarPointerUp = (e: React.PointerEvent) => {
    if (isAvatarDragging) {
      setIsAvatarDragging(false);
      avatarDragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePublish = async () => {
    setPublishStatus("saving");
    const targetId = customCardId.trim() || `card-${Date.now().toString().slice(-6)}`;
    const updatedCard = {
      ...myCard,
      id: targetId,
      createdAt: Date.now()
    };

    try {
      const existingCard = await getCard(targetId);
      if (existingCard) {
        if (existingCard.password) {
          // 비밀번호 매칭 유도
          setPendingCard(updatedCard);
          setPasswordModalType("verify");
          setInputPassword("");
          setPasswordError("");
          setShowPasswordModal(true);
          setPublishStatus("idle");
          return;
        } else {
          // 비밀번호 미등록 명함 -> 비밀번호 지정 강제
          setPendingCard(updatedCard);
          setPasswordModalType("set");
          setInputPassword("");
          setPasswordError("");
          setShowPasswordModal(true);
          setPublishStatus("idle");
          return;
        }
      } else {
        // 신규 등록 시에도 비밀번호 설정 요구
        setPendingCard(updatedCard);
        setPasswordModalType("set");
        setInputPassword("");
        setPasswordError("");
        setShowPasswordModal(true);
        setPublishStatus("idle");
        return;
      }
    } catch (err) {
      console.error("Error checking existing card, auto saving:", err);
      await savePublish(updatedCard);
    }
  };

  const savePublish = async (card: BusinessCard) => {
    setPublishStatus("saving");
    await saveCard(card);
    setMyCard(card);
    localStorage.setItem("my-business-card", JSON.stringify(card));

    try {
      await Preferences.set({
        key: "my_card_id",
        value: card.id,
      });
      console.log("Card ID synced to native preferences for HCE.");
    } catch (e) {
      console.warn("Capacitor Preferences not available in this environment (likely Web).");
    }

    setPublishStatus("success");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCard) return;

    if (passwordModalType === "set") {
      if (!inputPassword.trim()) {
        setPasswordError("비밀번호를 입력해주세요.");
        return;
      }
      const hashed = await hashPassword(inputPassword);
      const cardWithPassword = {
        ...pendingCard,
        password: hashed
      };
      await savePublish(cardWithPassword);
      setShowPasswordModal(false);
      setPendingCard(null);
    } else {
      try {
        const existingCard = await getCard(pendingCard.id);
        const hashedInput = await hashPassword(inputPassword);
        if (existingCard && existingCard.password === hashedInput) {
          const cardWithPassword = {
            ...pendingCard,
            password: hashedInput
          };
          await savePublish(cardWithPassword);
          setShowPasswordModal(false);
          setPendingCard(null);
        } else {
          setPasswordError("비밀번호가 일치하지 않습니다.");
        }
      } catch (err) {
        setPasswordError("비밀번호 확인 중 오류가 발생했습니다.");
      }
    }
  };

  // 1. JSON 파일로 내보내기 (JSON Download)
  const exportCardAsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(myCard, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `myeongham-${myCard.id || "card"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 2. JSON 파일로부터 명함 가져오기 (JSON Upload)
  const importCardFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && typeof parsed === "object" && parsed.id) {
            setMyCard(parsed);
            setCustomCardId(parsed.id);
            localStorage.setItem("my-business-card", JSON.stringify(parsed));
            alert("명함 데이터를 성공적으로 불러왔습니다!");
          } else {
            alert("올바른 명함 데이터 JSON 파일이 아닙니다.");
          }
        } catch (err) {
          alert("파일 파싱 중 에러가 발생했습니다.");
        }
      };
    }
  };

  // 3. PNG 이미지로 다운로드 (HTML5 Canvas를 사용하여 오프스크린 렌더링)
  const exportCardAsImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 504;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 둥근 사각형 클리핑 경로 그리기 (명함 모서리 둥글게)
    const radius = 32;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();

    // 1. 배경 채우기
    if (myCard.bgType === "solid" && myCard.bgColor) {
      ctx.fillStyle = myCard.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (myCard.bgType === "gradient") {
      let grad;
      if (myCard.gradientType === "radial") {
        grad = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
      } else {
        const angleRad = ((myCard.gradientAngle ?? 135) * Math.PI) / 180;
        const halfW = canvas.width / 2;
        const halfH = canvas.height / 2;
        const x0 = halfW - Math.cos(angleRad) * halfW;
        const y0 = halfH - Math.sin(angleRad) * halfH;
        const x1 = halfW + Math.cos(angleRad) * halfW;
        const y1 = halfH + Math.sin(angleRad) * halfH;
        grad = ctx.createLinearGradient(x0, y0, x1, y1);
      }
      grad.addColorStop(0, myCard.gradientStart);
      grad.addColorStop(1, myCard.gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (myCard.bgType === "image" && myCard.bgImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = myCard.bgImageUrl;
      img.onload = () => {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        drawCardElements(ctx, canvas);
        downloadCanvas(canvas);
      };
      img.onerror = () => {
        ctx.fillStyle = "#13171f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawCardElements(ctx, canvas);
        downloadCanvas(canvas);
      };
      return;
    } else {
      ctx.fillStyle = "#13171f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawCardElements(ctx, canvas);
    downloadCanvas(canvas);
  };

  const drawCardElements = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const txtColor = myCard.textColor || "#ffffff";
    const mutedTxtColor = txtColor === "#0f172a" ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)";

    if (myCard.useDefaultTemplate) {
      ctx.strokeStyle = txtColor === "#0f172a" ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = mutedTxtColor;
      ctx.fillText("PREVIEW CARD", 40, 60);

      if (myCard.company) {
        const companyText = myCard.company;
        ctx.font = "medium 20px sans-serif";
        const badgeWidth = ctx.measureText(companyText).width + 30;
        ctx.fillStyle = txtColor === "#0f172a" ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.roundRect(40, 85, badgeWidth, 36, 18);
        ctx.fill();
        ctx.strokeStyle = txtColor === "#0f172a" ? "rgba(15, 23, 42, 0.2)" : "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = txtColor;
        ctx.fillText(companyText, 55, 111);
      }

      if (myCard.avatarUrl) {
        const avatarImg = new Image();
        avatarImg.crossOrigin = "anonymous";
        avatarImg.src = myCard.avatarUrl;
        avatarImg.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(canvas.width - 90, 90, 50, 0, Math.PI * 2);
          ctx.clip();
          
          const zoom = myCard.avatarZoom || 1.0;
          const offX = myCard.avatarX || 0;
          const offY = myCard.avatarY || 0;
          const drawW = 100 * zoom;
          const drawH = 100 * zoom;
          const drawX = (canvas.width - 90) - (drawW / 2) + offX;
          const drawY = 90 - (drawH / 2) + offY;

          ctx.drawImage(avatarImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        };
      } else {
        ctx.beginPath();
        ctx.arc(canvas.width - 90, 90, 50, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fill();
        ctx.fillStyle = mutedTxtColor;
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("IMG", canvas.width - 90, 96);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = txtColor;
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(myCard.name || "이름", 40, canvas.height - 100);

      const nameWidth = ctx.measureText(myCard.name || "이름").width;
      if (myCard.engName) {
        ctx.fillStyle = mutedTxtColor;
        ctx.font = "300 24px sans-serif";
        ctx.fillText(myCard.engName, 40 + nameWidth + 15, canvas.height - 104);
      }

      if (myCard.phone) {
        ctx.fillStyle = mutedTxtColor;
        ctx.font = "18px monospace";
        ctx.fillText(myCard.phone, 40, canvas.height - 50);
      }
    } else {
      myCard.shapes.forEach((shape) => {
        const sx = (shape.x / 100) * canvas.width;
        const sy = (shape.y / 100) * canvas.height;
        const sw = (shape.width / 100) * canvas.width;
        const sh = (shape.height / 100) * canvas.height;

        ctx.fillStyle = shape.color;

        if (shape.type === "rect") {
          ctx.fillRect(sx, sy, sw, sh);
        } else if (shape.type === "circle") {
          ctx.beginPath();
          const cx = sx + sw / 2;
          const cy = sy + sh / 2;
          const r = Math.min(sw, sh) / 2;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.type === "text") {
          const fontSizePx = (shape.fontSize || 14) * 2;
          ctx.font = `${shape.fontWeight === "bold" ? "bold" : "normal"} ${fontSizePx}px sans-serif`;
          ctx.textBaseline = "middle";

          const textToShow = shape.bindField
            ? (myCard[shape.bindField] || "")
            : (shape.text || "");
          ctx.fillText(textToShow, sx, sy + sh / 2);
        }
      });
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUrl);
      downloadAnchor.setAttribute("download", `myeongham-${myCard.id || "card"}.png`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("도메인이 다르거나 외부 이미지가 포함되어 캔버스 다운로드를 진행할 수 없습니다. 대신 JSON 백업 기능을 사용해 주세요.");
    }
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/share/?id=${myCard.id}`;
    copyToClipboard(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteFromWallet = (cardId: string) => {
    removeCardFromWallet(cardId);
    setWalletCards(getSavedCards());
  };

  const addProfileLink = () => {
    const newLink = {
      id: `link-${Date.now()}`,
      title: "",
      url: "",
      borderColor: "#92a8d1"
    };
    setMyCard((prev) => {
      const updated = {
        ...prev,
        links: [...(prev.links || []), newLink]
      };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  const updateProfileLink = (linkId: string, field: string, value: string) => {
    setMyCard((prev) => {
      const updatedLinks = (prev.links || []).map((lnk) => {
        if (lnk.id === linkId) {
          return { ...lnk, [field]: value };
        }
        return lnk;
      });
      const updated = { ...prev, links: updatedLinks };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  const deleteProfileLink = (linkId: string) => {
    setMyCard((prev) => {
      const updatedLinks = (prev.links || []).filter((lnk) => lnk.id !== linkId);
      const updated = { ...prev, links: updatedLinks };
      localStorage.setItem("my-business-card", JSON.stringify(updated));
      return updated;
    });
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/?id=${myCard.id}` : "";
  const activeShape = myCard.shapes.find((s) => s.id === selectedShapeId);

  // Helper to generate the CSS gradient string based on user settings
  const getGradientString = (card: BusinessCard) => {
    if (card.gradientType === "radial") {
      return `radial-gradient(circle, ${card.gradientStart} 0%, ${card.gradientEnd} 100%)`;
    }
    const angle = card.gradientAngle ?? 135;
    return `linear-gradient(${angle}deg, ${card.gradientStart} 0%, ${card.gradientEnd} 100%)`;
  };

  const getCardBackgroundStyle = (): React.CSSProperties => {
    if (myCard.bgType === "solid" && myCard.bgColor) {
      return {
        backgroundColor: myCard.bgColor,
      };
    }
    if (myCard.bgType === "image" && myCard.bgImageUrl) {
      return {
        backgroundImage: `url(${myCard.bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    if (myCard.bgType === "gradient") {
      return {
        background: getGradientString(myCard),
      };
    }
    return {
      backgroundColor: "#13171f",
    };
  };

  const contrastColor = myCard.bgType === "gradient"
    ? getGradientContrastColor(myCard.gradientStart, myCard.gradientEnd)
    : myCard.bgType === "solid" && myCard.bgColor
      ? getContrastTextColor(myCard.bgColor)
      : "text-white";
  const mutedContrastColor = contrastColor === 'text-slate-900' ? 'text-slate-700' : 'text-white/70';

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f12] text-foreground font-sans pb-16">
      <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-[#92a8d1]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-[#f7caca]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-card-border/50 z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-serenity to-rose-quartz flex items-center justify-center shadow-md">
            <Sparkles className="w-4.5 h-4.5 text-slate-900" />
          </div>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-serenity to-rose-quartz bg-clip-text text-transparent">
            Myeongham
          </span>
        </div>

        {/* Tab Toggle buttons */}
        <div className="flex bg-card-bg border border-card-border p-1 rounded-full">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === "edit" ? "bg-gradient-to-r from-serenity to-rose-quartz text-slate-900 shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            명함 메이커
          </button>
          <button
            onClick={() => {
              setActiveTab("wallet");
              setWalletCards(getSavedCards());
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${activeTab === "wallet" ? "bg-gradient-to-r from-serenity to-rose-quartz text-slate-900 shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            내 명함첩 ({walletCards.length})
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 z-10 flex flex-col lg:flex-row gap-8 justify-center items-start">
        {activeTab === "edit" ? (
          <>
            {/* LEFT SIDE: Figma Style Live Interactive Canvas */}
            <div className="w-full lg:w-[46%] flex flex-col gap-6 lg:sticky lg:top-6">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-serenity uppercase tracking-widest">LIVE INTERACTIVE CANVAS</span>
                  <h2 className="text-lg font-bold">명함 디자인 캔버스</h2>
                </div>
                <span className="text-xs text-muted-foreground font-light">도형 크기 조절은 모서리를 당기세요</span>
              </div>

              {/* Interactive Design Board Wrapper */}
              <div
                ref={canvasRef}
                className="w-full aspect-[1.586/1] rounded-2xl p-[1.5px] shadow-2xl relative select-none overflow-hidden"
                style={{
                  background: myCard.bgType === "gradient"
                    ? getGradientString(myCard)
                    : myCard.bgType === "solid"
                      ? myCard.bgColor
                      : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)"
                }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    setSelectedShapeId(null);
                  }
                }} // Click canvas blank space to deselect
              >
                {/* Visual Glass Inner Card Workspace */}
                <div
                  className="w-full h-full bg-[#13171f]/95 rounded-[15px] relative overflow-hidden transition-all duration-300"
                  style={getCardBackgroundStyle()}
                >
                  {/* Dynamic SVG background support */}
                  {myCard.bgType === "svg" && myCard.bgSvgContent && (
                    <div
                      className="absolute inset-0 z-0 pointer-events-none opacity-80"
                      dangerouslySetInnerHTML={{ __html: myCard.bgSvgContent }}
                    />
                  )}

                  {/* 1. 원래 스크린샷 템플릿 디자인 오버레이 (useDefaultTemplate이 true일 때만) */}
                  {myCard.useDefaultTemplate && (
                    <div 
                      className="absolute inset-0 w-full h-full z-0 p-5 flex flex-col justify-between pointer-events-none"
                    >

                      {/* Top Row: Info badge & Avatar */}
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span 
                            className="text-[9px] uppercase tracking-wider font-semibold"
                            style={{ color: myCard.textColor || "#ffffff", opacity: 0.7 }}
                          >
                            PREVIEW CARD
                          </span>
                          {myCard.company && (
                            <span 
                              className="text-[10px] font-medium px-3 py-1 rounded-full border backdrop-blur-md"
                              style={{
                                color: myCard.textColor || "#ffffff",
                                borderColor: myCard.textColor ? `${myCard.textColor}33` : "rgba(255, 255, 255, 0.2)",
                                backgroundColor: myCard.textColor === "#0f172a" ? "rgba(255, 255, 255, 0.3)" : "rgba(13, 23, 31, 0.6)"
                              }}
                            >
                              {myCard.company}
                            </span>
                          )}
                        </div>

                        {/* 둥근 프로필 아바타 프레임 */}
                        <div
                          className="w-14 h-14 rounded-full p-[1.5px] select-none cursor-move relative"
                          style={{
                            background: getGradientString(myCard)
                          }}
                          onPointerDown={handleAvatarPointerDown}
                          onPointerMove={handleAvatarPointerMove}
                          onPointerUp={handleAvatarPointerUp}
                        >
                          {myCard.avatarUrl ? (
                            <div className="w-full h-full rounded-full overflow-hidden relative pointer-events-none">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={myCard.avatarUrl}
                                alt="Profile"
                                className="w-full h-full object-cover bg-neutral-800 origin-center select-none"
                                style={{
                                  transform: `scale(${myCard.avatarZoom ?? 1}) translate(${(myCard.avatarX ?? 0) / (myCard.avatarZoom ?? 1)}%, ${(myCard.avatarY ?? 0) / (myCard.avatarZoom ?? 1)}%)`
                                }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-full h-full rounded-full bg-neutral-900/40 flex items-center justify-center text-[10px] font-bold"
                              style={{ color: myCard.textColor || "#ffffff", opacity: 0.7 }}
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
                            style={{ color: myCard.textColor || "#ffffff" }}
                          >
                            {myCard.name || "이름"}
                          </h1>
                          {myCard.engName && (
                            <span 
                              className="text-xs font-light italic"
                              style={{ color: myCard.textColor || "#ffffff", opacity: 0.7 }}
                            >
                              {myCard.engName}
                            </span>
                          )}
                        </div>
                        {myCard.phone && (
                          <span 
                            className="text-[11px] font-mono tracking-wide"
                            style={{ color: myCard.textColor || "#ffffff", opacity: 0.8 }}
                          >
                            {myCard.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. Render custom user shapes dynamically using relative percent layout */}
                  {!myCard.useDefaultTemplate && myCard.shapes.map((shape) => {
                    const isSelected = shape.id === selectedShapeId;

                    // Box styling positioning
                    const shapeStyle: React.CSSProperties = {
                      position: "absolute",
                      left: `${shape.x}%`,
                      top: `${shape.y}%`,
                      width: `${shape.width}%`,
                      height: `${shape.height}%`,
                      cursor: isDragging ? "grabbing" : (isResizing ? "se-resize" : "grab"),
                      zIndex: isSelected ? 30 : 10,
                      touchAction: "none"
                    };

                    const handleEl = isSelected && (
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, shape.id)}
                        onPointerMove={(e) => handleResizePointerMove(e, shape.id)}
                        onPointerUp={handlePointerUp}
                        className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-serenity border border-white rounded-full z-40 translate-x-1/2 translate-y-1/2 cursor-se-resize shadow-md"
                        style={{ touchAction: "none" }}
                      />
                    );

                    if (shape.type === "rect") {
                      return (
                        <div
                          key={shape.id}
                          onPointerDown={(e) => handlePointerDown(e, shape.id)}
                          onPointerMove={(e) => handlePointerMove(e, shape.id)}
                          onPointerUp={handlePointerUp}
                          className={`rounded-sm transition-shadow duration-200 relative ${isSelected ? "ring-2 ring-serenity ring-offset-2 ring-offset-[#13171f]" : ""
                            }`}
                          style={{
                            ...shapeStyle,
                            backgroundColor: shape.color,
                          }}
                        >
                          {handleEl}
                        </div>
                      );
                    }

                    if (shape.type === "circle") {
                      return (
                        <div
                          key={shape.id}
                          onPointerDown={(e) => handlePointerDown(e, shape.id)}
                          onPointerMove={(e) => handlePointerMove(e, shape.id)}
                          onPointerUp={handlePointerUp}
                          className={`rounded-full transition-shadow duration-200 relative ${isSelected ? "ring-2 ring-serenity ring-offset-2 ring-offset-[#13171f]" : ""
                            }`}
                          style={{
                            ...shapeStyle,
                            backgroundColor: shape.color,
                          }}
                        >
                          {handleEl}
                        </div>
                      );
                    }

                    if (shape.type === "text") {
                      const textToShow = shape.bindField
                        ? (myCard[shape.bindField] || `${shape.bindField} 필드 미기입`)
                        : (shape.text || "텍스트");

                      return (
                        <div
                          key={shape.id}
                          onPointerDown={(e) => handlePointerDown(e, shape.id)}
                          onPointerMove={(e) => handlePointerMove(e, shape.id)}
                          onPointerUp={handlePointerUp}
                          className={`flex items-center overflow-hidden transition-shadow duration-200 select-none relative ${isSelected ? "ring-2 ring-serenity ring-offset-2 ring-offset-[#13171f] px-1" : ""
                            } ${shape.fontWeight === "bold" ? "font-bold" : "font-normal"}`}
                          style={{
                            ...shapeStyle,
                            color: shape.color,
                            fontSize: `${(shape.fontSize || 14) * 0.9}px`,
                            lineHeight: 1.1
                          }}
                        >
                          {textToShow}
                          {handleEl}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

              {/* Canvas Figma Toolbar */}
              <div className="bg-card-bg border border-card-border p-3.5 rounded-2xl flex items-center justify-between backdrop-blur-md">
                <div className="flex gap-2">
                  <button
                    onClick={() => addShape("rect")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/3 hover:bg-white/7 border border-card-border rounded-xl text-xs cursor-pointer text-muted-foreground hover:text-foreground transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>사각형</span>
                  </button>
                  <button
                    onClick={() => addShape("circle")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/3 hover:bg-white/7 border border-card-border rounded-xl text-xs cursor-pointer text-muted-foreground hover:text-foreground transition"
                  >
                    <CircleIcon className="w-3.5 h-3.5" />
                    <span>원형</span>
                  </button>
                  <button
                    onClick={() => addShape("text")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/3 hover:bg-white/7 border border-card-border rounded-xl text-xs cursor-pointer text-muted-foreground hover:text-foreground transition"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>텍스트</span>
                  </button>
                </div>

                {selectedShapeId && (
                  <button
                    onClick={deleteSelectedShape}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-quartz/10 hover:bg-rose-quartz/20 border border-rose-quartz/20 rounded-xl text-xs cursor-pointer text-rose-quartz transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>레이어 삭제</span>
                  </button>
                )}
              </div>

              {/* Share & Publish Dashboard */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">명함 클라우드 배포</h3>
                  <p className="text-[11px] text-muted-foreground">
                    URL 뒤에 붙을 고유 ID를 설정하고 클라우드에 명함을 게시하세요.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono bg-white/3 px-2.5 py-1.5 rounded-lg border border-card-border">
                    /share/?id=
                  </span>
                  <input
                    type="text"
                    value={customCardId}
                    onChange={(e) => setCustomCardId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono bg-white/2 border border-card-border focus:border-serenity focus:outline-none"
                    placeholder="custom-card-id"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handlePublish}
                    disabled={publishStatus === "saving"}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-serenity to-rose-quartz hover:scale-[1.01] active:scale-[0.99] text-slate-900 rounded-full text-xs font-bold transition cursor-pointer shadow-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{publishStatus === "saving" ? "게시 중..." : "클라우드 저장 및 게시"}</span>
                  </button>

                  {myCard.id && (
                    <Link
                      href={`/share/?id=${myCard.id}`}
                      target="_blank"
                      className="px-4 py-2.5 border border-card-border hover:bg-white/5 transition rounded-full text-xs font-bold flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>열기</span>
                    </Link>
                  )}
                </div>

                {publishStatus === "success" && (
                  <div className="mt-2 p-3 bg-serenity/10 border border-serenity/20 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                    <span className="text-muted-foreground truncate mr-2 text-[11px]">공유 주소: {shareUrl}</span>
                    <button
                      onClick={handleCopyLink}
                      className="text-xs font-bold text-serenity hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLink ? "복사됨" : "복사"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PANEL 1.5: Local Storage & Backup Panel */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold">명함 로컬 저장 및 백업</h3>
                  <p className="text-[11px] text-muted-foreground">
                    이 기기에 명함을 이미지로 직접 저장하거나 데이터(JSON) 파일로 백업할 수 있습니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportCardAsImage}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-card-border rounded-xl text-xs font-bold transition cursor-pointer text-white"
                  >
                    <Download className="w-3.5 h-3.5 text-serenity" />
                    <span>PNG 이미지로 저장</span>
                  </button>

                  <button
                    onClick={exportCardAsJSON}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-card-border rounded-xl text-xs font-bold transition cursor-pointer text-white"
                  >
                    <Code className="w-3.5 h-3.5 text-rose-quartz" />
                    <span>JSON 파일로 백업</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-card-border/50 pt-3.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">JSON 백업 파일 가져오기</span>
                  <label className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#13171f] hover:bg-[#1a1f29] border border-card-border border-dashed rounded-xl text-xs font-medium cursor-pointer transition text-muted-foreground hover:text-white">
                    <Upload className="w-3.5 h-3.5" />
                    <span>파일 업로드 (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importCardFromJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Customization Editor Panels */}
            <div className="flex-1 w-full flex flex-col gap-6">

              {/* PANEL 1: Active Layer Element Customizer (Shows only if a shape is focused) */}
              {activeShape ? (
                <div className="bg-card-bg border border-card-border rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4 border-l-2 border-l-serenity animate-fade-in">
                  <div className="flex items-center justify-between border-b border-card-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-serenity" />
                      <h3 className="text-xs font-bold text-foreground">선택한 레이어 속성 편집</h3>
                    </div>
                    <span className="text-[10px] bg-white/5 border border-card-border px-2 py-0.5 rounded text-muted-foreground uppercase">
                      {activeShape.type}
                    </span>
                  </div>

                  {/* Text Content / Data Binding Selection */}
                  {activeShape.type === "text" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Data Binding Selector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">인적사항 데이터 연동</span>
                        <select
                          value={activeShape.bindField || ""}
                          onChange={(e) => handleShapePropChange("bindField", e.target.value || null)}
                          className="px-3 py-1.5 rounded-lg bg-[#13171f] border border-card-border text-xs focus:border-serenity focus:outline-none"
                        >
                          <option value="">직접 텍스트 입력 (연동 없음)</option>
                          <option value="name">이름 (Name)</option>
                          <option value="engName">영문 이름 (Eng Name)</option>
                          <option value="phone">휴대전화 (Phone)</option>
                          <option value="companyPhone">회사 번호 (Company Phone)</option>
                          <option value="email">이메일 (Email)</option>
                          <option value="company">회사명 / 직함 (Company/Title)</option>
                        </select>
                      </div>

                      {/* Manual Text Input (only shows if no binding selected) */}
                      {!activeShape.bindField && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">텍스트 직접 입력</span>
                          <input
                            type="text"
                            value={activeShape.text || ""}
                            onChange={(e) => handleShapePropChange("text", e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Size Config Modifiers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">가로 크기 ({activeShape.width}%)</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={activeShape.width}
                        onChange={(e) => handleShapePropChange("width", parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-serenity"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">세로 크기 ({activeShape.height}%)</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={activeShape.height}
                        onChange={(e) => handleShapePropChange("height", parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-serenity"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    {/* Color Picker */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">색상 선택</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeShape.color}
                          onChange={(e) => handleShapePropChange("color", e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono">{activeShape.color}</span>
                      </div>
                    </div>

                    {/* Text Font Size Modifier */}
                    {activeShape.type === "text" && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">글자 크기 ({activeShape.fontSize}px)</span>
                        <input
                          type="range"
                          min="8"
                          max="40"
                          value={activeShape.fontSize || 14}
                          onChange={(e) => handleShapePropChange("fontSize", parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-quartz"
                        />
                      </div>
                    )}
                  </div>

                  {activeShape.type === "text" && (
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">글자 스타일</span>
                      <button
                        onClick={() => handleShapePropChange("fontWeight", activeShape.fontWeight === "bold" ? "normal" : "bold")}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${activeShape.fontWeight === "bold" ? "bg-serenity/20 border-serenity text-serenity" : "bg-white/3 border-card-border text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* PANEL 2: Template Toggles & Custom Background */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-card-border/50 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4.5 h-4.5 text-serenity" />
                    <h3 className="text-xs font-bold">템플릿 설정 및 명함 테마</h3>
                  </div>

                  {/* DEFAULT TEMPLATE ON/OFF TOGGLE SWITCH */}
                  <div className="flex bg-[#13171f] border border-card-border p-1 rounded-xl">
                    <button
                      onClick={() => handleStyleChange("useDefaultTemplate", true)}
                      className={`flex-1 px-4 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition ${myCard.useDefaultTemplate ? "bg-serenity text-slate-900" : "text-muted-foreground hover:text-white"
                        }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => handleStyleChange("useDefaultTemplate", false)}
                      className={`flex-1 px-4 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition ${!myCard.useDefaultTemplate ? "bg-serenity text-slate-900" : "text-muted-foreground hover:text-white"
                        }`}
                    >
                      Design
                    </button>
                  </div>
                </div>

                {/* Background Type Selection */}
                <div className="flex gap-2 p-1 bg-[#13171f] border border-card-border rounded-xl">
                  <button
                    onClick={() => handleStyleChange("bgType", "solid")}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${myCard.bgType === "solid" ? "bg-serenity text-slate-900" : "text-muted-foreground"
                      }`}
                  >
                    단색
                  </button>
                  <button
                    onClick={() => handleStyleChange("bgType", "gradient")}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${myCard.bgType === "gradient" ? "bg-serenity text-slate-900" : "text-muted-foreground"
                      }`}
                  >
                    그라데이션
                  </button>
                  <button
                    onClick={() => handleStyleChange("bgType", "image")}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${myCard.bgType === "image" ? "bg-serenity text-slate-900" : "text-muted-foreground"
                      }`}
                  >
                    이미지
                  </button>
                  <button
                    onClick={() => handleStyleChange("bgType", "svg")}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition ${myCard.bgType === "svg" ? "bg-serenity text-slate-900" : "text-muted-foreground"
                      }`}
                  >
                    SVG
                  </button>
                </div>

                {/* 0. Solid Color Panel */}
                {myCard.bgType === "solid" && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">배경 단색 설정</span>
                    <div className="flex items-center gap-3 bg-[#13171f] border border-card-border p-2 rounded-xl">
                      <input
                        type="color"
                        value={myCard.bgColor || "#000000"}
                        onChange={(e) => handleStyleChange("bgColor", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                      />
                      <input
                        type="text"
                        value={myCard.bgColor || "#000000"}
                        onChange={(e) => handleStyleChange("bgColor", e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder-muted-foreground"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                )}

                {/* 1. Gradient Panel */}
                {myCard.bgType === "gradient" && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">시작 색상</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={myCard.gradientStart}
                            onChange={(e) => handleStyleChange("gradientStart", e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                          />
                          <span className="text-xs font-mono">{myCard.gradientStart}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">끝 색상</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={myCard.gradientEnd}
                            onChange={(e) => handleStyleChange("gradientEnd", e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                          />
                          <span className="text-xs font-mono">{myCard.gradientEnd}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-1 border-t border-card-border/50 pt-4">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">그라데이션 타입 및 각도</span>
                      <div className="flex bg-[#13171f] border border-card-border p-1 rounded-xl">
                        <button
                          onClick={() => handleStyleChange("gradientType", "linear")}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition ${(!myCard.gradientType || myCard.gradientType === "linear") ? "bg-serenity text-slate-900" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                          직선형 (Linear)
                        </button>
                        <button
                          onClick={() => handleStyleChange("gradientType", "radial")}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition ${myCard.gradientType === "radial" ? "bg-serenity text-slate-900" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                          원형 (Radial)
                        </button>
                      </div>

                      {(!myCard.gradientType || myCard.gradientType === "linear") && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">진행 각도 (Angle)</span>
                            <span className="text-[11px] font-mono">{myCard.gradientAngle ?? 135}°</span>
                          </div>
                          <input
                            type="range"
                            min="0" max="360"
                            value={myCard.gradientAngle ?? 135}
                            onChange={(e) => handleStyleChange("gradientAngle", parseInt(e.target.value))}
                            className="w-full accent-serenity cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Text Color Custom Panel */}
                <div className="flex flex-col gap-1.5 border-t border-card-border/50 pt-4 mt-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">기본 텍스트 색상</span>
                  <div className="flex items-center gap-3 bg-[#13171f] border border-card-border p-2 rounded-xl">
                    <input
                      type="color"
                      value={myCard.textColor || "#ffffff"}
                      onChange={(e) => handleStyleChange("textColor", e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={myCard.textColor || "#ffffff"}
                      onChange={(e) => handleStyleChange("textColor", e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder-muted-foreground"
                      placeholder="#ffffff"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const bgType = myCard.bgType;
                        const contrastColorClass = bgType === "gradient"
                          ? getGradientContrastColor(myCard.gradientStart, myCard.gradientEnd)
                          : bgType === "solid" && myCard.bgColor
                            ? getContrastTextColor(myCard.bgColor)
                            : "text-white";
                        handleStyleChange("textColor", contrastColorClass === "text-slate-900" ? "#0f172a" : "#ffffff");
                      }}
                      className="px-2.5 py-1.5 bg-white/5 border border-card-border hover:bg-white/10 rounded-lg text-[10px] text-muted-foreground hover:text-white transition cursor-pointer"
                    >
                      자동 맞춤
                    </button>
                  </div>
                </div>

                {/* 2. Custom Image URL Panel */}
                {myCard.bgType === "image" && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-serenity" /> 배경 이미지 주소 (PNG / JPG)
                    </span>
                    <input
                      type="text"
                      name="bgImageUrl"
                      value={myCard.bgImageUrl || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none transition"
                      placeholder="https://example.com/background.png 등 이미지 주소"
                    />
                    <span className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                      * 추천 해상도: 1080 x 600 (9:5 가로세로 비율) 또는 가로형 이미지 권장.
                    </span>
                  </div>
                )}

                {/* 3. Custom SVG Markup Panel */}
                {myCard.bgType === "svg" && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Code className="w-3.5 h-3.5 text-rose-quartz" /> SVG 코드 붙여넣기 (XML)
                    </span>
                    <textarea
                      name="bgSvgContent"
                      value={myCard.bgSvgContent || ""}
                      onChange={handleInputChange}
                      rows={4}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs font-mono focus:border-rose-quartz focus:outline-none transition resize-none"
                      placeholder="<svg ...> ... </svg>"
                    />
                  </div>
                )}
              </div>

              {/* PANEL 3: Business Card Info */}
              <div className="w-full bg-card-bg border border-card-border rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6">
                <div className="flex items-center gap-2 border-b border-card-border/50 pb-4">
                  <Settings className="w-5 h-5 text-serenity" />
                  <h2 className="text-base font-bold">인적 사항 및 명함 기본 정보</h2>
                </div>

                {/* Form Input fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <User className="w-3 h-3 text-serenity" /> 이름
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showName !== false}
                          onChange={(e) => handleStyleChange("showName", e.target.checked)}
                          className="w-3 h-3 accent-serenity rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={myCard.name}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none transition"
                      placeholder="이름 입력"
                    />
                  </div>

                  {/* English Name */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <User className="w-3 h-3 text-rose-quartz" /> 영문 이름
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showEngName !== false}
                          onChange={(e) => handleStyleChange("showEngName", e.target.checked)}
                          className="w-3 h-3 accent-rose-quartz rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="text"
                      name="engName"
                      value={myCard.engName || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-rose-quartz focus:outline-none transition"
                      placeholder="Gildong Hong"
                    />
                  </div>

                  {/* Mobile Phone */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-serenity" /> 휴대전화 번호
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showPhone !== false}
                          onChange={(e) => handleStyleChange("showPhone", e.target.checked)}
                          className="w-3 h-3 accent-serenity rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={myCard.phone || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none transition"
                      placeholder="010-0000-0000"
                    />
                  </div>

                  {/* Company Phone */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Building className="w-3 h-3 text-rose-quartz" /> 회사 번호
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showCompanyPhone !== false}
                          onChange={(e) => handleStyleChange("showCompanyPhone", e.target.checked)}
                          className="w-3 h-3 accent-rose-quartz rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="text"
                      name="companyPhone"
                      value={myCard.companyPhone || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-rose-quartz focus:outline-none transition"
                      placeholder="02-000-0000"
                    />
                  </div>

                  {/* Email */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3 text-serenity" /> 이메일
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showEmail !== false}
                          onChange={(e) => handleStyleChange("showEmail", e.target.checked)}
                          className="w-3 h-3 accent-serenity rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={myCard.email || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none transition"
                      placeholder="email@example.com"
                    />
                  </div>

                  {/* Company / Position */}
                   <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Building className="w-3 h-3 text-rose-quartz" /> 회사명 / 직책
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showCompany !== false}
                          onChange={(e) => handleStyleChange("showCompany", e.target.checked)}
                          className="w-3 h-3 accent-rose-quartz rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <input
                      type="text"
                      name="company"
                      value={myCard.company || ""}
                      onChange={handleInputChange}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-rose-quartz focus:outline-none transition"
                      placeholder="회사명 및 직함"
                    />
                  </div>

                  {/* Profile Image URL */}
                  <div className="flex flex-col gap-3 sm:col-span-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-serenity" /> 프로필 이미지 URL
                      </label>
                      <input
                        type="text"
                        name="avatarUrl"
                        value={myCard.avatarUrl || ""}
                        onChange={handleInputChange}
                        className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-serenity focus:outline-none transition"
                        placeholder="프로필 사진 이미지 인터넷 주소"
                      />
                    </div>

                    {myCard.avatarUrl && (
                      <div className="bg-[#13171f]/50 border border-card-border rounded-xl p-3.5 flex flex-col gap-3.5 animate-fade-in mt-1">
                        <div className="flex justify-between items-center border-b border-card-border/50 pb-1.5">
                          <span className="text-[10px] font-bold text-serenity uppercase">프로필 사진 틀(영역) 세부 조절</span>
                          <span className="text-[9px] text-muted-foreground">사진을 누른 채 드래그해도 조절됩니다.</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                              <span>사진 크기 (Zoom)</span>
                              <span className="font-mono text-serenity">{Math.round((myCard.avatarZoom ?? 1) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.05"
                              value={myCard.avatarZoom ?? 1}
                              onChange={(e) => handleStyleChange("avatarZoom", parseFloat(e.target.value))}
                              className="w-full accent-serenity cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                              <span>가로 이동 (X)</span>
                              <span className="font-mono text-serenity">{Math.round(myCard.avatarX ?? 0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={myCard.avatarX ?? 0}
                              onChange={(e) => handleStyleChange("avatarX", parseInt(e.target.value))}
                              className="w-full accent-serenity cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[9px] text-muted-foreground uppercase font-bold">
                              <span>세로 이동 (Y)</span>
                              <span className="font-mono text-serenity">{Math.round(myCard.avatarY ?? 0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              value={myCard.avatarY ?? 0}
                              onChange={(e) => handleStyleChange("avatarY", parseInt(e.target.value))}
                              className="w-full accent-serenity cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Introduction (Bio) */}
                   <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <FileText className="w-3 h-3 text-rose-quartz" /> 자기 소개 (소개 란에 상세 노출)
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={myCard.showBio !== false}
                          onChange={(e) => handleStyleChange("showBio", e.target.checked)}
                          className="w-3 h-3 accent-rose-quartz rounded"
                        />
                        상세 노출
                      </label>
                    </div>
                    <textarea
                      name="bio"
                      value={myCard.bio || ""}
                      onChange={handleInputChange}
                      rows={3}
                      className="px-3.5 py-2.5 rounded-xl bg-white/2 border border-card-border text-xs focus:border-rose-quartz focus:outline-none transition resize-none leading-relaxed"
                      placeholder="나를 소개하는 멋진 문구를 적어보세요..."
                    />
                  </div>
                </div>
              </div>

              {/* PANEL 4: Profile Links Customizer Panel */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-5 backdrop-blur-md flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-card-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-serenity" />
                    <h3 className="text-xs font-bold text-foreground">상세 프로필 링크 정보 설정</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addProfileLink}
                    className="px-3 py-1.5 bg-serenity text-slate-900 rounded-lg text-[10px] font-bold hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  >
                    + 링크 추가
                  </button>
                </div>

                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {(myCard.links || []).length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      추가된 상세 프로필 링크가 없습니다. 링크 추가 버튼을 눌러보세요!
                    </div>
                  ) : (
                    (myCard.links || []).map((link, idx) => (
                      <div 
                        key={link.id} 
                        className="bg-[#13171f]/50 border border-card-border rounded-xl p-3.5 flex flex-col gap-3 relative animate-fade-in"
                        style={{ borderRight: `4px solid ${link.borderColor || "#92a8d1"}` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-serenity"># {idx + 1} 프로필 링크</span>
                          <button
                            type="button"
                            onClick={() => deleteProfileLink(link.id)}
                            className="p-1 rounded-lg text-rose-quartz/60 hover:text-rose-quartz hover:bg-rose-quartz/10 transition cursor-pointer"
                            title="링크 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">링크 이름</span>
                            <input
                              type="text"
                              value={link.title}
                              onChange={(e) => updateProfileLink(link.id, "title", e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0d0f12] border border-card-border text-xs text-white focus:border-serenity focus:outline-none"
                              placeholder="예: 내 포트폴리오 사이트"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">이동 주소 (URL)</span>
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => updateProfileLink(link.id, "url", e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0d0f12] border border-card-border text-xs text-white focus:border-serenity focus:outline-none"
                              placeholder="https://example.com"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">우측 포인트 색상</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={link.borderColor || "#92a8d1"}
                                onChange={(e) => updateProfileLink(link.id, "borderColor", e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[10px] font-mono">{link.borderColor || "#92a8d1"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* WALLET VIEW */
          <div className="w-full max-w-2xl mx-auto bg-card-bg border border-card-border rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-card-border/50 pb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-serenity" />
                <h2 className="text-base font-bold">내 명함첩</h2>
              </div>
              <span className="text-xs text-muted-foreground">내가 저장한 상대방 명함 목록입니다.</span>
            </div>

            {walletCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2.5">
                <div className="p-3.5 rounded-full bg-white/2 border border-card-border text-muted-foreground">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">명함첩이 비어있습니다</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">상대방의 명함 링크를 열고 "명함첩에 저장"을 클릭하세요.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {walletCards.map((walletCard) => (
                  <div
                    key={walletCard.id}
                    onClick={() => router.push(`/share/?id=${walletCard.id}`)}
                    className="group relative p-4.5 rounded-xl bg-white/2 border border-card-border flex flex-col justify-between aspect-[1.586/1] overflow-hidden hover:scale-[1.01] hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {/* Gradient bar indicator */}
                    <div
                      className="absolute top-0 right-0 w-2 h-full"
                      style={{
                        background: `linear-gradient(to bottom, ${walletCard.gradientStart}, ${walletCard.gradientEnd})`
                      }}
                    />

                    <div className="flex justify-between items-start pr-3">
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-foreground truncate max-w-[170px]">
                          {walletCard.name}
                        </span>
                        {walletCard.company && (
                          <span className="text-xs text-serenity mt-1 font-medium truncate max-w-[170px]">
                            {walletCard.company}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full border border-card-border overflow-hidden bg-neutral-900 flex-shrink-0">
                        {walletCard.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={walletCard.avatarUrl}
                            alt={walletCard.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-neutral-900">
                            IMG
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between z-10 pr-3">
                      <span className="text-xs text-muted-foreground font-mono">
                        {walletCard.phone}
                      </span>

                      <div className="flex gap-1">
                        <Link
                          href={`/share/?id=${walletCard.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-white/5 border border-card-border text-muted-foreground hover:text-foreground cursor-pointer transition"
                          title="명함 보기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFromWallet(walletCard.id);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 border border-card-border text-rose-quartz/60 hover:text-rose-quartz cursor-pointer transition"
                          title="지우기"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Password Modal Overlay */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13171f] border border-card-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
            <h3 className="text-base font-bold text-white mb-2">
              {passwordModalType === "set" ? "배포 비밀번호 설정" : "비밀번호 확인"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {passwordModalType === "set"
                ? "명함을 타인이 무단으로 덮어쓸 수 없도록 관리 비밀번호를 새로 설정하세요."
                : "이미 게시된 명함 ID입니다. 덮어쓰려면 기존 배포 비밀번호를 입력해야 합니다."}
            </p>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#0d0f12] border border-card-border rounded-xl text-sm text-white focus:border-serenity focus:outline-none placeholder-muted-foreground w-full"
                  placeholder="비밀번호를 입력하세요"
                  autoFocus
                />
                {passwordError && (
                  <span className="text-[11px] text-rose-quartz mt-1 font-medium">{passwordError}</span>
                )}
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPendingCard(null);
                  }}
                  className="px-4 py-2 border border-card-border hover:bg-white/5 rounded-xl text-xs font-bold text-muted-foreground hover:text-white transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-serenity to-rose-quartz text-slate-900 rounded-xl text-xs font-bold transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg"
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

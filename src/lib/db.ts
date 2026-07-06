import { 
  getCard as fetchRemoteCard, 
  saveCard as saveRemoteCard, 
  isFirebaseEnabled 
} from "./firebase";

export interface ProfileLink {
  id: string;
  iconUrl?: string; // 왼쪽 이미지 URL
  title: string; // 설명/글
  url: string; // 이동할 실제 URL
  borderColor?: string; // 오른쪽 얇은 색상 선 색깔
}

export interface CardShape {
  id: string;
  type: "rect" | "circle" | "text";
  x: number;      // 카드 가로 너비 대비 백분율(%)
  y: number;      // 카드 세로 높이 대비 백분율(%)
  width: number;  // 가로 백분율(%)
  height: number; // 세로 백분율(%)
  color: string;  // 도형 색상 또는 텍스트 색상
  text?: string;  // type이 'text'이고 바인딩이 없을 때 보여줄 텍스트

  // [NEW] 인적사항 폼 필드와 연동될 데이터 바인딩 속성
  bindField?: "name" | "engName" | "phone" | "companyPhone" | "email" | "company";

  fontSize?: number; // 텍스트 크기 비율 (10 ~ 40)
  fontWeight?: string; // bold, normal
}

export interface BusinessCard {
  id: string;
  name: string;
  engName?: string;
  phone?: string;
  companyPhone?: string;
  email?: string;
  company?: string;
  bio?: string;

  // Customization styling tokens
  gradientStart: string;
  gradientEnd: string;
  gradientType?: "linear" | "radial";
  gradientAngle?: number; // 0 to 360 degrees
  borderWidth: number; // 0, 1, 2, etc.
  borderColor: string;
  textColor: string;
  fontFamily: string;
  avatarUrl?: string; // base64 or external url
  avatarZoom?: number; // 1.0 to 3.0 scale
  avatarX?: number; // percentage offset X
  avatarY?: number; // percentage offset Y

  // [NEW] 배경 타입 및 커스텀 배경 리소스 데이터
  bgType: "gradient" | "svg" | "image" | "solid";
  bgSvgContent?: string;
  bgImageUrl?: string;
  bgColor?: string;

  // [NEW] 기본 테두리 및 프로필 레이아웃 템플릿 적용 여부
  useDefaultTemplate: boolean;

  // Custom visual shapes
  shapes: CardShape[];

  password?: string; // 비밀번호 보호 필드

  links?: ProfileLink[]; // 추가 프로필 소셜/포트폴리오 링크 목록

  // 공유 페이지(Share) 필드 노출 여부 설정
  showName?: boolean;
  showEngName?: boolean;
  showCompany?: boolean;
  showPhone?: boolean;
  showCompanyPhone?: boolean;
  showEmail?: boolean;
  showBio?: boolean;

  createdAt: number;
}

// Default dummy template with data-bound shapes mapping name and title to form inputs
export const DEFAULT_CARD: BusinessCard = {
  id: "gildong-hong",
  name: "홍길동",
  engName: "Gildong Hong",
  phone: "010-0500-5050",
  companyPhone: "052-290-0303",
  email: "gildonghong@gmail.com",
  company: "활빈당 캡틴",
  bio: "정의를 수호하고 가난한 자들을 돕는 조선의 영웅, 홍길동입니다. 현대 IT 기술과 접목하여 더 스마트하게 세상을 돕고자 합니다.",
  gradientStart: "#92a8d1", // Serenity
  gradientEnd: "#f7caca",   // Rose Quartz
  gradientType: "linear",
  gradientAngle: 135,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.15)",
  textColor: "#ffffff",
  fontFamily: "var(--font-outfit)",
  avatarZoom: 1,
  avatarX: 0,
  avatarY: 0,
  bgType: "gradient",
  bgColor: "#13171f",
  bgSvgContent: "",
  bgImageUrl: "",
  useDefaultTemplate: true,
  shapes: [
    // Pre-created visual elements simulating a figma layout with data binding
    {
      id: "sh-1",
      type: "text",
      x: 10,
      y: 65,
      width: 60,
      height: 12,
      color: "#ffffff",
      text: "홍길동",
      bindField: "name", // Linked to the name input field
      fontSize: 24,
      fontWeight: "bold"
    },
    {
      id: "sh-2",
      type: "text",
      x: 10,
      y: 80,
      width: 60,
      height: 8,
      color: "rgba(255, 255, 255, 0.7)",
      text: "활빈당 캡틴",
      bindField: "company", // Linked to the company/position input field
      fontSize: 12,
      fontWeight: "normal"
    },
    {
      id: "sh-3",
      type: "circle",
      x: 82,
      y: 12,
      width: 10,
      height: 10,
      color: "#f7caca" // Light rose decoration circle
    },
    {
      id: "sh-4",
      type: "rect",
      x: 10,
      y: 15,
      width: 15,
      height: 2,
      color: "#92a8d1" // serenity decorative line
    }
  ],
  links: [
    {
      id: "link-1",
      title: "공식 포트폴리오 웹사이트",
      url: "https://gildong.io",
      iconUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=60",
      borderColor: "#92a8d1"
    },
    {
      id: "link-2",
      title: "인스타그램 SNS",
      url: "https://instagram.com",
      iconUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60",
      borderColor: "#f7caca"
    }
  ],
  createdAt: Date.now(),
};

/**
 * Saves a business card to either Remote SQLite API or LocalStorage.
 * Returns the card ID.
 */
export async function saveCard(card: BusinessCard): Promise<string> {
  if (isFirebaseEnabled) {
    try {
      await saveRemoteCard(card);
      return card.id;
    } catch (error) {
      console.error("Failed to save card to SQLite API, falling back to LocalStorage:", error);
      throw error;
    }
  }

  // Fallback to LocalStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(`card-${card.id}`, JSON.stringify(card));
  }
  return card.id;
}

/**
 * Gets a business card by ID from either Remote SQLite API or LocalStorage.
 */
export async function getCard(id: string): Promise<BusinessCard | null> {
  // If Remote API is enabled
  if (isFirebaseEnabled) {
    try {
      const remoteCard = await fetchRemoteCard(id);
      if (remoteCard) {
        return remoteCard;
      }
    } catch (error) {
      console.error("Failed to fetch card from SQLite API, checking LocalStorage:", error);
    }
  }

  // Fallback to LocalStorage or dummy fallback if id matches dummy
  if (typeof window !== "undefined") {
    const localData = localStorage.getItem(`card-${id}`);
    if (localData) {
      try {
        return JSON.parse(localData) as BusinessCard;
      } catch {
        return null;
      }
    }
  }

  // Return default card if it matches the default card ID
  if (id === DEFAULT_CARD.id) {
    return DEFAULT_CARD;
  }

  return null;
}

/**
 * Local wallet functions (storing other people's card IDs locally)
 */
export function getSavedCards(): BusinessCard[] {
  if (typeof window === "undefined") return [];
  const listJson = localStorage.getItem("saved-cards");
  if (!listJson) return [];
  try {
    return JSON.parse(listJson) as BusinessCard[];
  } catch {
    return [];
  }
}

export function saveCardToWallet(card: BusinessCard): void {
  if (typeof window === "undefined") return;
  const saved = getSavedCards();
  if (saved.some((c) => c.id === card.id)) return; // Avoid duplicates
  saved.push(card);
  localStorage.setItem("saved-cards", JSON.stringify(saved));
}

export function removeCardFromWallet(cardId: string): void {
  if (typeof window === "undefined") return;
  const saved = getSavedCards();
  const filtered = saved.filter((c) => c.id !== cardId);
  localStorage.setItem("saved-cards", JSON.stringify(filtered));
}

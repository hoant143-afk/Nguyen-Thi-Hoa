export interface GameDefinition {
  id: string;
  slug?: string;
  name: string;
  subtitle: string;
  description: string;
  iconName: 'Camera' | 'Zap' | 'Disc' | 'Flame' | 'Sparkles' | 'Trophy' | 'Users';
  category: 'Vận động & AI' | 'Trí tuệ & Trắc nghiệm' | 'May mắn & Hoạt náo' | 'Phản xạ & Tốc độ' | 'Lựa chọn' | 'Thi đua nhóm';
  suitableSubject: string;
  players: string;
  route: string;
  enabled: boolean;
  featured: boolean;
  badge: string;
  minTeams?: number;
  maxTeams?: number;
  supportsCamera?: boolean;
  supportsQuestions?: boolean;
  supportsScore?: boolean;
  supportsCertificate?: boolean;
  theme: {
    gradient: string;
    badgeBg: string;
    badgeText: string;
    accentColor: string;
    cardBorder: string;
  };
}

export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: 'cam-race',
    slug: 'cam-race',
    name: 'CAM RACE',
    subtitle: 'Đại chiến Thẻ màu Webcam',
    description: 'Thi đấu tốc độ bằng webcam – giơ thẻ màu đội giành quyền trả lời câu hỏi.',
    iconName: 'Camera',
    category: 'Vận động & AI',
    suitableSubject: 'Tin học, Khoa học, Khởi động',
    players: '2 Đội',
    route: '/games/cam-race',
    enabled: true,
    featured: true,
    badge: '📷 Webcam',
    minTeams: 2,
    maxTeams: 2,
    supportsCamera: true,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    theme: {
      gradient: 'from-cyan-600 via-blue-700 to-indigo-800',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300 border-cyan-500/40',
      accentColor: 'text-cyan-400',
      cardBorder: 'hover:border-cyan-400/80 hover:shadow-cyan-500/20',
    },
  },
  {
    id: 'smile-race',
    slug: 'smile-race',
    name: 'SMILE RACE',
    subtitle: 'Đại chiến Cử chỉ Nụ cười',
    description: 'Đại chiến cử chỉ nụ cười qua webcam – đội cười chuẩn xác nhanh nhất giành quyền trả lời.',
    minTeams: 2,
    maxTeams: 4,
    supportsCamera: true,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    iconName: 'Sparkles',
    category: 'Vận động & AI',
    suitableSubject: 'Mọi môn học (Khởi động, Kiểm tra, Ôn tập)',
    players: '2 – 4 Đội',
    route: '/games/smile-race',
    enabled: true,
    featured: true,
    badge: '😁 Cử chỉ nụ cười',
    theme: {
      gradient: 'from-amber-500 via-purple-600 to-cyan-500',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800 border-amber-300',
      accentColor: 'text-purple-600',
      cardBorder: 'hover:border-purple-400 hover:shadow-purple-500/20',
    },
  },
  {
    id: 'lucky-wheel',
    slug: 'lucky-wheel',
    name: 'LUCKY WHEEL',
    subtitle: 'Vòng quay May mắn',
    description: 'Vòng quay sinh động chọn đội chơi, câu hỏi, điểm thưởng hoặc thử thách vui nhộn náo nhiệt.',
    minTeams: 2,
    maxTeams: 4,
    supportsCamera: false,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    iconName: 'Disc',
    category: 'May mắn & Hoạt náo',
    suitableSubject: 'Khởi động, Kiểm tra bài cũ, Khen thưởng',
    players: '2 – 4 Đội',
    route: '/games/lucky-wheel',
    enabled: true,
    featured: true,
    badge: '🎡 Vòng quay',
    theme: {
      gradient: 'from-emerald-600 via-teal-700 to-cyan-800',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300 border-emerald-500/40',
      accentColor: 'text-emerald-400',
      cardBorder: 'hover:border-emerald-400/80 hover:shadow-emerald-500/20',
    },
  },
  {
    id: 'fastest-hand',
    slug: 'fastest-hand',
    name: 'FASTEST HAND',
    subtitle: 'Ai nhanh hơn',
    description: 'Trò chơi bấm chuông buzzer tốc độ cao (bàn phím hoặc cảm ứng). Đội bấm trước khóa đội còn lại tức thì!',
    minTeams: 2,
    maxTeams: 4,
    supportsCamera: false,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    iconName: 'Flame',
    category: 'Phản xạ & Tốc độ',
    suitableSubject: 'Ôn tập nhanh, Thi đấu phản xạ',
    players: '2 – 4 Đội',
    route: '/games/fastest-hand',
    enabled: true,
    featured: true,
    badge: '⏱️ Chuông bấm',
    theme: {
      gradient: 'from-violet-600 via-purple-700 to-fuchsia-800',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-300 border-purple-500/40',
      accentColor: 'text-purple-400',
      cardBorder: 'hover:border-purple-400/80 hover:shadow-purple-500/20',
    },
  },
  {
    id: 'random-picker',
    slug: 'random-picker',
    name: 'RANDOM TEAM PICKER',
    subtitle: 'Gọi đội ngẫu nhiên',
    description: 'Chọn đội ngẫu nhiên công bằng, phân công câu hỏi hoặc thử thách kịch tính, không trùng lặp.',
    minTeams: 2,
    maxTeams: 4,
    supportsCamera: false,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    iconName: 'Sparkles',
    category: 'Lựa chọn',
    suitableSubject: 'Gọi trả lời, Phân công, Thuyết trình',
    players: '2 – 4 Đội',
    route: '/games/random-picker',
    enabled: true,
    featured: false,
    badge: '🎯 Ngẫu nhiên',
    theme: {
      gradient: 'from-pink-600 via-rose-700 to-red-800',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-300 border-rose-500/40',
      accentColor: 'text-rose-400',
      cardBorder: 'hover:border-rose-400/80 hover:shadow-rose-500/20',
    },
  },
  {
    id: 'team-challenge',
    slug: 'team-challenge',
    name: 'TEAM CHALLENGE',
    subtitle: 'Thử thách đồng đội',
    description: 'Quản lý thi đua các đội lớp học theo vòng đấu, cộng trừ điểm thưởng và bảng xếp hạng huy chương trực quan.',
    minTeams: 2,
    maxTeams: 4,
    supportsCamera: false,
    supportsQuestions: true,
    supportsScore: true,
    supportsCertificate: true,
    iconName: 'Trophy',
    category: 'Thi đua nhóm',
    suitableSubject: 'Dự án, Hoạt động nhóm, Tiết ôn tập',
    players: '2 – 4 Đội',
    route: '/games/team-challenge',
    enabled: true,
    featured: false,
    badge: '🏆 Thi đua tổ',
    theme: {
      gradient: 'from-blue-600 via-indigo-700 to-sky-800',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-300 border-blue-500/40',
      accentColor: 'text-sky-400',
      cardBorder: 'hover:border-sky-400/80 hover:shadow-sky-500/20',
    },
  },
];

export function getGameById(id: string): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.id === id || g.slug === id);
}

export function getGameByRoute(route: string): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.route === route);
}

export interface GameDefinition {
  id: string;
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
    name: 'CAM RACE',
    subtitle: 'Đại chiến Webcam',
    description: 'Thi đấu tốc độ bằng webcam – giơ thẻ màu đội giành quyền trả lời câu hỏi Tin học 5.',
    iconName: 'Camera',
    category: 'Vận động & AI',
    suitableSubject: 'Tin học, Khoa học, Khởi động',
    players: '2 Đội (BLUE vs ORANGE)',
    route: '/games/cam-race',
    enabled: true,
    featured: true,
    badge: '🔥 AI Webcam',
    theme: {
      gradient: 'from-cyan-600 via-blue-700 to-indigo-800',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300 border-cyan-500/40',
      accentColor: 'text-cyan-400',
      cardBorder: 'hover:border-cyan-400/80 hover:shadow-cyan-500/20',
    },
  },
  {
    id: 'quiz-battle',
    name: 'QUIZ BATTLE',
    subtitle: 'Đấu trường Tri thức',
    description: 'Hai hoặc nhiều đội thi đấu đối kháng trực tiếp, trả lời câu hỏi A/B/C/D, câu đặc biệt và bảng điểm realtime.',
    iconName: 'Zap',
    category: 'Trí tuệ & Trắc nghiệm',
    suitableSubject: 'Mọi môn học (Toán, Tiếng Việt, Tiếng Anh, Tin...)',
    players: '2 - 4 Đội thi đấu',
    route: '/games/quiz-battle',
    enabled: true,
    featured: true,
    badge: '⚡ Đối kháng',
    theme: {
      gradient: 'from-amber-600 via-orange-600 to-rose-700',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300 border-amber-500/40',
      accentColor: 'text-amber-400',
      cardBorder: 'hover:border-amber-400/80 hover:shadow-amber-500/20',
    },
  },
  {
    id: 'lucky-wheel',
    name: 'VÒNG QUAY MAY MẮN',
    subtitle: 'Lucky Wheel',
    description: 'Vòng quay sinh động chọn tên học sinh, đội chơi, câu hỏi, điểm thưởng hoặc thử thách vui nhộn náo nhiệt.',
    iconName: 'Disc',
    category: 'May mắn & Hoạt náo',
    suitableSubject: 'Khởi động, Kiểm tra bài cũ, Khen thưởng',
    players: 'Cá nhân & Cả lớp',
    route: '/games/lucky-wheel',
    enabled: true,
    featured: true,
    badge: '🎡 Hoạt náo',
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
    name: 'AI NHANH HƠN',
    subtitle: 'Fastest Buzzer',
    description: 'Trò chơi bấm chuông buzzer tốc độ cao (phím A/L hoặc cảm ứng). Đội bấm trước khóa đội còn lại tức thì!',
    iconName: 'Flame',
    category: 'Phản xạ & Tốc độ',
    suitableSubject: 'Ôn tập nhanh, Thi đấu phản xạ',
    players: '2 Đội đối đầu',
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
    name: 'GỌI TÊN NGẪU NHIÊN',
    subtitle: 'Random Name Picker',
    description: 'Quay tên học sinh ngẫu nhiên công bằng, hiệu ứng “AI SẼ ĐƯỢC CHỌN?” kịch tính, không trùng lặp, tặng điểm sao.',
    iconName: 'Sparkles',
    category: 'Lựa chọn',
    suitableSubject: 'Gọi trả lời, Phân công, Thuyết trình',
    players: 'Danh sách cả lớp',
    route: '/games/random-picker',
    enabled: true,
    featured: false,
    badge: '🎯 Công bằng',
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
    name: 'THỬ THÁCH ĐỒNG ĐỘI',
    subtitle: 'Team Challenge & Scoreboard',
    description: 'Quản lý thi đua 2 - 4 đội lớp học, tùy biến màu sắc/tên đội, ngân hàng nhiệm vụ và bảng điểm khổng lồ tối ưu máy chiếu.',
    iconName: 'Trophy',
    category: 'Thi đua nhóm',
    suitableSubject: 'Dự án, Hoạt động nhóm, Tiết ôn tập',
    players: '2 - 4 Đội / Tổ',
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
  return GAME_REGISTRY.find((g) => g.id === id);
}

export function getGameByRoute(route: string): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.route === route);
}

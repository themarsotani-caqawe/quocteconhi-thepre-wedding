export interface ShopSuggestion {
  id: string;
  name: string;
  url: string;
}

export type AgendaIconKey = 'bag' | 'camera' | 'cutlery' | 'clapper';

export interface AgendaScheduleItem {
  id: string;
  time: string;
  title: string;
  iconKey: AgendaIconKey;
}

export const DRESS_CODE_CONTENT = {
  heading: 'Pajamas only!',
  lines: [
    'Mọi người nhớ mặc đồ ngủ nha!',
    'Nhớ mang áo khoác cho ấm.',
    'Trang điểm nhẹ nhàng, zui là chính!',
  ],
  toggleLabel: 'Gợi ý shop đồ ngủ',
  shopIntro: 'Chưa biết mặc bộ nào thì nghía thử mấy shop tụi tui gợi ý nha! 💗',
} as const;

export const PAJAMA_SHOP_SUGGESTIONS: readonly ShopSuggestion[] = [
  {
    id: 'jemcloset',
    name: 'Jemcloset',
    url: 'https://vt.tiktok.com/ZSs8a5k25/?page=TikTokShop',
  },
  {
    id: 'delivu-shop',
    name: 'Delivu Shop',
    url: 'https://vt.tiktok.com/ZSs8a5dwq/?page=TikTokShop',
  },
  {
    id: 'tuni',
    name: 'Tuni',
    url: 'https://vt.tiktok.com/ZSs8afEy1/?page=TikTokShop',
  },
  {
    id: 'by-chann',
    name: 'BY CHANN.',
    url: 'https://vt.tiktok.com/ZSs8a9s7o/?page=TikTokShop',
  },
] as const;

export const AGENDA_SECTION_TITLE = 'Lịch tối nay';

export const AGENDA_SCHEDULE: readonly AgendaScheduleItem[] = [
  {
    id: 'open-blind-bag',
    time: '18:00–18:30',
    title: 'Khui túi mù',
    iconKey: 'bag',
  },
  {
    id: 'photo-session',
    time: '18:30–19:00',
    title: 'Chụp ảnh',
    iconKey: 'camera',
  },
  {
    id: 'dinner-party',
    time: '19:00–20:30',
    title: 'Dùng tiệc',
    iconKey: 'cutlery',
  },
  {
    id: 'premiere-screening',
    time: '20:30–21:00',
    title: 'Phim cưới & Photobook',
    iconKey: 'clapper',
  },
] as const;

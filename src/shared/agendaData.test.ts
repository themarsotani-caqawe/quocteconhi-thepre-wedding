import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENDA_SECTION_TITLE,
  AGENDA_SCHEDULE,
  DRESS_CODE_CONTENT,
  PAJAMA_SHOP_SUGGESTIONS,
} from './agendaData';

test('agenda dress code copy matches exact required wording', () => {
  assert.equal(DRESS_CODE_CONTENT.heading, 'Pajamas only!');
  assert.deepEqual(DRESS_CODE_CONTENT.lines, [
    'Mọi người nhớ mặc đồ ngủ nha!',
    'Nhớ mang áo khoác cho ấm.',
    'Trang điểm nhẹ nhàng, zui là chính!',
  ]);
  assert.equal(DRESS_CODE_CONTENT.toggleLabel, 'Gợi ý shop đồ ngủ');
  assert.equal(
    DRESS_CODE_CONTENT.shopIntro,
    'Chưa biết mặc bộ nào thì nghía thử mấy shop tụi tui gợi ý nha! 💗'
  );
});

test('pajama shop suggestions preserve exact 4 shop names and TikTok Shop query URLs', () => {
  assert.deepEqual(
    PAJAMA_SHOP_SUGGESTIONS.map((s) => ({ name: s.name, url: s.url })),
    [
      { name: 'Jemcloset', url: 'https://vt.tiktok.com/ZSs8a5k25/?page=TikTokShop' },
      { name: 'Delivu Shop', url: 'https://vt.tiktok.com/ZSs8a5dwq/?page=TikTokShop' },
      { name: 'Tuni', url: 'https://vt.tiktok.com/ZSs8afEy1/?page=TikTokShop' },
      { name: 'BY CHANN.', url: 'https://vt.tiktok.com/ZSs8a9s7o/?page=TikTokShop' },
    ]
  );
});

test('evening schedule preserves exact title, times, titles, and order', () => {
  assert.equal(AGENDA_SECTION_TITLE, 'Lịch tối nay');
  assert.deepEqual(
    AGENDA_SCHEDULE.map((row) => ({ time: row.time, title: row.title, iconKey: row.iconKey })),
    [
      { time: '18:00–18:30', title: 'Khui túi mù', iconKey: 'bag' },
      { time: '18:30–19:00', title: 'Chụp ảnh', iconKey: 'camera' },
      { time: '19:00–20:30', title: 'Dùng tiệc', iconKey: 'cutlery' },
      { time: '20:30–21:00', title: 'Phim cưới & Photobook', iconKey: 'clapper' },
    ]
  );
});

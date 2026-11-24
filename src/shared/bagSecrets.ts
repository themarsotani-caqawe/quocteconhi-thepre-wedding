import type { RevealedBag, TeamId } from './premiereRules.ts';

export const TEAM_BAG_SECRETS: Readonly<Record<TeamId, RevealedBag>> = {
  1: {
    title: 'Tối đó, Đội 1 mang…',
    items: [
      { id: 'd1-1', text: '6 tô ốc bươu nhồi thịt', illustrationKey: 'oc-buou' },
      { id: 'd1-2', text: '4 phần khoai tây chiên chấm bơ đường', illustrationKey: 'khoai-tay' },
    ],
  },
  2: {
    title: 'Tối đó, Đội 2 mang…',
    items: [
      { id: 'd2-1', text: '8 phần nem nướng Đà Lạt', illustrationKey: 'nem-nuong' },
      { id: 'd2-2', text: 'Soju mix Yakult gồm 10 chai soju và 5 lốc Yakult', illustrationKey: 'soju-yakult' },
    ],
  },
  3: {
    title: 'Tối đó, Đội 3 mang…',
    items: [
      { id: 'd3-1', text: '4 bánh pizza', illustrationKey: 'pizza' },
      { id: 'd3-2', text: '25 bánh canelé', illustrationKey: 'canele' },
    ],
  },
  4: {
    title: 'Tối đó, Đội 4 mang…',
    items: [
      { id: 'd4-1', text: '5 phần salad phô mai burrata', illustrationKey: 'burrata' },
      {
        id: 'd4-2',
        text: '25 phần đồ uống tổng cộng, gồm nước suối, sữa đậu nành và nước ngọt',
        illustrationKey: 'drinks',
      },
    ],
  },
};

/**
 * Strictly returns null unless the team has reached full capacity AND
 * a member has explicitly triggered opening the blind bag.
 */
export function getBagContentsIfOpened(
  teamId: TeamId,
  isFull: boolean,
  isOpened: boolean
): RevealedBag | null {
  if (!isFull || !isOpened) {
    return null;
  }
  return TEAM_BAG_SECRETS[teamId];
}

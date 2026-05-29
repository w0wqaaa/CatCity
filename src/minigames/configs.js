/**
 * Mini-Game configurations registry.
 * status: "active" | "placeholder"
 */
export const MINI_GAME_CONFIGS = {
  tic_tac_toe: {
    id:          "tic_tac_toe",
    name:        "Крестики-нолики",
    emoji:       "✖️",
    status:      "active",
    description: "Классические крестики-нолики 3×3. Ты X, бот — O.",
    rewards:     { win: 3, draw: 1, lose: 0 },
    supportsPvP: true,
  },
  blackjack: {
    id:          "blackjack",
    name:        "Блэкджек",
    emoji:       "🃏",
    status:      "active",
    description: "Карточная игра против робота-крупье. Ставь золото, набирай 21.",
    rewards:     "dynamic",
    supportsPvP: false,
  },
  chess: {
    id: "chess", name: "Шахматы", emoji: "♟️", status: "placeholder",
    description: "Шахматное измерение. Будет добавлено позже.",
  },
  checkers: {
    id: "checkers", name: "Шашки", emoji: "⚫", status: "placeholder",
    description: "Шашки против бота. Будет добавлено позже.",
  },
  connect_four: {
    id: "connect_four", name: "Connect Four", emoji: "🔴", status: "placeholder",
    description: "Четыре в ряд. Будет добавлено позже.",
  },
  minesweeper: {
    id: "minesweeper", name: "Сапёр", emoji: "💣", status: "placeholder",
    description: "Разминируй поле. Будет добавлено позже.",
  },
  sokoban: {
    id: "sokoban", name: "Sokoban", emoji: "📦", status: "placeholder",
    description: "Толкай ящики на правильные места. Будет добавлено позже.",
  },
  pipe_puzzle: {
    id: "pipe_puzzle", name: "Pipe Puzzle", emoji: "🔧", status: "placeholder",
    description: "Соедини трубы. Будет добавлено позже.",
  },
  dice_combo: {
    id: "dice_combo", name: "Кости", emoji: "🎲", status: "placeholder",
    description: "Кубики-комбо. Будет добавлено позже.",
  },
  wheel_of_fortune: {
    id: "wheel_of_fortune", name: "Колесо удачи", emoji: "🎡", status: "placeholder",
    description: "Испытай удачу. Будет добавлено позже.",
  },
  tower_defense_lite: {
    id: "tower_defense_lite", name: "Tower Defense Lite", emoji: "🏰", status: "placeholder",
    description: "Защищай базу. Будет добавлено позже.",
  },
  tron_duel: {
    id: "tron_duel", name: "Tron Duel", emoji: "⚡", status: "placeholder",
    description: "Гонка на световых мотоциклах. Будет добавлено позже.",
  },
  snake_duel: {
    id: "snake_duel", name: "Snake Duel", emoji: "🐍", status: "placeholder",
    description: "Два игрока — одно поле. Будет добавлено позже.",
  },
  poker_lite: {
    id: "poker_lite", name: "Покер", emoji: "♠️", status: "placeholder",
    description: "Мини-покер против робота. Будет добавлено позже.",
  },
  durak_lite: {
    id: "durak_lite", name: "Дурак", emoji: "🃏", status: "placeholder",
    description: "Карточная игра Дурак. Будет добавлено позже.",
  },
  memory_cards: {
    id: "memory_cards", name: "Memory Cards", emoji: "🧠", status: "placeholder",
    description: "Найди пары карточек. Будет добавлено позже.",
  },
};

export const LOCALES = ["ka", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CATEGORIES = ["signature", "bento", "kids", "wedding", "desserts"] as const;
export type Category = (typeof CATEGORIES)[number];

export const OCCASIONS = ["birthday", "wedding", "kids", "anniversary", "justBecause", "other"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const FORMATS = ["bento", "tiered", "desserts"] as const;
export type Format = (typeof FORMATS)[number];

export const CHANNELS = ["instagram", "phone", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const STATUSES = ["new", "confirmed", "inProgress", "ready", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];

/** A value the owner has not confirmed yet. It may drive logic but must never be shown as fact. */
export type Unconfirmed<T> = { confirmed: boolean; value: T };

export type OrderInput = {
  locale: Locale;
  occasion: Occasion;
  format: Format;
  guests: number;
  fillingId: string;
  referenceWork: string;
  uploadId: string;
  inscription: string;
  colours: string;
  date: string;
  fulfilment: "pickup" | "delivery";
  address: string;
  isGift: boolean;
  recipientName: string;
  recipientPhone: string;
  cardNote: string;
  allergies: string;
  customerName: string;
  customerPhone: string;
  customerInstagram: string;
  channel: Channel;
  reminderOptIn: boolean;
  privacyAccepted: boolean;
  /** Honeypot. Hidden from people, so anything in it means a bot filled the form. */
  website: string;
};

export type OrderRecord = OrderInput & {
  id: number;
  reference: string;
  token: string;
  status: OrderStatus;
  demo: boolean;
  createdAt: string;
};

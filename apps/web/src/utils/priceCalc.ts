export function calcQuestPrice(params: {
  questSlug: 'silent-hill' | 'harry-potter';
  players: number;
  time: string;
  withActor?: boolean;
}): number {
  const BASE = 2500;
  const EXTRA_PLAYER = 400;
  const ACTOR_FEE = 500;
  const EVENING_FEE = 500;

  const [h] = params.time.split(':').map(Number);
  const isEvening = h >= 19;

  let price = BASE;
  if (params.players > 4) price += (params.players - 4) * EXTRA_PLAYER;
  if (params.questSlug === 'harry-potter' && params.withActor) price += ACTOR_FEE;
  if (isEvening) price += EVENING_FEE;

  return price;
}

export function calcPackagePrice(params: {
  basePrice: number;
  basePlayers: number;
  pricePerExtra: number;
  players: number;
}): number {
  let price = params.basePrice;
  if (params.players > params.basePlayers) {
    price += (params.players - params.basePlayers) * params.pricePerExtra;
  }
  return price;
}

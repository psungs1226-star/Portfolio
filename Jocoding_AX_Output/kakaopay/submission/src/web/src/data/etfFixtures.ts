import { generatedMarketFixtures } from './marketFixtures.generated';
import { schdFixture } from './schdFixture';
import type { EtfFixture, EtfSymbol } from './marketFixtureTypes';

export const etfFixtures = [schdFixture, ...generatedMarketFixtures] satisfies EtfFixture[];

export function getEtfFixture(symbol: EtfSymbol) {
  return etfFixtures.find((fixture) => fixture.symbol === symbol) ?? schdFixture;
}

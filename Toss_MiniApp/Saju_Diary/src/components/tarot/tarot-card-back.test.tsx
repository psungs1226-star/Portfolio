// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ArcanaSymbol } from './arcana-symbols';
import { TarotCardBack } from './TarotCardBack';

afterEach(() => {
  cleanup();
});

describe('TarotCardBack', () => {
  it('renders an svg for multiple widths without throwing', () => {
    for (const width of [84, 200]) {
      const { container, unmount } = render(<TarotCardBack width={width} />);
      const svg = container.querySelector('svg');

      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('width')).toBe(String(width));

      unmount();
    }
  });
});

describe('ArcanaSymbol', () => {
  it('returns an element for every major arcana index', () => {
    for (let index = 0; index <= 21; index += 1) {
      const { container, unmount } = render(
        <svg viewBox="0 0 200 320">
          <ArcanaSymbol index={index} />
        </svg>,
      );

      expect(container.querySelector('g')).not.toBeNull();
      expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0);

      unmount();
    }
  });
});

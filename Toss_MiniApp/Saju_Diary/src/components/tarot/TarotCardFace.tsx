/**
 * TarotCardFace — 타로 카드 앞면(자체 호스팅 래스터 이미지, 외부 이미지 0, CRITICAL #2).
 *
 * 22장 메이저 아르카나를 Codex image_gen으로 생성한 "Peach Milk" 톤 일러스트(public/tarot/face-NN.png).
 * 카드명/정·역 라벨은 카드 바깥(TarotRevealed)에서 보여주므로 이미지엔 텍스트가 없다.
 * 역방향(reversed)은 이미지를 180° 회전.
 */
export interface TarotCardFaceProps {
  index: number;
  name: string;
  reversed: boolean;
  /** 카드 폭(px). 높이는 2:3로 자동. 기본 200. */
  width?: number;
}

export function TarotCardFace({ index, name, reversed, width = 200 }: TarotCardFaceProps) {
  const height = Math.round(width * 1.5);
  const nn = String(index).padStart(2, '0');
  return (
    <img
      src={`/tarot/face-${nn}.png`}
      alt={`타로 ${name} ${reversed ? '역방향' : '정방향'}`}
      width={width}
      height={height}
      style={{
        display: 'block',
        width,
        height,
        objectFit: 'contain',
        transform: reversed ? 'rotate(180deg)' : undefined,
      }}
    />
  );
}

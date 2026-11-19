import { useRef, useState } from 'react';
import { ClimberState, LimbId, Vec2 } from '../game/types';

interface LimbJoystickProps {
  climber: ClimberState;
  lockedLimb: LimbId | null;
  onSelectLimb: (limb: LimbId | null) => void;
}

const QUADRANTS: {
  id: LimbId;
  label: string;
  posClass: string;
  restOffset: Vec2;
}[] = [
  {
    id: 'leftHand',
    label: '左手',
    posClass: 'top-2.5 left-2.5 items-start justify-start',
    restOffset: { x: -12, y: -12 },
  },
  {
    id: 'rightHand',
    label: '右手',
    posClass: 'top-2.5 right-2.5 items-end justify-start',
    restOffset: { x: 12, y: -12 },
  },
  {
    id: 'leftFoot',
    label: '左脚',
    posClass: 'bottom-2.5 left-2.5 items-start justify-end',
    restOffset: { x: -12, y: 12 },
  },
  {
    id: 'rightFoot',
    label: '右脚',
    posClass: 'bottom-2.5 right-2.5 items-end justify-end',
    restOffset: { x: 12, y: 12 },
  },
];

function getLimbFromDelta(dx: number, dy: number): LimbId {
  if (dx < 0 && dy < 0) return 'leftHand';
  if (dx >= 0 && dy < 0) return 'rightHand';
  if (dx < 0 && dy >= 0) return 'leftFoot';
  return 'rightFoot';
}

export function LimbJoystick({
  climber,
  lockedLimb,
  onSelectLimb,
}: LimbJoystickProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const movedOutRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<Vec2 | null>(null);

  const computeDelta = (clientX: number, clientY: number): Vec2 => {
    const el = padRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    return { x: clientX - cx, y: clientY - cy };
  };

  const clampPuck = (dx: number, dy: number): Vec2 => {
    const maxR = 26;
    const d = Math.hypot(dx, dy);
    if (d <= maxR || d === 0) return { x: dx, y: dy };
    return { x: (dx / d) * maxR, y: (dy / d) * maxR };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    movedOutRef.current = false;

    const { x: dx, y: dy } = computeDelta(e.clientX, e.clientY);
    const d = Math.hypot(dx, dy);
    setDragOffset(clampPuck(dx, dy));

    if (d > 14) {
      movedOutRef.current = true;
      const limb = getLimbFromDelta(dx, dy);
      if (lockedLimb !== limb) {
        onSelectLimb(limb);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.stopPropagation();
    const { x: dx, y: dy } = computeDelta(e.clientX, e.clientY);
    const d = Math.hypot(dx, dy);
    setDragOffset(clampPuck(dx, dy));

    if (d > 11) {
      movedOutRef.current = true;
      const limb = getLimbFromDelta(dx, dy);
      if (lockedLimb !== limb) {
        onSelectLimb(limb);
      }
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.stopPropagation();
    const { x: dx, y: dy } = computeDelta(e.clientX, e.clientY);
    const d = Math.hypot(dx, dy);

    // Tapping dead-center toggles 智能 mode
    if (!movedOutRef.current && d <= 16) {
      onSelectLimb(lockedLimb === null ? 'rightHand' : null);
    }

    activePointerRef.current = null;
    movedOutRef.current = false;
    setDragOffset(null);
  };

  const restQuad = QUADRANTS.find((q) => q.id === lockedLimb);
  const puckPos: Vec2 = dragOffset ?? restQuad?.restOffset ?? { x: 0, y: 0 };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1 select-none">
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{ touchAction: 'none' }}
        aria-label="四肢切换摇杆"
        className="relative h-[122px] w-[122px] rounded-full border-2 border-[#141820] bg-[#141820]/90 shadow-[4px_4px_0px_#0B0E14] backdrop-blur-sm sm:h-[132px] sm:w-[132px]"
      >
        {/* Crosshair Divider Lines */}
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-[1px] -translate-y-1/2 bg-white/15" />
        <div className="pointer-events-none absolute inset-y-3 left-1/2 w-[1px] -translate-x-1/2 bg-white/15" />

        {/* 4 Limb Quadrant Labels */}
        {QUADRANTS.map((q) => {
          const limb = climber.limbs[q.id];
          const isSelected = lockedLimb === q.id;
          const highStrain = limb.strain > 0.55;
          const isDangling = limb.holdId === null;

          return (
            <div
              key={q.id}
              className={`pointer-events-none absolute flex h-10 w-10 flex-col rounded-lg px-1.5 py-1 transition-colors ${q.posClass} ${
                isSelected
                  ? 'bg-[#F59E0B] text-[#141820] font-bold shadow-[1px_1px_0px_#141820]'
                  : highStrain
                    ? 'bg-red-950/85 text-red-200'
                    : isDangling
                      ? 'bg-slate-800/60 text-slate-400'
                      : 'text-slate-200'
              }`}
            >
              <span className="text-[11px] leading-none whitespace-nowrap">
                {q.label}
              </span>
              {highStrain && (
                <span className="mt-1 h-0.5 w-4 bg-red-400" />
              )}
            </div>
          );
        })}

        {/* Center Thumb Puck */}
        <div
          style={{
            transform: `translate(calc(-50% + ${puckPos.x}px), calc(-50% + ${puckPos.y}px))`,
          }}
          className={`pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#141820] text-[10px] font-bold transition-transform duration-75 ${
            lockedLimb === null
              ? 'bg-[#F59E0B] text-[#141820]'
              : 'bg-[#F4F1EA] text-[#141820]'
          }`}
        >
          {lockedLimb === null
            ? '智能'
            : QUADRANTS.find((q) => q.id === lockedLimb)?.label}
        </div>
      </div>

      <span className="text-[10px] font-medium text-slate-300/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
        滑切四肢 · 中心智能
      </span>
    </div>
  );
}

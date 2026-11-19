import { useRef, useState } from 'react';
import { soundEngine, triggerHaptic } from '../game/audio';
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
    posClass: 'top-2 left-2 items-start justify-start',
    restOffset: { x: -11, y: -11 },
  },
  {
    id: 'rightHand',
    label: '右手',
    posClass: 'top-2 right-2 items-end justify-start',
    restOffset: { x: 11, y: -11 },
  },
  {
    id: 'leftFoot',
    label: '左脚',
    posClass: 'bottom-2 left-2 items-start justify-end',
    restOffset: { x: -11, y: 11 },
  },
  {
    id: 'rightFoot',
    label: '右脚',
    posClass: 'bottom-2 right-2 items-end justify-end',
    restOffset: { x: 11, y: 11 },
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
    const maxR = 23;
    const d = Math.hypot(dx, dy);
    if (d <= maxR || d === 0) return { x: dx, y: dy };
    return { x: (dx / d) * maxR, y: (dy / d) * maxR };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    soundEngine.init();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    movedOutRef.current = false;

    const { x: dx, y: dy } = computeDelta(e.clientX, e.clientY);
    const d = Math.hypot(dx, dy);
    setDragOffset(clampPuck(dx, dy));

    if (d > 13) {
      movedOutRef.current = true;
      const limb = getLimbFromDelta(dx, dy);
      if (lockedLimb !== limb) {
        soundEngine.playLimbTick();
        triggerHaptic(8);
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
        soundEngine.playLimbTick();
        triggerHaptic(8);
        onSelectLimb(limb);
      }
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.stopPropagation();
    const { x: dx, y: dy } = computeDelta(e.clientX, e.clientY);
    const d = Math.hypot(dx, dy);

    if (!movedOutRef.current && d <= 16) {
      soundEngine.playLimbTick();
      triggerHaptic(8);
      onSelectLimb(lockedLimb === null ? 'rightHand' : null);
    }

    activePointerRef.current = null;
    movedOutRef.current = false;
    setDragOffset(null);
  };

  const restQuad = QUADRANTS.find((q) => q.id === lockedLimb);
  const puckPos: Vec2 = dragOffset ?? restQuad?.restOffset ?? { x: 0, y: 0 };

  return (
    <div className="pointer-events-auto select-none">
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{ touchAction: 'none' }}
        aria-label="四肢切换摇杆（滑切四肢，点中心切换智能）"
        className="relative h-[108px] w-[108px] rounded-full border-2 border-[#141820] bg-[#141820]/88 shadow-[3px_3px_0px_#0B0E14] backdrop-blur-sm sm:h-[120px] sm:w-[120px]"
      >
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-[1px] -translate-y-1/2 bg-white/15" />
        <div className="pointer-events-none absolute inset-y-3 left-1/2 w-[1px] -translate-x-1/2 bg-white/15" />

        {QUADRANTS.map((q) => {
          const limb = climber.limbs[q.id];
          const isSelected = lockedLimb === q.id;
          const highStrain = limb.strain > 0.55;
          const medStrain = limb.strain > 0.25 && !highStrain;
          const isDangling = limb.holdId === null;

          return (
            <div
              key={q.id}
              className={`pointer-events-none absolute flex h-9 w-9 flex-col rounded-md px-1 py-0.5 transition-colors ${q.posClass} ${
                isSelected
                  ? 'bg-[#F59E0B] text-[#141820] font-bold'
                  : highStrain
                    ? 'bg-orange-600/80 text-amber-100'
                    : medStrain
                      ? 'bg-amber-500/25 text-amber-200'
                      : isDangling
                        ? 'bg-slate-800/60 text-slate-400'
                        : 'text-slate-200'
              }`}
            >
              <span className="text-[10px] leading-none whitespace-nowrap sm:text-[11px]">
                {q.label}
              </span>
              {(highStrain || medStrain) && (
                <span
                  className={`mt-1 h-0.5 w-3.5 ${
                    highStrain ? 'bg-orange-300' : 'bg-yellow-300'
                  }`}
                />
              )}
            </div>
          );
        })}

        <div
          style={{
            transform: `translate(calc(-50% + ${puckPos.x}px), calc(-50% + ${puckPos.y}px))`,
          }}
          className={`pointer-events-none absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#141820] text-[10px] font-bold transition-transform duration-75 sm:h-10 sm:w-10 ${
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
    </div>
  );
}

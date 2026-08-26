import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef, useImperativeHandle } from 'react';
import gsap from 'gsap';
import './CardSwap.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ customClass, children, className = '', ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={`card-swap-card ${customClass ?? ''} ${className}`.trim()}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

export interface CardSwapHandle {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  onActiveChange?: (index: number) => void;
  skewAmount?: number;
  autoPlay?: boolean;
  children: React.ReactNode;
}

export const CardSwap = forwardRef<CardSwapHandle, CardSwapProps>(({
  width = 540,
  height = 360,
  cardDistance = 45,
  verticalDistance = 35,
  delay = 4000,
  pauseOnHover = true,
  onCardClick,
  onActiveChange,
  skewAmount = 4,
  autoPlay = true,
  children
}, ref) => {
  const childArr = useMemo(() => Children.toArray(children), [children]);
  const total = childArr.length;

  const refs = useMemo(
    () => childArr.map(() => React.createRef<HTMLDivElement>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const order = useRef<number[]>(Array.from({ length: total }, (_, i) => i));
  const isAnimating = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  const makeSlot = (i: number, distX: number, distY: number, count: number) => ({
    x: i * distX,
    y: -i * distY,
    z: -i * distX * 1.6,
    opacity: i < 5 ? 1 - i * 0.14 : 0,
    scale: 1 - i * 0.04,
    zIndex: count - i
  });

  const placeNow = (el: HTMLElement | null, slot: ReturnType<typeof makeSlot>, skew: number) => {
    if (!el) return;
    gsap.set(el, {
      x: slot.x,
      y: slot.y,
      z: slot.z,
      opacity: slot.opacity,
      scale: slot.scale,
      xPercent: -50,
      yPercent: -50,
      skewY: skew,
      transformOrigin: 'center center',
      zIndex: slot.zIndex,
      force3D: true
    });
  };

  const swapNext = () => {
    if (order.current.length < 2 || isAnimating.current) return;
    isAnimating.current = true;

    const [front, ...rest] = order.current;
    const elFront = refs[front].current;
    if (!elFront) {
      isAnimating.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        order.current = [...rest, front];
        isAnimating.current = false;
        onActiveChange?.(order.current[0]);
      }
    });

    // 1. Front card drops down with motion & fade
    tl.to(elFront, {
      y: '+=380',
      opacity: 0,
      scale: 0.88,
      duration: 0.65,
      ease: 'power2.inOut'
    });

    // 2. Promote rest of the cards forward
    rest.forEach((idx, i) => {
      const el = refs[idx].current;
      if (!el) return;
      const slot = makeSlot(i, cardDistance, verticalDistance, total);
      tl.set(el, { zIndex: slot.zIndex }, '<0.1');
      tl.to(
        el,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          opacity: slot.opacity,
          scale: slot.scale,
          duration: 0.6,
          ease: 'power2.out'
        },
        '<0.05'
      );
    });

    // 3. Bring dropped front card to back slot
    const backSlot = makeSlot(total - 1, cardDistance, verticalDistance, total);
    tl.call(() => {
      placeNow(elFront, { ...backSlot, y: backSlot.y + 120, opacity: 0 }, skewAmount);
    });
    tl.to(elFront, {
      x: backSlot.x,
      y: backSlot.y,
      z: backSlot.z,
      opacity: backSlot.opacity,
      scale: backSlot.scale,
      duration: 0.55,
      ease: 'power2.out'
    }, '-=0.2');
  };

  const swapPrev = () => {
    if (order.current.length < 2 || isAnimating.current) return;
    isAnimating.current = true;

    const last = order.current[order.current.length - 1];
    const rest = order.current.slice(0, -1);
    const elLast = refs[last].current;
    if (!elLast) {
      isAnimating.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        order.current = [last, ...rest];
        isAnimating.current = false;
        onActiveChange?.(order.current[0]);
      }
    });

    // Push current front cards backward
    order.current.forEach((idx, i) => {
      if (i >= total - 1) return;
      const el = refs[idx].current;
      if (!el) return;
      const slot = makeSlot(i + 1, cardDistance, verticalDistance, total);
      tl.to(el, {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        opacity: slot.opacity,
        scale: slot.scale,
        duration: 0.55,
        ease: 'power2.out'
      }, 0);
    });

    // Bring last card from back into front
    const frontSlot = makeSlot(0, cardDistance, verticalDistance, total);
    tl.set(elLast, { zIndex: frontSlot.zIndex + 1 });
    tl.fromTo(elLast, 
      { y: '+=380', opacity: 0, scale: 0.88 },
      {
        x: frontSlot.x,
        y: frontSlot.y,
        z: frontSlot.z,
        opacity: frontSlot.opacity,
        scale: frontSlot.scale,
        duration: 0.65,
        ease: 'power2.out'
      },
      0
    );
  };

  useImperativeHandle(ref, () => ({
    next: swapNext,
    prev: swapPrev,
    goTo: (targetIdx: number) => {
      const currentFront = order.current[0];
      if (currentFront === targetIdx) return;
      swapNext();
    }
  }));

  // Initial layout
  useEffect(() => {
    refs.forEach((r, i) => {
      placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount);
    });
  }, [cardDistance, verticalDistance, total, skewAmount, refs]);

  // Autoplay loop
  useEffect(() => {
    if (!autoPlay) return;

    intervalRef.current = window.setInterval(() => {
      swapNext();
    }, delay);

    if (pauseOnHover && container.current) {
      const node = container.current;
      const pause = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
      const resume = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => swapNext(), delay);
      };
      node.addEventListener('mouseenter', pause);
      node.addEventListener('mouseleave', resume);
      return () => {
        node.removeEventListener('mouseenter', pause);
        node.removeEventListener('mouseleave', resume);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [delay, autoPlay, pauseOnHover]);

  return (
    <div
      ref={container}
      className="card-swap-container"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    >
      {childArr.map((child, i) => {
        if (!isValidElement(child)) return child;
        const elem = child as React.ReactElement<React.HTMLAttributes<HTMLDivElement>>;
        return cloneElement(elem, {
          key: i,
          ref: refs[i],
          style: {
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            ...(elem.props.style ?? {})
          },
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            elem.props.onClick?.(e);
            onCardClick?.(i);
            if (order.current[0] !== i) {
              swapNext();
            }
          }
        } as React.HTMLAttributes<HTMLDivElement> & { ref: React.RefObject<HTMLDivElement | null> });
      })}
    </div>
  );
});

CardSwap.displayName = 'CardSwap';

export default CardSwap;

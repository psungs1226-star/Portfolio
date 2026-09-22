import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(min-width: 1101px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)', () => {
  const stage = document.querySelector('.swipe-story');
  const viewport = document.querySelector('.swipe-viewport');
  const track = document.querySelector('.swipe-track');
  const panels = [...document.querySelectorAll('.swipe-panel')];
  const position = document.querySelector('.swipe-position');
  const rail = document.querySelector('.swipe-rail span');
  document.documentElement.classList.add('has-swipe');

  const horizontal = gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - viewport.clientWidth),
    ease: 'none',
    scrollTrigger: {
      id: 'groupby-full-scene-swipe',
      trigger: stage,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 2.7),
      pin: viewport,
      scrub: 0.55,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: {
        snapTo: [0, 0.5, 1],
        duration: { min: 0.18, max: 0.38 },
        delay: 0.12,
        ease: 'power1.inOut'
      },
      onUpdate(self) {
        const step = self.progress < 0.25 ? 1 : self.progress < 0.75 ? 2 : 3;
        position.innerHTML = '0' + step + ' <i aria-hidden="true">/</i> 03';
        gsap.set(rail, { scaleX: self.progress });
      }
    }
  });

  // These reveals align with each whole-width scene as it passes through the viewport.
  const flowReveal = gsap.fromTo(
    panels[1].querySelectorAll('.flow-cell'),
    { y: 25, opacity: 0.45 },
    {
      y: 0, opacity: 1, ease: 'none',
      scrollTrigger: {
        containerAnimation: horizontal,
        trigger: panels[1],
        start: 'left 90%',
        end: 'left 25%',
        scrub: true
      }
    }
  );

  const revenueReveal = gsap.to(panels[1].querySelectorAll('.revenue-cell'), {
    '--revenue-line': '100%',
    ease: 'none',
    scrollTrigger: {
      containerAnimation: horizontal,
      trigger: panels[1],
      start: 'left 55%',
      end: 'left 15%',
      scrub: true
    }
  });

  const documentReveal = gsap.fromTo(
    panels[2].querySelector('.execution-index'),
    { x: 50, opacity: 0.5 },
    {
      x: 0, opacity: 1, ease: 'none',
      scrollTrigger: {
        containerAnimation: horizontal,
        trigger: panels[2],
        start: 'left 85%',
        end: 'left 28%',
        scrub: true
      }
    }
  );

  return () => {
    [flowReveal, revenueReveal, documentReveal, horizontal].forEach((tween) => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });
    gsap.set([
      track, rail,
      ...panels[1].querySelectorAll('.flow-cell'),
      ...panels[1].querySelectorAll('.revenue-cell'),
      panels[2].querySelector('.execution-index')
    ], { clearProps: 'all' });
    position.innerHTML = '01 <i aria-hidden="true">/</i> 03';
    document.documentElement.classList.remove('has-swipe');
  };
});

mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.fromTo('.kicker-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'power2.out' });
});

Promise.all([
  document.fonts.ready,
  ...[...document.images].map((image) => image.complete ? Promise.resolve() : image.decode().catch(() => {}))
]).then(() => ScrollTrigger.refresh());

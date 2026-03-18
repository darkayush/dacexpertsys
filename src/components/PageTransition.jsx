import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('enter'); // 'enter' | 'exit'

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // 1. Start exit animation
      setStage('exit');

      // 2. After exit completes, swap content and enter
      const id = setTimeout(() => {
        setDisplayLocation(location);
        setStage('enter');
      }, 180); // must match --pt-duration below

      return () => clearTimeout(id);
    }
  }, [location, displayLocation]);

  return (
    <>
      <style>{`
        :root {
          --pt-duration: 180ms;
          --pt-easing: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .pt-enter {
          animation: pt-fade-up var(--pt-duration) var(--pt-easing) forwards;
        }

        .pt-exit {
          animation: pt-fade-down var(--pt-duration) var(--pt-easing) forwards;
          pointer-events: none;
        }

        @keyframes pt-fade-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pt-fade-down {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-6px);
          }
        }
      `}</style>

      <div key={displayLocation.pathname} className={stage === 'enter' ? 'pt-enter' : 'pt-exit'}>
        {children}
      </div>
    </>
  );
}
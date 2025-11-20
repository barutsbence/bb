import React from 'react';

const CircleOfFifths: React.FC = () => {
  const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
  
  const radius = 180;
  const center = 200;

  return (
    <div className="flex justify-center items-center my-4">
      <svg viewBox="0 0 400 400" className="w-full max-w-sm text-gray-300">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 0.75} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        
        {majorKeys.map((key, i) => {
          // Calculate angle for each key. -90 degrees to start C at the top (12 o'clock).
          const angle = (i * 30 - 90) * (Math.PI / 180); 
          
          const majorRadius = radius * 0.88;
          const majorX = center + majorRadius * Math.cos(angle);
          const majorY = center + majorRadius * Math.sin(angle);

          const minorRadius = radius * 0.62;
          const minorX = center + minorRadius * Math.cos(angle);
          const minorY = center + minorRadius * Math.sin(angle);

          return (
            <g key={key}>
              <text
                x={majorX}
                y={majorY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-lg font-bold text-teal-300 fill-current"
              >
                {key}
              </text>
              <text
                x={minorX}
                y={minorY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-base text-gray-400 fill-current"
              >
                {minorKeys[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CircleOfFifths;

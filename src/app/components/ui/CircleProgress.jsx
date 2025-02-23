import React from 'react';

const CircleProgress = ({ timeInMinutes, progress }) => {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg height="120" width="120">
      <circle
        stroke="#e6e6e6"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx="60"
        cy="60"
      />
      <circle
        stroke="#4caf50"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx="60"
        cy="60"
        strokeDasharray={circumference + ' ' + circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease 0s' }}
      />
      <text x="50%" y="50%" textAnchor="middle" stroke="#51c5cf" strokeWidth="1px" dy=".3em">
        {timeInMinutes} min
      </text>
    </svg>
  );
};

export default CircleProgress;
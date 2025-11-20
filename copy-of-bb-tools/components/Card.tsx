
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: string;
}

const Card: React.FC<CardProps> = ({ children, className, title, icon }) => {
  return (
    <div className={`relative bg-slate-800/50 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-lg p-6 sm:p-8 ${className}`}>
        {title && (
             <h2 className="text-2xl font-bold mb-6 text-teal-300 flex items-center gap-3">
                {icon && <i className={icon}></i>}
                {title}
            </h2>
        )}
      {children}
    </div>
  );
};

export default Card;

import React, { useState } from 'react';

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden mt-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 bg-slate-800 hover:bg-slate-700/50 flex justify-between items-center transition-colors"
            >
                <h3 className="text-lg font-semibold text-teal-300">{title}</h3>
                <i className={`fa-solid fa-chevron-down transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 bg-slate-900/30 text-gray-300 leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AccordionSection;

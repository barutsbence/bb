
import React, { useState } from 'react';
import { generateMusicalIdea } from '../services/geminiService';
import Spinner from './Spinner';
import Card from './Card';

const IdeaGenerator: React.FC = () => {
  const [idea, setIdea] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setIdea('');
    try {
      const result = await generateMusicalIdea();
      setIdea(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Kreatív Ötlet Generátor" icon="fa-solid fa-lightbulb">
        <div className="text-center">
            <p className="text-gray-400 mb-6">Elakadtál a dalszerzésben? Kattints a gombra egy új, inspiráló ötletért!</p>
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 duration-300 text-lg"
            >
                 <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                {isLoading ? 'Gondolkodom...' : 'Új Ötlet'}
            </button>
        </div>

        {isLoading && <div className="mt-8"><Spinner /></div>}
        
        {error && <p className="mt-6 text-center text-red-400">{error}</p>}

        {idea && (
            <div className="mt-8 p-6 bg-gray-700/30 border border-gray-600 rounded-lg">
                <p className="text-lg text-gray-200 leading-relaxed italic">"{idea}"</p>
            </div>
        )}
    </Card>
  );
};

export default IdeaGenerator;

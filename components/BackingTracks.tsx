import React from 'react';
import Card from './Card';

const tracks = [
    {
        label: 'Gitár (Rock/Pop)',
        icon: 'fa-solid fa-guitar',
        url: 'https://www.youtube.com/playlist?list=PL_N5J62tF3AWWmIRFKlYtwaX_Ro5n1fVY'
    },
    {
        label: 'Gitár (Jazz)',
        icon: 'fa-solid fa-guitar',
        url: 'https://www.youtube.com/playlist?list=PLUExMPmFbP3oqsUXN0ukt4VUmfCEfBy4L'
    },
    {
        label: 'Basszusgitár',
        icon: 'fa-solid fa-guitar',
        url: 'https://www.youtube.com/playlist?list=PL_N5J62tF3AXeTTT0jdPIFBgDsLztmhH2'
    }
];

const BackingTracks: React.FC = () => {
    return (
        <Card title="Kísérő Sávok (Backing Tracks)" icon="fa-brands fa-youtube">
            <p className="text-center text-gray-400 mb-6">
                Kattints egy linkre a kísérő sávok lejátszási listájának megnyitásához egy új lapon.
            </p>
            <div className="space-y-4 max-w-lg mx-auto">
                {tracks.map((track) => (
                    <a
                        key={track.label}
                        href={track.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center w-full px-6 py-4 text-lg font-semibold text-white bg-gray-700 rounded-lg shadow-md transition-all duration-300 hover:bg-gray-600 hover:shadow-lg transform hover:-translate-y-1"
                    >
                        <i className={`${track.icon} mr-4 text-teal-400 text-xl`}></i>
                        <span className="flex-grow text-left">{track.label}</span>
                        <i className="fa-solid fa-arrow-up-right-from-square ml-4 text-gray-400"></i>
                    </a>
                ))}
            </div>
        </Card>
    );
};

export default BackingTracks;

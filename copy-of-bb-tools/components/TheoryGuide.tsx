import React, { useState, useMemo } from 'react';
import Card from './Card';
import CircleOfFifths from './CircleOfFifths';
import { SCALES, CHORDS } from '../constants';

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
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

const TheoryTable: React.FC<{ headers: string[], data: (string | React.ReactNode)[][] }> = ({ headers, data }) => (
    <div className="overflow-x-auto rounded-lg border border-slate-700/50 my-4">
        <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
                <tr>
                    {headers.map(header => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">{header}</th>)}
                </tr>
            </thead>
            <tbody className="bg-slate-800/50 divide-y divide-slate-700/50">
                {data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                        {row.map((cell, j) => <td key={j} className={`px-4 py-3 text-sm whitespace-nowrap align-middle`}>{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const NoteIcon: React.FC<{ type: string }> = ({ type }) => {
    const commonSVGProps = {
        width: "28",
        height: "32",
        viewBox: "0 0 28 32",
        className: "inline-block fill-current text-gray-300"
    };
    const commonStem = <line x1="15" y1="27" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" />;
    const quarterNoteHead = <ellipse cx="10" cy="27" rx="5" ry="3.5" />;
    const emptyNoteHead = <ellipse cx="10" cy="27" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />;

    switch (type) {
        case 'whole':
            return <svg {...commonSVGProps} viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>;
        case 'half':
            return <svg {...commonSVGProps}>{emptyNoteHead}{commonStem}</svg>;
        case 'quarter':
            return <svg {...commonSVGProps}>{quarterNoteHead}{commonStem}</svg>;
        case 'eighth':
            return (
                <svg {...commonSVGProps}>
                    {quarterNoteHead}{commonStem}
                    <path d="M15 5 C 19 6, 21 9, 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
            );
        case 'sixteenth':
            return (
                <svg {...commonSVGProps}>
                    {quarterNoteHead}{commonStem}
                    <path d="M15 5 C 19 6, 21 9, 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <path d="M15 9 C 19 10, 21 13, 20 16" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
            );
        case 'whole_rest':
            return <svg {...commonSVGProps} viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="4" /></svg>;
        case 'half_rest':
            return <svg {...commonSVGProps} viewBox="0 0 24 24"><rect x="6" y="12" width="12" height="4" /></svg>;
        case 'quarter_rest':
            return <svg {...commonSVGProps} stroke="currentColor" strokeWidth="2" fill="none"><path d="M10 6 C 14 8, 6 10, 10 12 S 6 14, 10 16 C 8 18, 12 20, 10 22" strokeLinecap="round" /></svg>;
        case 'eighth_rest':
            return <svg {...commonSVGProps} stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="10" r="3" fill="currentColor" /><line x1="12" y1="13" x2="8" y2="20" strokeLinecap="round" /></svg>;
        case 'sixteenth_rest':
             return <svg {...commonSVGProps} stroke="currentColor" strokeWidth="2" fill="none"><circle cx="13" cy="8" r="3" fill="currentColor" /><circle cx="11" cy="14" r="3" fill="currentColor" /><line x1="12" y1="11" x2="8" y2="22" strokeLinecap="round" /></svg>;
        default:
            return null;
    }
};

const getSeventhChordForScale = (intervals: number[]): string => {
    if (intervals.length < 7) return '-';

    const thirdInterval = intervals[2];
    const fifthInterval = intervals[4];
    const seventhInterval = intervals[6];

    if (thirdInterval === 4 && fifthInterval === 7 && seventhInterval === 11) return 'maj7';
    if (thirdInterval === 3 && fifthInterval === 7 && seventhInterval === 10) return 'm7';
    if (thirdInterval === 4 && fifthInterval === 7 && seventhInterval === 10) return '7';
    if (thirdInterval === 3 && fifthInterval === 6 && seventhInterval === 10) return 'm7♭5';
    if (thirdInterval === 3 && fifthInterval === 6 && seventhInterval === 9) return 'dim7';
    if (thirdInterval === 3 && fifthInterval === 7 && seventhInterval === 11) return 'm(maj7)';
    if (thirdInterval === 4 && fifthInterval === 8 && seventhInterval === 11) return 'maj7#5';
    if (thirdInterval === 4 && fifthInterval === 8 && seventhInterval === 10) return '7#5';
    
    return 'N/A';
};

const getChordFormulaFromScale = (degreeFormula: string): string => {
    const degrees = degreeFormula.split('-');
    if (degrees.length < 7) {
        return ''; // Return empty string if not a 7-note scale
    }
    // Grabs the 1st, 3rd, 5th, and 7th degrees
    return `${degrees[0]}-${degrees[2]}-${degrees[4]}-${degrees[6]}`;
};

const TheoryGuide: React.FC = () => {
    const [isSortedByBrightness, setIsSortedByBrightness] = useState(false);
    
    // FIX: Explicitly type `groupedScales` to fix type inference issue with `Object.fromEntries`.
    const groupedScales: Record<string, (typeof SCALES[string] & {name: string})[]> = useMemo(() => {
        const categoryOrder = ['Dúr móduszai', 'Dallamos moll móduszai', 'Összhangzatos moll móduszai', 'Egyéb'];
        
        const grouped = Object.entries(SCALES).reduce((acc, [name, data]) => {
            const category = data.category || 'Egyéb';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ name, ...data });
            return acc;
        }, {} as Record<string, (typeof SCALES[string] & {name: string})[]>);

        for (const category in grouped) {
             if (isSortedByBrightness) {
                grouped[category].sort((a, b) => (b.brightness ?? 0) - (a.brightness ?? 0));
            } else {
                grouped[category].sort((a, b) => (a.modeOrder ?? 99) - (b.modeOrder ?? 99));
            }
        }

        return Object.fromEntries(
            Object.entries(grouped).sort(([catA], [catB]) => {
                const indexA = categoryOrder.indexOf(catA);
                const indexB = categoryOrder.indexOf(catB);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            })
        );
    }, [isSortedByBrightness]);

    const triads = Object.entries(CHORDS).filter(([_, data]) => data.intervals.length === 3);
    const seventhChords = Object.entries(CHORDS).filter(([_, data]) => data.intervals.length === 4);
    
    return (
        <Card title="Zeneelméleti Útmutató" icon="fa-solid fa-book-open">
            <div className="space-y-4">
                 <AccordionSection title="Zenei Alapfogalmak" defaultOpen={true}>
                    <p>A hang egy akusztikai jelenség, amelyet a levegő rezgése kelt. A <strong>zenei hang</strong> egy szabályos, matematikailag meghatározható rezgés, míg a <strong>zörej</strong> egy szabálytalan frekvenciájú, és matematikailag nem meghatározható rezgés.</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">A zenei hang tulajdonságai</h4>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>Magasság:</strong> A hang frekvenciája (Hz). A mélyebb hangok frekvenciája kisebb, a magasabbaké nagyobb.</li>
                        <li><strong>Hangerő:</strong> A rezgés amplitúdójától függ (Phon).</li>
                        <li><strong>Hangszín:</strong> A hangot alkotó felhangoktól függ, amelyek az alaphang frekvenciájának egész számú többszörösei.</li>
                        <li><strong>Időtartam:</strong> A hang hosszúsága.</li>
                    </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Az oktávok beosztása</h4>
                     <p>A hangok magasságát és mélységét az oktávok segítségével határozzuk meg. A zongora klaviatúráját felosztva a következő elnevezéseket kapjuk, a mélytől a magas felé haladva:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                         <li>Subkontra</li>
                         <li>Kontra</li>
                         <li>Nagy</li>
                         <li>Kis</li>
                         <li>Egyvonalas (ez a "normál" zongora közepén található)</li>
                         <li>Kétvonalas</li>
                         <li>Háromvonalas</li>
                         <li>Négyvonalas</li>
                         <li>Ötvonalas</li>
                     </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">A temperált hangrendszer és az enharmónia</h4>
                     <p>Az európai billentyűs hangszerek oktávonként 12 egyenlő részre osztják a hangsort. Ezt a rendszert <strong>temperált hangrendszernek</strong> nevezzük. Ennek eredményeképpen jön létre az <strong>enharmónia</strong>, ami azt jelenti, hogy bizonyos hangok azonos helyre kerülnek, de elnevezésük eltér, mert más-más hangból származnak (pl. az F♯ és a G♭ ugyanazt a hangot jelöli).</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Zenei Kulcsok</h4>
                    <p>A kulcsok segítenek meghatározni a hangjegyek helyét az 5 vonalból álló vonalrendszeren.</p>
                    <TheoryTable headers={['Kulcs', 'Más néven', 'Meghatározott hang', 'Használat (példa)']} data={[
                        ['Violinkulcs', 'G-kulcs', 'Egyvonalas G a 2. vonalon', 'Hegedű, fuvola, trombita'],
                        ['Basszuskulcs', 'F-kulcs', 'Kis F a 4. vonalon', 'Cselló, bőgő, harsona'],
                        ['Altkulcs', 'C-kulcs', 'Egyvonalas C a 3. vonalon', 'Brácsa'],
                        ['Tenorkulcs', 'C-kulcs', 'Egyvonalas C a 4. vonalon', 'Cselló, fagott (magas regiszter)'],
                    ]} />
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Alterációk (Módosítójelek)</h4>
                    <p>Az alterációs jelek a hangjegyek magasságát módosítják egy félhanggal vagy egészhanggal. Például az F hangból 'fisz' lesz (F♯), a G-ből 'gesz' (G♭). Kivétel: a H hangból leszállítva 'bé' (B) lesz.</p>
                     <TheoryTable headers={['Jel', 'Név', 'Hatás', 'Példa']} data={[
                        ['♯', 'Kereszt', '+1 félhang', 'F → Fisz'],
                        ['𝄪', 'Kettős kereszt', '+2 félhang', 'D → Diszisz'],
                        ['♭', 'Bé', '-1 félhang', 'G → Gesz, H → B'],
                        ['𝄫', 'Kettős bé', '-2 félhang', 'G → Geszesz'],
                        ['♮', 'Feloldójel', 'Törli a módosítást', '-'],
                    ]} />
                </AccordionSection>

                <AccordionSection title="Hangközök">
                    <p>A hangköz a két zenei hang közötti magasságbeli távolság. A hangközöket a bennük lévő félhangok száma alapján mérjük. Minden hangköznek van egy száma (szekund, terc stb.) és egy minősége (tiszta, nagy, kis, bővített, szűkített).</p>
                    <TheoryTable 
                        headers={['Név', 'Rövidítés', 'Félhangok száma', 'Példa (C-től)']} 
                        data={[
                            ['Tiszta Prím', 'P1', 0, 'C – C'],
                            ['Kis Szekund', 'm2', 1, 'C – D♭'],
                            ['Nagy Szekund', 'M2', 2, 'C – D'],
                            ['Kis Terc', 'm3', 3, 'C – E♭'],
                            ['Nagy Terc', 'M3', 4, 'C – E'],
                            ['Tiszta Kvárt', 'P4', 5, 'C – F'],
                            ['Bővített Kvárt / Szűkített Kvint', 'A4 / d5', 6, 'C – F♯'],
                            ['Tiszta Kvint', 'P5', 7, 'C – G'],
                            ['Kis Szext', 'm6', 8, 'C – A♭'],
                            ['Nagy Szext', 'M6', 9, 'C – A'],
                            ['Kis Szeptim', 'm7', 10, 'C – B♭'],
                            ['Nagy Szeptim', 'M7', 11, 'C – H'],
                            ['Tiszta Oktáv', 'P8', 12, 'C – C (magasabb)'],
                        ]} 
                    />
                </AccordionSection>

                <AccordionSection title="Ritmusok és Időtartamok">
                    <p>A ritmus a hangok és szünetek időbeli elosztásának rendje a zenében, a tempó pedig a ritmus gyorsaságának foka. A zenei ritmus alapvető tulajdonsága a hangsúlyok rendszeres ismétlődése.</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Metrum (Ütemmutató)</h4>
                    <p>A metrum a zene lüktetésének mértékegysége, melyet tört számmal jelölünk (pl. 4/4). A <strong>számláló</strong> (felső szám) az ütemen belüli leütések számát, a <strong>nevező</strong> (alsó szám) pedig a metrikus egységet (pl. 4 = negyed) mutatja. Az <strong>Alla Breve (𝄴)</strong> egy 4/4-es ütem, ahol a számolás feleződik, és a metrikus egység a félhang.</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Alapvető Hangjegyértékek</h4>
                    <TheoryTable 
                        headers={['Hangjegy', 'Név', 'Ütés (4/4-ben)', 'Szünet jele']} 
                        data={[
                            [<NoteIcon type="whole" />, 'Egész hang', '4 ütés', <NoteIcon type="whole_rest" />],
                            [<NoteIcon type="half" />, 'Fél hang', '2 ütés', <NoteIcon type="half_rest" />],
                            [<NoteIcon type="quarter" />, 'Negyed hang', '1 ütés', <NoteIcon type="quarter_rest" />],
                            [<NoteIcon type="eighth" />, 'Nyolcad hang', '1/2 ütés', <NoteIcon type="eighth_rest" />],
                            [<NoteIcon type="sixteenth" />, 'Tizenhatod hang', '1/4 ütés', <NoteIcon type="sixteenth_rest" />],
                        ]} 
                    />
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Különleges Ritmikai Jelenségek</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Nyújtott ritmus:</strong> Ha egy hangjegy mögé pontot teszünk, az értékének a felével meghosszabbodik.</li>
                        <li><strong>Szinkópa:</strong> Előtét nélküli hangsúlyeltolódás, amely a hangsúlyt egy "gyenge" ütemrészre helyezi.</li>
                        <li><strong>Triola:</strong> Három egyenlő értékű hang, amelyet két ugyanolyan értékű hang ideje alatt kell eljátszani.</li>
                        <li><strong>Duola:</strong> A triola fordítottja, két hangot kell megszólaltatni három ideje alatt. Csak páratlan metrumokban fordul elő.</li>
                        <li><strong>Polimetria:</strong> Többféle metrum egy darabon belül.</li>
                        <li><strong>Poliritmika:</strong> Különböző ritmikus beosztások egyidejűleg (pl. egy szólam triolázik, míg a másik nyolcadokat játszik).</li>
                    </ul>
                </AccordionSection>
                
                 <AccordionSection title="Dinamika és Tempó">
                    <p>Ezek a jelek a zene hangerejét (dinamika) és sebességét (tempó) szabályozzák, legtöbbször olasz kifejezésekkel.</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                             <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Dinamikai Jelek</h4>
                            <TheoryTable headers={['Jel', 'Név', 'Jelentés']} data={[
                                ['pp', 'pianissimo', 'nagyon halkan'],
                                ['p', 'piano', 'halkan'],
                                ['mf', 'mezzoforte', 'középerősen'],
                                ['f', 'forte', 'erősen'],
                                ['ff', 'fortissimo', 'nagyon erősen'],
                                ['cresc.', 'crescendo', 'fokozatosan erősítve'],
                                ['dim.', 'diminuendo', 'fokozatosan halkítva'],
                            ]} />
                        </div>
                        <div>
                             <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Tempójelzések</h4>
                            <TheoryTable headers={['Jel', 'Jelentés']} data={[
                                ['Largo', 'nagyon szélesen, lassan'],
                                ['Adagio', 'nagyon lassan'],
                                ['Andante', 'lassan, lépkedve'],
                                ['Moderato', 'mérsékelten'],
                                ['Allegro', 'gyorsan'],
                                ['Presto', 'sebesen'],
                                ['rit.', 'ritenuto/ritardando', 'fokozatosan lassítva'],
                                ['accel.', 'accelerando', 'fokozatosan gyorsítva'],
                            ]} />
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="Hármas- és Négyeshangzatok">
                    <p>Az akkord több hang egyidejű megszólaltatása. A hármashangzatok három, a négyeshangzatok négy hangból állnak, és a skála különböző fokain épülnek terc hangközökből.</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Hármashangzatok</h4>
                     <ul className="list-disc list-inside space-y-1 mt-2">
                        {triads.map(([name, data]) => (
                             <li key={name}><b>{name.replace(' hármas', '')}:</b> <span className="font-mono">{data.formula}</span> (pl. {name === 'Dúr hármas' ? 'Nagy terc + Kis terc' : name === 'Moll hármas' ? 'Kis terc + Nagy terc' : name === 'Szűkített hármas' ? 'Két kis terc' : 'Két nagy terc'})</li>
                        ))}
                    </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Négyeshangzatok (Szeptimakkordok)</h4>
                    <p>A négyeshangzatok négy hangból állnak, és gazdagabb harmóniát biztosítanak.</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                         {seventhChords.map(([name, data]) => (
                            <li key={name}><b>{name.replace(' szeptim', '').replace(' (7)', ' 7').replace(' (maj7)', 'maj7').replace(' (m7)', 'm7').replace(' (m7♭5)', 'm7♭5').replace(' (dim7)', 'dim7')}:</b> <span className="font-mono">{data.formula}</span></li>
                        ))}
                    </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-6 mb-2">Akkordok a Dúr Skálában</h4>
                     <TheoryTable headers={['Fok', 'Hármashangzat', 'Négyeshangzat', 'Funkció']} data={[
                        ['I', 'Dúr (I)', 'maj7', 'Tonika'],
                        ['II', 'Moll (ii)', 'm7', 'Szubdomináns'],
                        ['III', 'Moll (iii)', 'm7', 'Tonika/Domináns'],
                        ['IV', 'Dúr (IV)', 'maj7', 'Szubdomináns'],
                        ['V', 'Dúr (V)', '7', 'Domináns'],
                        ['VI', 'Moll (vi)', 'm7', 'Tonika/Szubdomináns'],
                        ['VII', 'Szűkített (vii°)', 'm7♭5', 'Domináns'],
                    ]} />
                </AccordionSection>

                <AccordionSection title="Hangnemek és Előjegyzések">
                    <p className="text-center mb-4">A kvintkör a zeneelmélet egyik legfontosabb vizuális eszköze, amely megmutatja a 12 hangnem közötti kapcsolatot.</p>
                    <CircleOfFifths />
                    <h4 className="font-bold text-lg text-teal-400 mt-6 mb-2">Dúr hangnemek</h4>
                    <p>A C-dúr hangnemnek nincs előjegyzése, ez a kiindulópont.</p>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="font-semibold text-center mb-2">Keresztes (♯) hangnemek</h5>
                            <TheoryTable headers={['Hangnem', 'Előjegyzés']} data={[
                                ['G-dúr', '1♯ (F♯)'], ['D-dúr', '2♯ (F♯, C♯)'], ['A-dúr', '3♯ (F♯, C♯, G♯)'], ['E-dúr', '4♯ (F♯, C♯, G♯, D♯)'], ['H-dúr', '5♯ (F♯, C♯, G♯, D♯, A♯)'], ['F♯-dúr', '6♯ (F♯, C♯, G♯, D♯, A♯, E♯)'], ['C♯-dúr', '7♯ (F♯, C♯, G♯, D♯, A♯, E♯, H♯)'],
                            ]} />
                        </div>
                        <div>
                             <h5 className="font-semibold text-center mb-2">Bés (♭) hangnemek</h5>
                             <TheoryTable headers={['Hangnem', 'Előjegyzés']} data={[
                                ['F-dúr', '1♭ (B)'], ['B-dúr', '2♭ (B, E♭)'], ['Esz-dúr', '3♭ (B, E♭, A♭)'], ['Asz-dúr', '4♭ (B, E♭, A♭, D♭)'], ['Desz-dúr', '5♭ (B, E♭, A♭, D♭, G♭)'], ['Gesz-dúr', '6♭ (B, E♭, A♭, D♭, G♭, C♭)'], ['Cesz-dúr', '7♭ (B, E♭, A♭, D♭, G♭, C♭, F♭)'],
                            ]} />
                        </div>
                    </div>
                     <h4 className="font-bold text-lg text-teal-400 mt-6 mb-2">Moll hangnemek</h4>
                     <p>Az a-moll hangnemnek nincs előjegyzése, ez a C-dúr párhuzamos mollja.</p>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="font-semibold text-center mb-2">Keresztes (♯) hangnemek</h5>
                            <TheoryTable headers={['Hangnem', 'Előjegyzés']} data={[
                               ['e-moll', '1♯'], ['h-moll', '2♯'], ['f♯-moll', '3♯'], ['c♯-moll', '4♯'], ['g♯-moll', '5♯'], ['d♯-moll', '6♯'], ['a♯-moll', '7♯'],
                            ]} />
                        </div>
                        <div>
                             <h5 className="font-semibold text-center mb-2">Bés (♭) hangnemek</h5>
                             <TheoryTable headers={['Hangnem', 'Előjegyzés']} data={[
                               ['d-moll', '1♭'], ['g-moll', '2♭'], ['c-moll', '3♭'], ['f-moll', '4♭'], ['b-moll', '5♭'], ['esz-moll', '6♭'], ['asz-moll', '7♭'],
                            ]} />
                        </div>
                    </div>
                </AccordionSection>
                
                <AccordionSection title="Skálák Típusai">
                    <p>A skála egy hangnem sorba rendezett hangkészlete, amelynek alapja a tonika.</p>
                    <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Dúr és Moll Skálák</h4>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Dúr hangsor:</strong> Két egész, egy fél, három egész, egy félhang lépésből épül fel. Két, négy hangból álló csoportra (tetrachord) bontható.</li>
                        <li><strong>Moll hangsorok:</strong> A dúrhoz képest a 3., 6. és 7. fokok eltérhetnek.
                            <ul className="list-decimal list-inside ml-6 mt-1">
                                <li><strong>Természetes (Eol):</strong> Eredeti moll forma, a dúr 6. fokáról.</li>
                                <li><strong>Összhangzatos (Harmonikus):</strong> A hetedik fok meg van emelve, ami a domináns akkordhoz vezet.</li>
                                <li><strong>Dallamos (Melodikus):</strong> Felfelé a 6. és 7. fok is emelt, lefelé a természetes moll formát használja.</li>
                            </ul>
                        </li>
                    </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Modális Skálák</h4>
                     <p>A dúr skála fokairól indított skálák, melyek mindegyike egyedi hangulattal rendelkezik. Gyakoriak a jazzben és filmzenében.</p>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setIsSortedByBrightness(prev => !prev)}
                            className={`border rounded-lg px-4 py-2 text-white focus:ring-teal-500 focus:border-teal-500 transition text-sm font-semibold ${isSortedByBrightness ? 'bg-teal-600 border-teal-500' : 'bg-gray-700 border-gray-600'}`}
                        >
                            <i className={`fa-regular ${isSortedByBrightness ? 'fa-check-square' : 'fa-square'} mr-2`}></i>
                             Rendezés világosságtól sötétig
                        </button>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(groupedScales).map(([category, scalesInCategory]) => (
                            <AccordionSection key={category} title={category}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-800/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Név</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Formula</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Négyeshangzat</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Hangok (C)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {scalesInCategory.map(scale => (
                                                <tr key={scale.name} className="hover:bg-slate-700/30 bg-slate-800/50">
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap align-middle font-semibold text-gray-200">{scale.name}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap align-middle font-mono tracking-wider text-teal-300">{scale.degreeFormula}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap align-middle">
                                                         <div>
                                                            <span className="font-semibold">{getSeventhChordForScale(scale.intervals)}</span>
                                                            <span className="block font-mono text-xs text-gray-400 mt-1">{getChordFormulaFromScale(scale.degreeFormula)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap align-middle font-mono">{scale.notesFromC || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </AccordionSection>
                        ))}
                    </div>
                </AccordionSection>
                
                <AccordionSection title="Zenei Funkciók és Formák">
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Főhármashangzatok Funkciói</h4>
                     <p>A zene hangneme és akkordjai közötti összefüggést a funkciók írják le. A legfontosabb funkciók a dúr skála I., IV. és V. fokára épülő akkordok.</p>
                     <ul className="list-disc list-inside space-y-2 mt-2">
                         <li><strong>Tonika (T):</strong> Az I. fok. A hangnem központja, a nyugalom, a "hazaérkezés" érzetét kelti.</li>
                         <li><strong>Szubdomináns (S):</strong> A IV. fok. A tonika alatti kvint, az átmenet, az elindulás funkciója.</li>
                         <li><strong>Domináns (D):</strong> Az V. fok. A tonika feletti kvint, a feszültség teremtője, amely a tonika felé oldódik.</li>
                     </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Zenei Formai Elemek</h4>
                     <ul className="list-disc list-inside space-y-2 mt-2">
                         <li><strong>Motívum:</strong> A legkisebb, önálló értelmű zenei gondolat.</li>
                         <li><strong>Szekvencia (Menet):</strong> Egy motívum vagy akkordmenet folyamatos ismétlése, de eltérő magasságban.</li>
                         <li><strong>Kánon:</strong> Többszólamú darab, ahol a szólamok ugyanazt a dallamot utánozzák, de eltérő időben lépnek be.</li>
                         <li><strong>Zenei mondat felépítése:</strong> Két <strong>motívum</strong> alkot egy <strong>félmondatot</strong>. Két félmondat alkot egy <strong>mondatot</strong>, amely a zenei <strong>periódus</strong> alapját képezi.</li>
                     </ul>
                     <h4 className="font-bold text-lg text-teal-400 mt-4 mb-2">Gyakori Előadási Jelek és Kifejezések</h4>
                     <TheoryTable headers={['Kifejezés', 'Rövidítés/Jel', 'Jelentés']} data={[
                         ['Ritardando', 'rit.', 'Fokozatosan lassítva.'],
                         ['Accelerando', 'accel.', 'Fokozatosan gyorsítva.'],
                         ['Rubato', '-', 'Szabadon, a zene belső érzése szerint, kötött ritmus nélkül előadva.'],
                         ['Da Capo', 'D.C.', 'Újra elölről kell kezdeni a darabot.'],
                         ['Dal Segno', 'D.S. / ℬ', 'Vissza a Segno (ℬ) jelhez.'],
                         ['Ismétlőjel (Ritornell)', '‖: ... :‖', 'A jelek által közrefogott részt meg kell ismételni.'],
                     ]}/>
                </AccordionSection>
            </div>
        </Card>
    );
};

export default TheoryGuide;
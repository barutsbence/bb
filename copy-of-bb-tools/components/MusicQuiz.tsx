import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuizQuestion } from '../services/geminiService';
import type { QuizQuestion } from '../types';
import Spinner from './Spinner';
import Card from './Card';
import { CHORDS as GLOBAL_CHORDS } from '../constants';
import { getNoteNames } from '../services/notationService';

// --- Trainer Types & Constants (merged from TheoryTrainer) ---
type ExerciseType = 'intervals' | 'chords' | 'keySignatures';
type TrainerQuestion = {
    prompt: string;
    options: string[];
    correctAnswer: string;
};

const noteToMidi: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'B': 10, 'H': 11
};

const intervals: Record<string, number> = {
    'Kis Szekund': 1, 'Nagy Szekund': 2, 'Kis Terc': 3, 'Nagy Terc': 4, 'Tiszta Kvárt': 5, 'Bővített Kvárt': 6,
    'Tiszta Kvint': 7, 'Kis Szext': 8, 'Nagy Szext': 9, 'Kis Szeptim': 10, 'Nagy Szeptim': 11
};

const keySignatures: Record<string, string> = {
    'C-dúr / a-moll': 'Nincs előjegyzés',
    'G-dúr / e-moll': '1♯ (F♯)', 'D-dúr / h-moll': '2♯ (F♯, C♯)', 'A-dúr / f♯-moll': '3♯ (F♯, C♯, G♯)',
    'E-dúr / c♯-moll': '4♯ (F♯, C♯, G♯, D♯)', 'H-dúr / g♯-moll': '5♯ (F♯, C♯, G♯, D♯, A♯)',
    'F-dúr / d-moll': '1♭ (B)', 'B-dúr / g-moll': '2♭ (B, E♭)', 'Esz-dúr / c-moll': '3♭ (B, E♭, A♭)',
    'Asz-dúr / f-moll': '4♭ (B, E♭, A♭, D♭)', 'Desz-dúr / b-moll': '5♭ (B, E♭, A♭, D♭, G♭)',
};

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.slice().sort(() => Math.random() - 0.5);
};
// --- End of Trainer Section ---


const theorySnippets = [
    { keywords: ['párhuzamos moll', 'relatív moll'], text: 'Tudtad? Minden dúr skálának van egy párhuzamos (relatív) mollja, ami a 6. fokáról kezdődik és ugyanazokat a hangokat használja. Pl. C-dúr -> a-moll.' },
    { keywords: ['hangköz', 'terc', 'kvint', 'szekund', 'kvárt', 'szext', 'szeptim'], text: 'Ismétlés: A hangköz két hang távolsága. A C és E közötti távolság például egy nagy terc (4 félhang).' },
    { keywords: ['skála fokai', 'skála hármashangzatai', 'dúr skála'], text: 'A dúr skála fokaira épített akkordok sorrendje: Dúr, moll, moll, Dúr, Dúr, moll, szűkített.' },
    { keywords: ['kvintkör', 'előjegyzés'], text: 'A kvintkör segít eligazodni a hangnemek között. Az óramutató járásával megegyező irányban haladva a hangnemek kvintenként emelkednek (pl. C -> G -> D).' },
    { keywords: ['magyar hangnevek', ' H', ' B'], text: 'Magyar sajátosság: A \'H\' hang a nemzetközi \'B\'-nek, míg a \'B\' hang a nemzetközi \'B♭\'-nek felel meg.' },
    { keywords: ['szeptimakkord', 'négyeshangzat', 'domináns'], text: 'A domináns szeptimakkord (pl. G7) egy dúr hármasból és egy kis szeptim hangközből áll (formula: 1-3-5-b7). Erős oldásigénye van a tonika felé.' },
    { keywords: ['bővített', '#5'], text: 'A bővített hármashangzat (pl. C+) egy dúr tercre és egy bővített kvintre épül (formula: 1-3-#5). Lebegő, feszült hangzása van.'},
    { keywords: ['szűkített', 'b5'], text: 'A szűkített hármashangzat (pl. C°) két kis tercből áll (formula: 1-b3-b5). Nagyon disszonáns, feszült karakterű.'},
    { keywords: ['hang', 'zörej', 'frekvencia'], text: 'Alapfogalom: A zenei hang egy szabályos, periodikus rezgés, míg a zörej egy szabálytalan, matematikailag leírhatatlan rezgés.' },
    { keywords: ['kulcs', 'violinkulcs', 'basszuskulcs'], text: 'A violinkulcs (G-kulcs) az egyvonalas G hangot rögzíti a 2. vonalon, míg a basszuskulcs (F-kulcs) a kis F hangot a 4. vonalon.' },
    { keywords: ['alteráció', 'kereszt', 'bé', 'feloldójel'], text: 'Az alterációs jelek módosítják a hangokat. A \'kereszt\' (♯) fél hanggal emel, a \'bé\' (♭) fél hanggal leszállít, a feloldójel (♮) pedig megszünteti a módosítást az ütemen belül.' },
    { keywords: ['metrum', 'ütemmutató'], text: 'Az ütemmutató (pl. 4/4) felső száma (számláló) az ütemen belüli leütések számát, az alsó (nevező) a metrikus alapegységet (pl. negyed) jelöli.' },
    { keywords: ['szinkópa'], text: 'A szinkópa egy jellegzetes ritmikai elem, amely a hangsúlyt egy gyenge ütemrészre tolja el, ezzel feszültséget és ritmikai változatosságot teremtve.' },
    { keywords: ['nyújtott ritmus', 'pontozott'], text: 'A hangjegy utáni pont az eredeti értékét a felével hosszabbítja meg. Egy pontozott negyed hangjegy értéke 1 + 1/2 = 1.5 ütés.' },
    { keywords: ['dinamika', 'tempó', 'piano', 'forte', 'allegro'], text: 'A dinamikai jelek (pl. piano, forte) a hangerőt, a tempójelzések (pl. Allegro, Adagio) a zene sebességét határozzák meg.' },
    { keywords: ['dór', 'mixolíd', 'líd', 'fríg', 'modális'], text: 'A dór skála egy természetes moll skála, de emelt hatodik fokkal, ami egyedi, jazzes hangzást ad neki.' },
    { keywords: ['tonika', 'domináns', 'szubdomináns', 'funkció'], text: 'A zenei funkciók a harmónia mozgatórugói: a Tonika (nyugvópont), a Domináns (feszültség) és a Szubdomináns (átvezetés).' },
    { keywords: ['motívum', 'periódus', 'mondat', 'forma'], text: 'A motívum a legkisebb zenei gondolat. Több motívumból épül fel a zenei mondat, majd a periódus, ami a zenei forma alapja.' },
    { keywords: ['oktáv', 'subkontra', 'egyvonalas'], text: 'Tudtad? A zongora billentyűzetét oktávokra osztjuk, a legmélyebbtől (Subkontra) a legmagasabbig (Ötvonalas).' },
    { keywords: ['enharmónia', 'temperált'], text: 'Az enharmónia miatt a temperált hangrendszerben pl. az F♯ és a G♭ ugyanazt a hangot jelöli a zongorán.' },
    { keywords: ['duola', 'triola'], text: 'A duola a triola ritmikai \'ellentéte\': két hangot játszunk három ideje alatt, jellemzően páratlan ütemmutatókban.' },
    { keywords: ['da capo', 'dal segno', 'D.C.', 'D.S.'], text: 'A D.C. (Da Capo) jelzés a darab elejére, a D.S. (Dal Segno) pedig a ℬ jelhez való visszatérésre utasít.' },
    { keywords: ['rubato'], text: 'A \'Rubato\' előadási mód szabad, kötött tempó nélküli játékot jelent, a zene belső lüktetését követve.' },
    { keywords: ['ismétlőjel', 'ritornell'], text: 'Az ismétlőjel (ritornell) által közrefogott részt meg kell ismételni. Az első ismétléskor az 1. záróhangot, másodjára a 2. záróhangot játsszuk.' },
    { keywords: ['hangszín', 'felhang'], text: 'A hangszínt az alaphanggal együtt zengő felhangok aránya határozza meg. Ezért szólnak másképp a különböző hangszerek, még ha ugyanazt a hangot is játsszák.' },
    { keywords: ['alla breve'], text: 'Az Alla Breve (𝄴) jelzés a 4/4-es ütem gyorsabb, "kettőt számolós" lüktetését jelöli, ahol a metrikus egység a félhang.' },
    { keywords: ['tetrachord', 'dúr skála'], text: 'A dúr skála két, négy hangból álló csoportra, ún. tetrachordra bontható, melyek szerkezete: egész-egész-fél hanglépés.' },
    { keywords: ['líd', 'modális'], text: 'A líd skála egy dúr skála emelt negyedik fokkal, ami egy álomszerű, lebegő hangzást ad neki. Gyakori a filmzenékben.' },
    { keywords: ['major 7', 'maj7'], text: 'A Major 7 (maj7) akkord egy dúr hármashangzatból és egy nagy szeptim hangközből áll. Lágy, gyakran nosztalgikus vagy jazzes hangzása van.' },
    { keywords: ['tonika', 'I. fok'], text: 'Tudtad? A Tonika (I. fok) a hangnem "otthona", a zenei mondatok ide térnek vissza a megnyugvásért. C-dúrban ez a C-dúr akkord.' },
    { keywords: ['domináns', 'V. fok'], text: 'A Domináns (V. fok) a legnagyobb feszültséget hordozó akkord, ami a tonika felé oldódik. C-dúrban ez a G-dúr (vagy G7) akkord.' },
    { keywords: ['szubdomináns', 'IV. fok'], text: 'A Szubdomináns (IV. fok) gyakran egy "kirándulás" a tonikából, mielőtt a domináns feszültségéhez érnénk. C-dúrban ez az F-dúr akkord.' },
    { keywords: ['enharmónia', 'temperált'], text: 'A temperált hangrendszerben az oktávot 12 egyenlő félhangra osztjuk. Ez teszi lehetővé az enharmóniát, de a hangközök (pl. tercek) enyhén "hamisak" a tiszta hangoláshoz képest.' },
];

const TimerBar = ({ timeLeft }: { timeLeft: number }) => {
    const percentage = Math.max(0, (timeLeft / 31) * 100);
    return (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-700/50" style={{ zIndex: 5 }}>
            <div 
                className="h-full bg-teal-400 transition-all duration-1000 linear"
                style={{ 
                    width: `${percentage}%`,
                    boxShadow: '0 2px 8px rgba(50, 215, 185, 0.5)'
                }}
            ></div>
        </div>
    );
};

const MusicQuiz: React.FC = () => {
    const [quizMode, setQuizMode] = useState<'ai' | 'trainer'>('ai');
    const [useSharpNotation, setUseSharpNotation] = useState(true);
    const [useHungarianNotation, setUseHungarianNotation] = useState(true);
    
    // --- Timer State ---
    const [timeLeft, setTimeLeft] = useState(31);
    const timerIntervalRef = useRef<number | null>(null);

    // --- AI Quiz State ---
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [questionHistory, setQuestionHistory] = useState<Array<{ questionText: string; timestamp: number }>>([]);
    const [infoSnippet, setInfoSnippet] = useState<string | null>(null);

    // --- Trainer State ---
    const [exerciseType, setExerciseType] = useState<ExerciseType>('intervals');
    const [trainerQuestion, setTrainerQuestion] = useState<TrainerQuestion | null>(null);
    const [trainerSelectedAnswer, setTrainerSelectedAnswer] = useState<string | null>(null);
    const [isTrainerCorrect, setIsTrainerCorrect] = useState<boolean | null>(null);
    const [jokerUsed, setJokerUsed] = useState(false);

    // --- Core Logic ---
    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);

    const findSnippet = useCallback((q: QuizQuestion): string | null => {
        const searchText = `${q.question.toLowerCase()} ${q.correctAnswer.toLowerCase()}`;
        const snippet = theorySnippets.find(s => 
            s.keywords.some(k => searchText.includes(k.toLowerCase()))
        );
        return snippet ? snippet.text : null;
    }, []);

    const handleTimeout = useCallback(() => {
        stopTimer();
        if (quizMode === 'ai') {
            if (!question || selectedAnswer) return;
            setSelectedAnswer('_TIMEOUT_');
            setIsCorrect(false);
            setQuestionsAnswered(prev => prev + 1);
            setInfoSnippet(findSnippet(question));
        } else {
            if (!trainerQuestion || trainerSelectedAnswer) return;
            setTrainerSelectedAnswer('_TIMEOUT_');
            setIsTrainerCorrect(false);
        }
    }, [quizMode, question, selectedAnswer, trainerQuestion, trainerSelectedAnswer, stopTimer, findSnippet]);

    useEffect(() => {
        const questionIsLoaded = (quizMode === 'ai' && question) || (quizMode === 'trainer' && trainerQuestion);
        const questionIsAnswered = (quizMode === 'ai' && selectedAnswer !== null) || (quizMode === 'trainer' && trainerSelectedAnswer !== null);

        if (questionIsLoaded && !questionIsAnswered) {
            setTimeLeft(31);
            timerIntervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            stopTimer();
        }

        return () => stopTimer();
    }, [question, trainerQuestion, selectedAnswer, trainerSelectedAnswer, quizMode, handleTimeout, stopTimer]);


    // --- AI Quiz Logic ---
    const fetchQuestion = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setInfoSnippet(null);

        const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
        const now = Date.now();
        const recentHistory = questionHistory.filter(item => now - item.timestamp < FIVE_MINUTES_IN_MS);
        setQuestionHistory(recentHistory);

        let newQuestion: QuizQuestion | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        while (attempts < MAX_ATTEMPTS) {
            try {
                const candidateQuestion = await generateQuizQuestion();
                const isRecent = recentHistory.some(item => item.questionText === candidateQuestion.question);
                if (!isRecent) {
                    newQuestion = candidateQuestion;
                    break;
                }
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Hiba történt a kérdés lekérésekor.');
                 setIsLoading(false);
                 return;
            }
            attempts++;
        }
        
        if (!newQuestion) {
            try {
                newQuestion = await generateQuizQuestion();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Hiba történt a kérdés lekérésekor.');
                setIsLoading(false);
                return;
            }
        }
        
        setQuestion(newQuestion);
        setQuestionHistory(prev => [...prev, { questionText: newQuestion!.question, timestamp: Date.now() }]);
        setIsLoading(false);

    }, [questionHistory]);

    useEffect(() => {
        if (quizMode === 'ai' && !question) {
            fetchQuestion();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizMode, question]);

    const handleAnswer = (answer: string) => {
        if (selectedAnswer || !question) return;
        stopTimer();
        setSelectedAnswer(answer);
        setQuestionsAnswered(prev => prev + 1);
        if (answer === question.correctAnswer) {
          setIsCorrect(true);
          setScore(prev => prev + 1);
        } else {
          setIsCorrect(false);
        }
        setInfoSnippet(findSnippet(question));
    };
  
    // --- Trainer Logic ---
    const generateTrainerQuestion = useCallback(() => {
        setTrainerQuestion(null); // Show spinner briefly
        const noteNames = getNoteNames(useSharpNotation, useHungarianNotation);
        setTimeout(() => {
            let newQuestion: TrainerQuestion;
            if (exerciseType === 'intervals') {
                const rootNote = noteNames[Math.floor(Math.random() * noteNames.length)];
                const intervalName = Object.keys(intervals)[Math.floor(Math.random() * Object.keys(intervals).length)];
                const intervalSemitones = intervals[intervalName];
                
                const rootMidi = noteToMidi[rootNote];
                const correctMidi = (rootMidi + intervalSemitones) % 12;
                const correctAnswer = noteNames[correctMidi];
                
                const options = new Set<string>([correctAnswer]);
                while (options.size < 4) {
                    options.add(noteNames[Math.floor(Math.random() * noteNames.length)]);
                }
                
                newQuestion = {
                    prompt: `Mi a ${rootNote} hangtól számított ${intervalName.toLowerCase()}?`,
                    options: shuffleArray(Array.from(options)),
                    correctAnswer,
                };
            } else if (exerciseType === 'chords') {
                const rootNote = noteNames[Math.floor(Math.random() * noteNames.length)];
                const chordName = Object.keys(GLOBAL_CHORDS)[Math.floor(Math.random() * Object.keys(GLOBAL_CHORDS).length)];
                
                const chordData = GLOBAL_CHORDS[chordName as keyof typeof GLOBAL_CHORDS];
                
                const rootMidi = noteToMidi[rootNote];
                const correctNotes = chordData.intervals.map(i => noteNames[(rootMidi + i) % 12]);
                const correctAnswer = correctNotes.join(' - ');
                
                const options = new Set<string>([correctAnswer]);
                while (options.size < 4) {
                    const randomRoot = noteNames[Math.floor(Math.random() * noteNames.length)];
                    const randomChordName = Object.keys(GLOBAL_CHORDS)[Math.floor(Math.random() * Object.keys(GLOBAL_CHORDS).length)];
                    const randomChordData = GLOBAL_CHORDS[randomChordName as keyof typeof GLOBAL_CHORDS];
                    const notes = randomChordData.intervals.map(i => noteNames[(noteToMidi[randomRoot] + i) % 12]);
                    options.add(notes.join(' - '));
                }
                
                newQuestion = {
                    prompt: `Mely hangok alkotják a(z) ${rootNote} ${chordName.toLowerCase().replace(/\s*\(.*\)\s*/, '')} akkordot?`,
                    options: shuffleArray(Array.from(options)),
                    correctAnswer,
                };
            } else { // keySignatures
                const keyName = Object.keys(keySignatures)[Math.floor(Math.random() * Object.keys(keySignatures).length)];
                const correctAnswer = keySignatures[keyName];

                const options = new Set<string>([correctAnswer]);
                const allSignatures = Object.values(keySignatures);
                while (options.size < 4) {
                    options.add(allSignatures[Math.floor(Math.random() * allSignatures.length)]);
                }

                newQuestion = {
                    prompt: `Mi a(z) ${keyName} hangnem előjegyzése?`,
                    options: shuffleArray(Array.from(options)),
                    correctAnswer,
                };
            }
            setTrainerQuestion(newQuestion);
            setTrainerSelectedAnswer(null);
            setIsTrainerCorrect(null);
            setJokerUsed(false);
        }, 150);
    }, [exerciseType, useSharpNotation, useHungarianNotation]);

    useEffect(() => {
        if (quizMode === 'trainer') {
            generateTrainerQuestion();
        }
    }, [quizMode, exerciseType, generateTrainerQuestion]);

    const handleTrainerAnswer = (answer: string) => {
        if (trainerSelectedAnswer || !trainerQuestion) return;
        stopTimer();
        setTrainerSelectedAnswer(answer);
        setIsTrainerCorrect(answer === trainerQuestion.correctAnswer);
    };

    const handleJokerClick = useCallback(() => {
        if (!trainerQuestion || trainerSelectedAnswer !== null) return;
        stopTimer();
        setTrainerSelectedAnswer(trainerQuestion.correctAnswer);
        setIsTrainerCorrect(true);
        setJokerUsed(true);
    }, [trainerQuestion, trainerSelectedAnswer, stopTimer]);
  
    // --- RENDER LOGIC ---
    const getButtonClass = (option: string, correctAnswer: string, selected: string | null) => {
        if (!selected) return 'bg-gray-700 hover:bg-gray-600';
        if (option === correctAnswer) return 'bg-green-600';
        if (option === selected && option !== correctAnswer) return 'bg-red-600';
        return 'bg-gray-700 opacity-50';
    };
  
    const renderAiQuiz = () => {
        if (isLoading) return <div className="flex justify-center items-center min-h-[450px]"><Spinner /></div>;
        if (error) return <div className="flex justify-center items-center min-h-[450px]"><p className="text-center text-red-400">{error}</p></div>;
        if (!question) return <div className="flex justify-center items-center min-h-[450px]"><p className="text-center text-gray-400">Nincs elérhető kérdés.</p></div>;

        const isAnswered = selectedAnswer !== null;

        return (
            <div className="flex flex-col justify-between min-h-[450px]">
                <div>
                    {!isAnswered && <TimerBar timeLeft={timeLeft} />}
                    <div className="p-1">
                        <div className="flex justify-between items-center my-4 text-lg">
                            <span className="font-bold text-teal-400">Pontszám: {score} / {questionsAnswered}</span>
                             <span className="font-mono text-gray-400 text-2xl">{isAnswered ? 'Paused' : `${timeLeft}s`}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-semibold mb-6 text-center text-gray-200">{question.question}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.options.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => handleAnswer(option)}
                                    disabled={isAnswered}
                                    className={`w-full p-4 rounded-lg text-white font-semibold transition-all duration-300 ${getButtonClass(option, question.correctAnswer, selectedAnswer)}`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {isAnswered && (
                    <div className="mt-6 text-center">
                        {selectedAnswer === '_TIMEOUT_' && <p className="text-xl font-bold text-yellow-400 mb-2">Lejárt az idő!</p>}
                        <p className={`text-xl font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isCorrect ? 'Helyes!' : 'Helytelen!'}
                        </p>
                        {!isCorrect && <p className="text-gray-300 mt-2">A helyes válasz: <span className="font-semibold text-green-400">{question.correctAnswer}</span></p>}
                        {infoSnippet && (
                            <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-gray-300">
                                <p><i className="fa-solid fa-circle-info text-teal-400 mr-2"></i>{infoSnippet}</p>
                            </div>
                        )}
                        <button onClick={fetchQuestion} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">Tovább</button>
                    </div>
                )}
            </div>
        );
    };

    const renderTrainer = () => {
        const exerciseTabs: { id: ExerciseType, name: string }[] = [
            { id: 'intervals', name: 'Hangközök' }, { id: 'chords', name: 'Akkordok' }, { id: 'keySignatures', name: 'Előjegyzések' },
        ];
        
        const notationControls = (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setUseHungarianNotation(prev => !prev)}
                    className="w-20 h-10 flex-shrink-0 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center gap-2 text-white hover:bg-gray-600 transition"
                    aria-label="Toggle Hungarian/English notation"
                    title="Hang elnevezés váltása (Magyar/Angol)"
                >
                    <i className="fa-solid fa-globe text-lg"></i>
                    <span className="font-semibold">{useHungarianNotation ? 'HUN' : 'ENG'}</span>
                </button>
                <button
                    onClick={() => setUseSharpNotation(prev => !prev)}
                    className="w-12 h-10 flex-shrink-0 bg-gray-700 border border-gray-600 rounded-lg font-mono text-xl text-white hover:bg-gray-600 transition"
                    aria-label="Toggle sharp/flat notes"
                    title="Hangnem jelölés váltása (♯/♭)"
                >
                    {useSharpNotation ? '♯' : '♭'}
                </button>
            </div>
        );

        const isAnswered = trainerSelectedAnswer !== null;

        return (
            <div className="flex flex-col justify-between min-h-[450px]">
                <div>
                    {!isAnswered && trainerQuestion && <TimerBar timeLeft={timeLeft} />}
                    <div className="flex justify-between items-center border-b border-gray-700 mb-2 pr-2">
                        <div>
                            {exerciseTabs.map(tab => (
                                <button key={tab.id} onClick={() => { setExerciseType(tab.id); }} className={`py-3 px-2 sm:px-4 text-center font-semibold transition-colors text-sm sm:text-base ${exerciseType === tab.id ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                        {notationControls}
                    </div>
                    {!trainerQuestion ? (
                        <div className="flex justify-center items-center min-h-[300px]"><Spinner /></div>
                    ) : (
                        <div className="p-1">
                             <div className="flex justify-end items-center my-4 h-8">
                                <span className="font-mono text-gray-400 text-2xl">{isAnswered ? 'Paused' : `${timeLeft}s`}</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-center text-gray-200">{trainerQuestion.prompt}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {trainerQuestion.options.map((option) => (
                                    <button
                                        key={option} onClick={() => handleTrainerAnswer(option)} disabled={isAnswered}
                                        className={`w-full p-4 rounded-lg text-white font-semibold transition-all duration-300 ${getButtonClass(option, trainerQuestion.correctAnswer, trainerSelectedAnswer)}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                             {!isAnswered && (
                                <div className="text-center mt-6">
                                    <button
                                        onClick={handleJokerClick}
                                        disabled={jokerUsed}
                                        className="px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-md hover:bg-yellow-600 transition disabled:bg-gray-600 disabled:opacity-50"
                                    >
                                        <i className="fa-solid fa-key mr-2"></i>Szabad a gazda
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {isAnswered && trainerQuestion && (
                    <div className="mt-6 text-center">
                        {trainerSelectedAnswer === '_TIMEOUT_' && <p className="text-xl font-bold text-yellow-400 mb-2">Lejárt az idő!</p>}
                        <p className={`text-xl font-bold ${isTrainerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isTrainerCorrect ? 'Helyes!' : 'Helytelen!'}
                        </p>
                        {!isTrainerCorrect && <p className="text-gray-300 mt-2">A helyes válasz: <span className="font-semibold text-green-400">{trainerQuestion.correctAnswer}</span></p>}
                        <button onClick={generateTrainerQuestion} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105">Tovább</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card title="Kvíz és Gyakorló" icon="fa-solid fa-question-circle">
            <div className="relative overflow-hidden">
                <div className="flex bg-gray-700 rounded-lg border border-gray-600 p-1 mb-6">
                    <button onClick={() => setQuizMode('ai')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${quizMode === 'ai' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>AI Kvíz</button>
                    <button onClick={() => setQuizMode('trainer')} className={`w-1/2 py-2 rounded-md text-sm font-semibold transition ${quizMode === 'trainer' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Gyakorló</button>
                </div>
                {quizMode === 'ai' ? renderAiQuiz() : renderTrainer()}
            </div>
        </Card>
    );
};

export default MusicQuiz;
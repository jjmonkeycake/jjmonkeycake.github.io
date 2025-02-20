import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Trophy, RotateCcw, Clock, Star, Settings, Volume2, VolumeX, HelpCircle, Heart, Award, Zap, Crown } from 'lucide-react';

type Card = {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
};

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Theme = 'emoji' | 'animals' | 'food' | 'space' | 'sports';

// Prevent duplicate emojis in themes
const themes = {
  emoji: ['🌟', '🎨', '🌈', '🎮', '🎵', '🎪', '🎭', '🎯', '🎲', '🎸', '🎩', '🎬', '🎡', '🎪', '🎨', '🎭'].slice(0, -2),
  animals: ['🐶', '🐱', '🐼', '🦊', '🦁', '🐯', '🐮', '🐷', '🐸', '🦄', '🦋', '🐢', '🦉', '🦒', '🐘', '🦩'],
  food: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍩', '🍪', '🍎', '🍇', '🍓', '🍉', '🥑', '🍜', '🍣', '🌮'],
  space: ['🚀', '🛸', '🌍', '🌙', '⭐', '☄️', '🌠', '🌌', '🪐', '👨‍🚀', '🛰️', '🌑', '🌞', '🌛', '🌜', '✨'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏊‍♂️', '🚴‍♂️', '⛷️', '🏂', '🏌️‍♂️', '🏄‍♂️']
};

const difficultySettings = {
  easy: { pairs: 6, time: 120, points: 100, lives: 5 },
  medium: { pairs: 8, time: 180, points: 150, lives: 4 },
  hard: { pairs: 12, time: 240, points: 200, lives: 3 },
  expert: { pairs: 16, time: 300, points: 300, lives: 2 }
};

const achievements = {
  speedster: { name: 'Speedster', description: 'Complete a game in under 60 seconds', icon: <Zap /> },
  perfectionist: { name: 'Perfectionist', description: 'Complete a game with no mistakes', icon: <Star /> },
  comboMaster: { name: 'Combo Master', description: 'Get a 5x combo', icon: <Award /> },
  expert: { name: 'Expert', description: 'Win on expert difficulty', icon: <Trophy /> },
  champion: { name: 'Champion', description: 'Get the highest score on any difficulty', icon: <Crown /> }
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timeLeft, setTimeLeft] = useState(difficultySettings.easy.time);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number | null>>(() => {
    const saved = localStorage.getItem('memoryGameBestScores');
    return saved ? JSON.parse(saved) : {
      easy: null,
      medium: null,
      hard: null,
      expert: null
    };
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [theme, setTheme] = useState<Theme>('emoji');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(difficultySettings.easy.lives);
  const [achievements, setAchievements] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('memoryGameAchievements');
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Fix memory leak with audio
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Initialize audio elements once
    audioRefs.current = {
      flip: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'),
      match: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV'),
      wrong: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YW'),
      win: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YX'),
      achievement: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YY')
    };
  }, []);

  // Save best scores to localStorage
  useEffect(() => {
    localStorage.setItem('memoryGameBestScores', JSON.stringify(bestScores));
  }, [bestScores]);

  // Save achievements to localStorage
  useEffect(() => {
    localStorage.setItem('memoryGameAchievements', JSON.stringify([...achievements]));
  }, [achievements]);

  const playSound = (type: 'flip' | 'match' | 'wrong' | 'win' | 'achievement') => {
    if (!soundEnabled || !audioRefs.current[type]) return;
    
    const audio = audioRefs.current[type];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const unlockAchievement = (achievement: string) => {
    if (!achievements.has(achievement)) {
      setAchievements(prev => new Set([...prev, achievement]));
      setShowAchievement(achievement);
      playSound('achievement');
      setTimeout(() => setShowAchievement(null), 3000);
    }
  };

  const calculateScore = (isMatch: boolean) => {
    if (isMatch) {
      const timeBonus = Math.floor(timeLeft / 10);
      const comboBonus = combo * 20; // Increased combo bonus
      const difficultyBonus = difficultySettings[difficulty].points;
      const livesBonus = lives * 50; // New bonus for remaining lives
      const newScore = difficultyBonus + timeBonus + comboBonus + livesBonus;
      setScore(prev => prev + newScore);
      
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      
      if (newCombo >= 5) {
        unlockAchievement('comboMaster');
      }
    } else {
      setCombo(0);
      setLives(prev => Math.max(0, prev - 1));
    }
  };

  const checkAchievements = () => {
    const gameTime = difficultySettings[difficulty].time - timeLeft;
    if (gameTime < 60) unlockAchievement('speedster');
    if (moves === matches * 2) unlockAchievement('perfectionist');
    if (difficulty === 'expert') unlockAchievement('expert');
    
    // Check if this is a new high score
    if (bestScores[difficulty] === null || score > bestScores[difficulty]!) {
      unlockAchievement('champion');
    }
  };

  const initializeGame = useCallback((newDifficulty: Difficulty = difficulty) => {
    const { pairs, lives: difficultyLives } = difficultySettings[newDifficulty];
    const gameEmojis = themes[theme].slice(0, pairs);
    const duplicatedEmojis = [...gameEmojis, ...gameEmojis];
    const shuffledEmojis = duplicatedEmojis
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
    
    const newCards = shuffledEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
    
    setCards(newCards);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsWon(false);
    setIsLost(false);
    setTimeLeft(difficultySettings[newDifficulty].time);
    setIsPlaying(true);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(difficultyLives);
    setIsPaused(false);
  }, [difficulty, theme]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    let timer: number;
    if (isPlaying && !isWon && !isLost && timeLeft > 0 && !isPaused) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsLost(true);
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isWon, isLost, timeLeft, isPaused]);

  useEffect(() => {
    if (lives === 0) {
      setIsLost(true);
      setIsPlaying(false);
    }
  }, [lives]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPaused(prev => !prev);
      } else if (e.code === 'KeyR') {
        initializeGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [initializeGame]);

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || cards[id].isMatched || cards[id].isFlipped || !isPlaying || isPaused) return;

    playSound('flip');

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlippedCards = [...flippedCards, id];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      const [firstId, secondId] = newFlippedCards;
      
      if (cards[firstId].emoji === cards[secondId].emoji) {
        playSound('match');
        calculateScore(true);
        newCards[firstId].isMatched = true;
        newCards[secondId].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);
        setMatches(prev => {
          const newMatches = prev + 1;
          if (newMatches === difficultySettings[difficulty].pairs) {
            setIsWon(true);
            setIsPlaying(false);
            playSound('win');
            checkAchievements();
            const currentScore = score;
            setBestScores(prev => ({
              ...prev,
              [difficulty]: prev[difficulty] === null 
                ? currentScore 
                : Math.max(currentScore, prev[difficulty]!),
            }));
          }
          return newMatches;
        });
      } else {
        playSound('wrong');
        calculateScore(false);
        setTimeout(() => {
          newCards[firstId].isFlipped = false;
          newCards[secondId].isFlipped = false;
          setCards(newCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const getGridCols = () => {
    switch (difficulty) {
      case 'easy': return 'grid-cols-3';
      case 'medium': return 'grid-cols-4';
      case 'hard': return 'grid-cols-4';
      case 'expert': return 'grid-cols-4';
      default: return 'grid-cols-3';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="text-yellow-500" />
              Memory Game
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title={soundEnabled ? "Mute" : "Unmute"}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Help"
              >
                <HelpCircle size={20} />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <Settings size={20} />
                Settings
              </button>
              <button
                onClick={() => initializeGame()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                title="Reset Game"
              >
                <RotateCcw size={20} />
                Reset Game
              </button>
            </div>
          </div>

          {showHelp && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">How to Play</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Find matching pairs of cards by flipping them over</li>
                <li>Complete the game before time runs out</li>
                <li>Lives vary by difficulty - each mismatch costs 1 life</li>
                <li>Build combos by matching pairs consecutively</li>
                <li>Score points based on:
                  <ul className="list-disc list-inside ml-4">
                    <li>Time remaining bonus</li>
                    <li>Combo multiplier (20 points per combo level)</li>
                    <li>Difficulty bonus</li>
                    <li>Remaining lives bonus (50 points per life)</li>
                  </ul>
                </li>
                <li>Keyboard Controls:
                  <ul className="list-disc list-inside ml-4">
                    <li>Space: Pause/Resume game</li>
                    <li>R: Reset game</li>
                  </ul>
                </li>
                <li>Unlock achievements:
                  <ul className="list-disc list-inside ml-4">
                    <li>Speedster: Complete a game in under 60 seconds</li>
                    <li>Perfectionist: Complete a game with no mistakes</li>
                    <li>Combo Master: Get a 5x combo</li>
                    <li>Expert: Win on expert difficulty</li>
                    <li>Champion: Get the highest score on any difficulty</li>
                  </ul>
                </li>
              </ul>
            </div>
          )}

          {showSettings && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Difficulty</h3>
                  <div className="flex gap-4">
                    {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          setDifficulty(level);
                          initializeGame(level);
                        }}
                        className={`px-4 py-2 rounded-lg capitalize ${
                          difficulty === level
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Theme</h3>
                  <div className="flex gap-4 flex-wrap">
                    {(['emoji', 'animals', 'food', 'space', 'sports'] as Theme[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTheme(t);
                          initializeGame();
                        }}
                        className={`px-4 py-2 rounded-lg capitalize ${
                          theme === t
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="text-blue-500" />
              Time: {formatTime(timeLeft)}
            </div>
            <div className="text-lg font-semibold text-gray-700 flex items-center gap-2 justify-center">
              <div className="flex gap-1">
                {Array.from({ length: difficultySettings[difficulty].lives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-6 h-6 ${i < lives ? 'text-red-500' : 'text-gray-300'}`}
                    fill={i < lives ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
            <div className="text-lg font-semibold text-gray-700 flex items-center gap-2 justify-center">
              Score: {score}
              {combo > 1 && (
                <span className="text-sm bg-green-500 text-white px-2 py-1 rounded-full pulse">
                  {combo}x Combo!
                </span>
              )}
            </div>
            <div className="text-lg font-semibold text-gray-700 flex items-center gap-2 justify-end">
              <Star className="text-yellow-500" />
              Best: {bestScores[difficulty] || '-'}
            </div>
          </div>

          {showAchievement && (
            <div className="fixed top-4 right-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-lg animate-bounce">
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                <div>
                  <h3 className="font-bold text-yellow-800">Achievement Unlocked!</h3>
                  <p className="text-yellow-700">{showAchievement}</p>
                </div>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
                <p className="mb-4">Press Space to resume</p>
                <button
                  onClick={() => setIsPaused(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {isWon && (
            <div className="mb-8 p-4 bg-green-100 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-700">
                <Trophy />
                Congratulations! You've won!
              </div>
              <p className="text-green-600">
                Score: {score} | Moves: {moves} | Time: {formatTime(difficultySettings[difficulty].time - timeLeft)}
              </p>
              <p className="text-green-600 mt-2">
                Max Combo: {maxCombo}x | Lives Left: {lives}
              </p>
            </div>
          )}

          {isLost && (
            <div className="mb-8 p-4 bg-red-100 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-red-700">
                {lives === 0 ? 'Out of Lives!' : 'Time\'s Up!'}
              </div>
              <p className="text-red-600">Final Score: {score}</p>
              <p className="text-red-600 mt-2">
                Matches: {matches}/{difficultySettings[difficulty].pairs} | Max Combo: {maxCombo}x
              </p>
            </div>
          )}

          <div className={`grid ${getGridCols()} gap-4`}>
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`aspect-square text-4xl rounded-xl transition-all duration-300 transform card-hover ${
                  card.isFlipped || card.isMatched
                    ? 'bg-white border-2 border-indigo-500 rotate-0 card-flip'
                    : 'bg-indigo-600 rotate-y-180'
                } ${
                  card.isMatched ? 'border-green-500 bg-green-50 card-matched' : ''
                } hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  flippedCards.length === 2 && !card.isMatched ? 'shake' : ''
                }`}
                disabled={card.isMatched || !isPlaying || isPaused}
              >
                {(card.isFlipped || card.isMatched) && card.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
import { GAMES } from '../../data/games';
import { GameCard } from '../../components/GameCard';

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">Juegos</h1>
      <div className="mt-4 flex flex-col gap-3">
        {GAMES.map((game) => (
          <GameCard key={game.id} {...game} />
        ))}
      </div>
    </div>
  );
}

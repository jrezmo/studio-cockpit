import { Badge } from "@/shared/ui/badge";

type DrillCard = {
  id: string;
  title: string;
  description: string;
  meta: string;
  icon: React.ElementType;
};

type ClientDrillCardsProps = {
  cards: DrillCard[];
  onSelect: (id: string) => void;
};

export function ClientDrillCards({ cards, onSelect }: ClientDrillCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">{card.title}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {card.meta}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

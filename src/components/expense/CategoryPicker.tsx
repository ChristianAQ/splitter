import { DEFAULT_CATEGORY_LIST } from "../../lib/categories";

interface Props {
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Categoría">
      {DEFAULT_CATEGORY_LIST.map((cat) => {
        const selected = cat.id === value;
        return (
          <button
            key={cat.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(cat.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-medium transition-colors ${
              selected
                ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

// client/src/ui/kanban/BoardToolbar.tsx
import TagFilter from "./TagFilter";
import type { BoardFilters } from "../../hooks/useBoardFilters";

type Props = {
	projectId: string;
	filters: BoardFilters;
	onFiltersChange: (patch: Partial<BoardFilters>) => void;
};

export default function BoardToolbar({
	projectId,
	filters,
	onFiltersChange,
}: Props) {
	return (
		<div className='flex w-full flex-col gap-4 p-4'>
			<TagFilter
				projectId={projectId}
				value={{
					tagIds: filters.tagIds ?? [],
					tagMode: filters.tagMode ?? "or",
				}}
				onChange={onFiltersChange}
			/>
			{/* здесь можно добавлять другие “узкие” фильтры без дублирования FilterBar */}
		</div>
	);
}

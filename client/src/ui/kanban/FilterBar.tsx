// client/src/ui/kanban/FilterBar.tsx
import { IconButton } from "../primitives";
import Icon from "../icons/Icon";
import StickerFilterBtn from "./StickerFilterBtn";
import type { BoardFilters } from "../../hooks/useBoardFilters";
import type { UUID } from "../../api";

type Props = {
	projectId: UUID;
	filters: BoardFilters;
	onFiltersChange: (patch: Partial<BoardFilters>) => void;
	onOpenSettings: () => void;
	onAddSticker: () => void;
};

export default function FilterBar({
	projectId,
	filters,
	onFiltersChange,
	onOpenSettings,
	onAddSticker,
}: Props) {
	return (
		<div className='px-4 py-3'>
			<div className='flex items-center gap-2 rounded-2xl bg-white px-2 py-1 shadow-sm ring-1 ring-border'>
				<IconButton
					aria-label='Настройки доски'
					title='Настройки доски'
					onClick={onOpenSettings}>
					<Icon name='settings' className='icon' />
				</IconButton>

				<StickerFilterBtn
					projectId={projectId}
					label='Стикеры'
					selected={filters.tagIds ?? []}
					mode={filters.tagMode ?? "or"}
					onChange={(ids, mode) =>
						onFiltersChange({ tagIds: ids, tagMode: mode })
					}
				/>

				<div className='ml-auto'>
					<IconButton
						aria-label='Добавить стикер'
						title='Добавить стикер'
						onClick={onAddSticker}>
						<Icon name='plus' className='icon' />
					</IconButton>
				</div>
			</div>
		</div>
	);
}

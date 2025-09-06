// client/src/ui/kanban/BoardHeader.tsx
import { memo } from "react";
import Icon from "../icons/Icon";
import FiltersBar from "./FilterBar";
import ToolbarSection from "./ToolbarSection";
import type { BoardFilters } from "../../hooks/useBoardFilters";

type Tab = "board" | "gantt" | "calendar";

export type BoardHeaderProps = {
	active: Tab;
	onTab: (t: Tab) => void;
	filters: BoardFilters;
	onFiltersChange: (patch: Partial<BoardFilters>) => void;
	projectId: string;
	onOpenSettings?: () => void;
	onAddSticker?: () => void;
};

export default function BoardHeader({
	active,
	onTab,
	filters,
	onFiltersChange,
	projectId,
	onOpenSettings, // 👈
	onAddSticker, // 👈
}: {
	active: "board" | "gantt" | "calendar";
	onTab: (t: "board" | "gantt" | "calendar") => void;
	filters: BoardFilters;
	onFiltersChange: (patch: Partial<BoardFilters>) => void;
	projectId: string;
	onOpenSettings?: () => void; // 👈
	onAddSticker?: () => void; // 👈
}) {
	return (
		<div className='border-b border-slate-200 bg-slate-100'>
			<div className='flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3'>
				<ToolbarSection className='mr-2' aria-label='Просмотр'>
					<TabChip
						active={active === "board"}
						onClick={() => onTab("board")}
						icon={<Icon name='kanban' size={16} />}
						label='Доска'
					/>
					<TabChip
						active={active === "gantt"}
						onClick={() => onTab("gantt")}
						icon={<Icon name='list' size={16} />}
						label='Гант'
					/>
					<TabChip
						active={active === "calendar"}
						onClick={() => onTab("calendar")}
						icon={<Icon name='calendar' size={16} />}
						label='Календарь'
					/>
				</ToolbarSection>

				<FiltersBar
					projectId={projectId}
					filters={filters}
					onFiltersChange={onFiltersChange}
					onOpenSettings={onOpenSettings ?? (() => {})}
					onAddSticker={onAddSticker ?? (() => {})}
				/>
			</div>
		</div>
	);
}

const TabChip = memo(function TabChip({
	active,
	onClick,
	icon,
	label,
}: {
	active: boolean;
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
}) {
	return (
		<button
			type='button'
			role='tab'
			aria-selected={active}
			onClick={onClick}
			className={`inline-flex items-center gap-2 rounded-lg px-2 py-0.5 text-sm ring-1 ${
				active
					? "bg-white text-slate-800 ring-slate-800"
					: "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
			}`}>
			{icon}
			{label}
		</button>
	);
});

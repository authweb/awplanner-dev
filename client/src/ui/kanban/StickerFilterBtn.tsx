import { useState } from "react";
import { cn } from "../cn";
import Icon from "../icons/Icon";
import TagFilterDropdown from "../filters/TagFilterDropdown";
import type { UUID } from "../../api";

type Props = {
	projectId: UUID;
	selected: UUID[];
	mode: "or" | "and";
	onChange: (ids: UUID[], mode: "or" | "and") => void;
	label?: string;
	onlyCategoryId?: UUID;
};

export default function StickerFilterBtn({
	projectId,
	selected,
	mode,
	onChange,
	label = "Стикеры",
	onlyCategoryId,
}: Props) {
	const [open, setOpen] = useState(false);
	const active = selected.length > 0;

	return (
		<div className='relative'>
			<button
				type='button'
				onClick={() => setOpen(true)}
				className={cn(
					"inline-flex items-center gap-2 rounded-lg px-2 py-0.5 text-sm transition ring-1",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
					active
						? "bg-brand-50 text-brand ring-brand"
						: "bg-white text-slate-800 ring-border hover:bg-slate-50",
				)}
				title={active ? `${label}: ${selected.length}` : label}>
				<Icon name='filter' size={14} aria-hidden className='opacity-70' />
				<span>{label}</span>

				{active && (
					<span className='ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1 text-xs text-brand ring-1 ring-brand'>
						{selected.length}
					</span>
				)}
			</button>

			<TagFilterDropdown
				projectId={projectId}
				open={open}
				onClose={() => setOpen(false)}
				selected={selected}
				mode={mode}
				onChange={(ids, m) => onChange(ids, m)}
				onlyCategoryId={onlyCategoryId}
			/>
		</div>
	);
}

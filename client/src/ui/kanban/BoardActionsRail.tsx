// client/src/ui/kanban/BoardActionsRail.tsx
import { Button } from "../primitives";
import Icon from "../icons/Icon";

type Handlers = {
	onAddColumn?: () => void;
	onCreateSummary?: () => void;
	onCreateMirror?: () => void;
};

export default function BoardActionsRail({
	onAddColumn,
	onCreateSummary,
	onCreateMirror,
}: Handlers) {
	return (
		<div className='flex flex-col gap-3'>
			<RailButton onClick={onAddColumn} aria-label='Добавить колонку'>
				<Icon name='plus' size={16} />
				<span>Добавить колонку</span>
			</RailButton>

			<RailButton onClick={onCreateSummary} aria-label='Создать сводку'>
				<Icon name='list' size={16} />
				<span>Создать сводку</span>
			</RailButton>

			<RailButton onClick={onCreateMirror} aria-label='Создать зеркало'>
				<Icon name='kanban' size={16} />
				<span>Создать зеркало</span>
			</RailButton>
		</div>
	);
}

function RailButton({
	children,
	onClick,
	...rest
}: {
	children: React.ReactNode;
	onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<Button
			variant='secondary'
			className='h-10 w-full justify-start gap-3 rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200 hover:bg-white'
			onClick={onClick}
			{...rest}>
			{children}
		</Button>
	);
}

import Icon from "../icons/Icon";
import { IconButton, Input } from "../primitives";

export default function Topbar() {
	return (
		<header className='sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4'>
			<div className='text-lg font-semibold'>Проект</div>
			<IconButton className='!p-0'>
				<Icon name='plus' size={16} />
			</IconButton>
			<div className='relative ml-4 w-[420px]'>
				<Icon
					name='search'
					className='pointer-events-none absolute left-3 top-2.5 text-neutral-400'
					size={16}
				/>
				<Input placeholder='Поиск по компании' className='pl-9' />
			</div>
			<div className='ml-auto flex items-center gap-2'>
				<IconButton className='!p-0'>
					<Icon name='notification' size={16} />
				</IconButton>
				<div className='size-8 rounded-full bg-neutral-200' />
			</div>
		</header>
	);
}

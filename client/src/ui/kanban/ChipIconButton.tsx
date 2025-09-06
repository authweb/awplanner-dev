import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type Props = {
	children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Круглая мини-кнопка в стиле «чипа» для иконок на панели фильтров */
export default function ChipIconButton({
	children,
	className,
	...rest
}: Props) {
	return (
		<button
			type='button'
			{...rest}
			className={cn(
				"inline-flex h-6 w-6 items-center justify-center rounded-lg",
				"bg-white text-slate-600 ring-1 ring-border",
				"hover:bg-slate-50 hover:text-slate-900",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
				className,
			)}>
			{children}
		</button>
	);
}

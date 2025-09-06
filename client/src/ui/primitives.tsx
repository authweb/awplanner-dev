import { useEffect, useRef, type ReactNode } from "react";
import type {
	ButtonHTMLAttributes,
	HTMLAttributes,
	InputHTMLAttributes,
} from "react";
import Icon from "./icons/Icon";
import { cn } from "./cn";

/** ───────── Button ───────── */

type ButtonVariant =
	| "primary" // брендовая CTA
	| "secondary" // карточная белая
	| "soft" // мягкий бренд (brand-50)
	| "ghost" // прозрачная
	| "outline" // обводка
	| "pill"; // капсула

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

// ...вверху файла
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
	open: boolean;
	onClose: () => void;
	title?: React.ReactNode;
	children?: React.ReactNode;
	size?: ModalSize; // 👈 добавили
	bodyClassName?: string; // 👈 опционально — подкрутить паддинги/сетки
}

export function Button({
	variant = "primary",
	size = "md",
	className,
	...props
}: ButtonProps) {
	const base =
		"inline-flex items-center gap-2 rounded-xl font-medium transition focus:outline-none focus-visible:ring-2";

	// завязка на токены из index.css
	const variants: Record<ButtonVariant, string> = {
		primary:
			"bg-brand text-on-brand hover:bg-brand-700 focus-visible:ring-brand",
		secondary:
			"bg-panel text-[var(--text)] border border-border hover:bg-white/70 focus-visible:ring-border",
		soft: "bg-brand-50 text-brand hover:bg-brand-50/90 focus-visible:ring-brand",
		ghost: "text-[var(--text)] hover:bg-black/5 focus-visible:ring-border",
		outline:
			"border border-border text-[var(--text)] bg-transparent hover:bg-black/5 focus-visible:ring-border",
		pill: "bg-black/5 hover:bg-black/10 rounded-full",
	};

	const sizes: Record<ButtonSize, string> = {
		sm: "h-8 px-2 text-sm",
		md: "h-9 px-3 text-sm",
		lg: "h-10 px-4",
	};

	return (
		<button
			className={cn(
				base,
				variants[variant],
				sizes[size],
				"ring-offset-0",
				className,
			)}
			{...props}
		/>
	);
}

/** ───────── IconButton ───────── */

export type IconButtonProps = ButtonProps;

export function IconButton({ className, ...props }: IconButtonProps) {
	return (
		<Button
			variant='secondary'
			size='sm'
			className={cn("p-2 h-8 w-8 justify-center", className)}
			{...props}
		/>
	);
}

/** ───────── Input ───────── */

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
	return (
		<input
			className={cn(
				// панельный фон + брендовый фокус, нейтральные плейсхолдеры
				"h-9 w-full rounded-xl border border-border bg-panel px-3 text-sm",
				"placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand",
				className,
			)}
			{...props}
		/>
	);
}

/** ───────── Badge ───────── */

export type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				// мягкий брендовый бейдж по умолчанию
				"inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand",
				className,
			)}
			{...props}
		/>
	);
}

/** ───────── CounterBubble ───────── */

export function CounterBubble({ children }: { children?: ReactNode }) {
	return (
		<span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1 text-xs text-brand'>
			{children}
		</span>
	);
}

/** ───────── Dropdown ───────── */

export interface DropdownProps {
	open: boolean;
	onClose: () => void;
	menuClass?: string;
	children?: ReactNode;
}

export function Dropdown({
	open,
	onClose,
	menuClass,
	children,
}: DropdownProps) {
	if (!open) return null;
	return (
		<div className='fixed inset-0 z-50' onClick={onClose}>
			<div className='absolute inset-0' />
			<div
				className={cn(
					// панель + аккуратная тень + брендовые границы
					"absolute z-50 mt-1 w-56 rounded-xl border border-border bg-panel p-1 shadow-lg",
					menuClass,
				)}
				onClick={e => e.stopPropagation()}>
				{children}
			</div>
		</div>
	);
}

/** ───────── Modal ───────── */

export function Modal({
	open,
	onClose,
	title,
	children,
	size = "md",
	bodyClassName,
}: ModalProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", esc);
		document.body.style.overflow = open ? "hidden" : "";
		return () => {
			document.removeEventListener("keydown", esc);
			document.body.style.overflow = "";
		};
	}, [onClose, open]);

	if (!open) return null;

	const widths: Record<ModalSize, string> = {
		sm: "max-w-md",
		md: "max-w-lg",
		lg: "max-w-2xl",
		xl: "max-w-4xl",
		full: "max-w-[90vw]",
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4'
			onClick={onClose}>
			<div
				ref={ref}
				onClick={e => e.stopPropagation()}
				className={`w-full ${widths[size]} overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl`}>
				{/* sticky header */}
				<div className='sticky top-0 z-10 flex items-center justify-between border-b border-border bg-panel/95 backdrop-blur px-4 py-3'>
					<h3 className='text-lg font-semibold'>{title}</h3>
					<IconButton onClick={onClose}>
						{/* если нет такой иконки — используй <X size={16}/> из lucide-react */}
						<Icon name='close' size={16} />
					</IconButton>
				</div>

				{/* body: только вертикальный скролл */}
				<div
					className={cn(
						"max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden p-4",
						bodyClassName,
					)}>
					<div className='min-w-0'>{children}</div>
				</div>
			</div>
		</div>
	);
}

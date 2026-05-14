export const PageLoadingPlaceholder = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => <div className="flex flex-col gap-3 p-4">{children}</div>;

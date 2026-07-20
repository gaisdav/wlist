import { useTranslation } from 'react-i18next';

export const PageLoadingPlaceholder = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label={t('states.loading')}>
      <span className="sr-only">{t('states.loading')}</span>
      {children}
    </div>
  );
};

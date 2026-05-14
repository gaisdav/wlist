import { getDisplayName } from '@wlist/core/entities/profile';
import { useUserSearch } from '@wlist/core/hooks/social';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';

import { Button } from '../../components/primitives/button';
import { PageLoadingPlaceholder, Skeleton } from '../../components/primitives/skeleton';
import { useQueryErrorToast } from '../../hooks/useQueryErrorToast';
import { useApiClient } from '../../providers/ApiClientProvider';

export const SearchUsersPage = (): React.JSX.Element => {
  const { t } = useTranslation('common');
  const api = useApiClient();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const search = useUserSearch(api, submitted);

  useQueryErrorToast(search.isError && submitted.length >= 2, t('states.error'));

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSubmitted(q.trim());
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-foreground">{t('social.search.title')}</h1>
        <form className="mt-3 flex gap-2" onSubmit={onSubmit}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('social.search.placeholder')}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm">
            {t('social.search.submit')}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">{t('social.search.hint')}</p>
      </header>

      {search.isLoading && submitted.length >= 2 ? (
        <PageLoadingPlaceholder>
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </PageLoadingPlaceholder>
      ) : submitted.length >= 2 && search.isError ? (
        <p className="text-sm text-destructive">{t('states.error')}</p>
      ) : submitted.length >= 2 && !search.data?.length ? (
        <p className="text-sm text-muted">{t('social.search.no_results')}</p>
      ) : submitted.length >= 2 && search.data?.length ? (
        <ul className="flex flex-col gap-2">
          {search.data.map((p) => (
            <li key={p.id}>
              <Link
                to={`/u/${p.id}`}
                className="block rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/10"
              >
                {getDisplayName(p)}
                {p.username ? <span className="ml-2 text-xs text-muted">@{p.username}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

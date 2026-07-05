import { getDisplayName } from '@wlist/core/entities/profile';
import { useProfileById } from '@wlist/core/hooks/social';
import { Link } from 'wouter';

import { useApiClient } from '../../providers/ApiClientProvider';

interface FeedItemAuthorLinkProps {
  userId: string;
}

export const FeedItemAuthorLink = ({ userId }: FeedItemAuthorLinkProps): React.JSX.Element => {
  const api = useApiClient();
  const profile = useProfileById(api, userId);

  const label = profile.data != null ? getDisplayName(profile.data) : '…';

  return (
    <Link
      to={`/u/${userId}`}
      className="min-w-0 truncate py-2 -my-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      {label}
    </Link>
  );
};

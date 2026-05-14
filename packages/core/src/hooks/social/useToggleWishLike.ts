import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@wlist/api';

import { queryKeys } from '../../config/index.js';

export const useToggleWishLike = (api: ApiClient) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { wishId: string; liked: boolean }) => {
      await api.wishLikes.setLiked(input.wishId, input.liked);
    },
    onSuccess: async (_, { wishId }) => {
      await qc.invalidateQueries({ queryKey: queryKeys.wishLikes.state(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.one(wishId) });
      void qc.invalidateQueries({ queryKey: queryKeys.wishes.all() });
    },
  });
};

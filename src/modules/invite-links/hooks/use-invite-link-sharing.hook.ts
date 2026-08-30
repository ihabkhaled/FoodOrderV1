import { useCallback, useState } from 'react';

import type { CreatedInviteLink,CreateInviteLinkInput } from '@/modules/data-access';
import { inviteLinkService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { copyToClipboard, shareText } from '@/platform/browser';

export interface InviteLinkSharingViewModel {
  link: CreatedInviteLink | null;
  creating: boolean;
  sharing: boolean;
  copied: boolean;
  create: () => Promise<void>;
  share: () => Promise<void>;
  clear: () => void;
}

/**
 * Creates a shareable link and hands it to the native share sheet.
 *
 * The same flow serves buckets, friendships, and groups; only the input
 * differs. Falling back to the clipboard matters because the share sheet is
 * unavailable on desktop browsers, where most organizers actually work.
 */
export const useInviteLinkSharing = (
  input: CreateInviteLinkInput,
  shareTitle: string,
): InviteLinkSharingViewModel => {
  const { t, showToast } = useApp();
  const [link, setLink] = useState<CreatedInviteLink | null>(null);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const created = await inviteLinkService.createLink(input);
      setLink(created);
      setCopied(false);
      showToast(t('inviteLinkCreated'), 'success');
    } catch (error_: unknown) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setCreating(false);
    }
  }, [input, showToast, t]);

  const share = useCallback(async () => {
    if (!link) return;
    setSharing(true);
    try {
      const shared = await shareText(shareTitle, link.url);
      if (!shared) {
        await copyToClipboard(link.url);
        setCopied(true);
        showToast(t('copied'), 'success');
      }
    } catch (error_: unknown) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setSharing(false);
    }
  }, [link, shareTitle, showToast, t]);

  const clear = useCallback(() => {
    setLink(null);
    setCopied(false);
  }, []);

  return { link, creating, sharing, copied, create, share, clear };
};

import type { SocialUser } from '@/modules/data-access';
import { Search, UserPlus } from '@/packages/icons';

import { initials } from '../../helpers/initials.helper';
import type { SocialMessageKey } from '../../i18n/social-messages.constants';

interface FriendSearchProps {
  s: (key: SocialMessageKey) => string;
  emailLabel: string;
  loadingLabel: string;
  email: string;
  searching: boolean;
  searched: boolean;
  result: SocialUser | null;
  onEmailChange: (value: string) => void;
  onSearch: () => void;
  onSendRequest: () => void;
}

export function FriendSearch({
  s,
  emailLabel,
  loadingLabel,
  email,
  searching,
  searched,
  result,
  onEmailChange,
  onSearch,
  onSendRequest,
}: FriendSearchProps) {
  return (
    <section className="section-card stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{s('findFriend')}</p>
          <h2>{s('findFriend')}</h2>
        </div>
      </div>
      <div className="row-actions">
        <label className="grow">
          {emailLabel}
          <input
            type="email"
            value={email}
            onChange={(event) => {
              onEmailChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSearch();
            }}
          />
        </label>
        <button
          className="button secondary"
          disabled={searching || !email.trim()}
          onClick={onSearch}
        >
          <Search />
          {searching ? loadingLabel : s('search')}
        </button>
      </div>
      {result ? (
        <article className="list-row">
          <div className="social-person">
            <span className="social-avatar">{initials(result.displayName)}</span>
            <div>
              <strong>{result.displayName}</strong>
              <span className="muted">{result.email}</span>
            </div>
          </div>
          <button className="button" onClick={onSendRequest}>
            <UserPlus />
            {s('sendFriendRequest')}
          </button>
        </article>
      ) : searched ? (
        <p className="muted">{s('noSearchResult')}</p>
      ) : null}
    </section>
  );
}

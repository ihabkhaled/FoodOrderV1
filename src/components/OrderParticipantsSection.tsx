import { Users } from 'lucide-react';

import type { MessageKey } from '@/i18n/messages';
import type { Order } from '@/types/domain';

interface OrderParticipantsSectionProps {
  participants: NonNullable<Order['participants']>;
  itemNames: Map<string, string>;
  translate: (key: MessageKey) => string;
}

export function OrderParticipantsSection({
  participants,
  itemNames,
  translate,
}: OrderParticipantsSectionProps) {
  if (participants.length === 0) return null;

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{translate('participants')}</p>
          <h2>
            <Users size={18} aria-hidden="true" /> {participants.length}
          </h2>
        </div>
      </div>
      <div className="participant-breakdown">
        {participants.map((participant) => (
          <div className="participant-row" key={participant.userId}>
            <strong>{participant.displayName}</strong>
            <span>
              {Object.entries(participant.quantities)
                .map(
                  ([itemId, quantity]) =>
                    `${itemNames.get(itemId) ?? translate('item')} ×${quantity}`,
                )
                .join(' · ')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

interface SettingsMetadataProps {
  rows: { label: string; value: string }[];
}

export function SettingsMetadata({ rows }: SettingsMetadataProps) {
  return (
    <section className="section-card metadata-grid">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </section>
  );
}
